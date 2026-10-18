// エージェントが出した PR の質を数えて Markdown を標準出力に書く（Claude は使わない）。成績表（scorecard.yml）から呼ぶ。
// 使い方: GH_TOKEN=... OWNER=satou-aaaaa REPOS="a b c" [DAYS=7] [FLAKY_OUT=flaky.json] node scripts/pr-quality.mjs
//
// 数えるもの（直近 DAYS 日にマージされた PR。Dependabot は除く）
// - 最初の CI で赤: PR で最初に終わった実行が、どれかのワークフローで失敗していた PR の割合（やり直しの多さ）
// - 赤の回数: PR の実行のうち失敗した数（再実行・直しの push を含む）
// - 何度も落ちる検査: 同じ検査（失敗の注記の題、無ければジョブ名）が 3つ以上の別々の PR で落ちたもの。
//   PR の中身と関係なく落ちる「不安定な検査」の候補（Google Testing Blog「Flaky Tests at Google and How We Mitigate Them」）。
//   ここは閉じた PR も含めて数える（検査だけの PR でも落ちるため）。
// FLAKY_OUT を渡すと、リポジトリごとの候補を JSON で書く（成績表が Issue「不安定な検査: <repo>」の開け閉めに使う）。

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const owner = process.env.OWNER || "satou-aaaaa";
const repos = (process.env.REPOS || "").split(/\s+/).filter(Boolean);
const days = Number(process.env.DAYS || 7);
const MIN_PRS = 3;
const since = Date.now() - days * 86400e3;

function api(path) {
  try {
    return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] }));
  } catch (e) {
    throw new Error(`${(e.stderr || e.message).toString().trim().split("\n")[0]} ${path}`);
  }
}

// 失敗の理由として意味のない注記（終了コードだけ・まとめの1行）は数えない
const NOISE = /^(Process completed with exit code|不合格 ok )/;
const JOB_ONLY = "（ジョブ名だけ。理由はログで確かめる）";

function prRuns(repo, pr) {
  const j = api(`repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(pr.head.ref)}&per_page=100`);
  return j.workflow_runs
    .filter((r) => ["pull_request", "pull_request_target"].includes(r.event) && r.status === "completed")
    .filter((r) => r.conclusion !== "cancelled" && r.conclusion !== "skipped")
    // 同じブランチ名を前の PR でも使っていることがある（エージェントはブランチを使い回す）。
    // この PR が開く前と閉じた後の実行は、この PR のものではないので数えない
    .filter((r) => Date.parse(r.created_at) >= Date.parse(pr.created_at))
    .filter((r) => !pr.closed_at || Date.parse(r.created_at) <= Date.parse(pr.closed_at))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

function failedChecks(repo, run) {
  const keys = new Set();
  const jobs = api(`repos/${owner}/${repo}/actions/runs/${run.id}/jobs?per_page=100`).jobs;
  for (const job of jobs.filter((x) => x.conclusion === "failure")) {
    let anns = [];
    try {
      anns = api(`repos/${owner}/${repo}/check-runs/${job.id}/annotations?per_page=100`);
    } catch {
      anns = [];
    }
    const titles = anns
      .filter((a) => a.annotation_level === "failure" && !NOISE.test(a.message || ""))
      .map((a) => (a.title || a.message || "").split("\n")[0].slice(0, 80))
      .filter(Boolean);
    // 注記が無いときはジョブ名で数える（理由まではわからないので Issue にはしない）
    if (titles.length) titles.forEach((t) => keys.add(`${run.name} / ${t}`));
    else keys.add(`${run.name} / ${job.name}${JOB_ONLY}`);
  }
  return keys;
}

const rows = [];
const flaky = {};
for (const repo of repos) {
  let prs;
  try {
    prs = api(`repos/${owner}/${repo}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`);
  } catch (e) {
    rows.push({ repo, error: e.message });
    continue;
  }
  prs = prs.filter((p) => Date.parse(p.closed_at) >= since && p.user.login !== "dependabot[bot]");
  const byCheck = new Map(); // 検査 → PR 番号の集合
  let merged = 0, firstRed = 0, redRuns = 0;
  for (const pr of prs) {
    let runs;
    try {
      runs = prRuns(repo, pr);
    } catch {
      continue;
    }
    if (pr.merged_at) {
      merged++;
      // ワークフローごとの最初の実行のどれかが失敗なら「最初の CI で赤」
      const first = new Map();
      for (const r of runs) if (!first.has(r.name)) first.set(r.name, r);
      if ([...first.values()].some((r) => r.conclusion === "failure")) firstRed++;
      redRuns += runs.filter((r) => r.conclusion === "failure").length;
    }
    for (const r of runs.filter((x) => x.conclusion === "failure" && Date.parse(x.created_at) >= since)) {
      for (const k of failedChecks(repo, r)) {
        if (!byCheck.has(k)) byCheck.set(k, new Set());
        byCheck.get(k).add(pr.number);
      }
    }
  }
  const cand = [...byCheck.entries()]
    .filter(([, s]) => s.size >= MIN_PRS)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([check, s]) => ({ check, prs: [...s].sort((a, b) => a - b) }));
  const named = cand.filter((c) => !c.check.endsWith(JOB_ONLY));
  if (named.length) flaky[repo] = named;
  rows.push({ repo, merged, firstRed, redRuns, cand });
}

const out = [];
out.push("## PR の質（最初の CI で通ったか）", "");
out.push(`直近${days}日にマージされた PR（Dependabot を除く）。「最初の CI で赤」が多いほど、push の前の確かめが足りないか、検査が不安定です。`, "");
out.push("| リポジトリ | マージ | 最初の CI で赤 | 割合 | 赤の回数（再実行を含む） |", "| --- | ---: | ---: | ---: | ---: |");
for (const r of rows) {
  if (r.error) {
    out.push(`| ${r.repo} | 読めず | — | — | — |`);
    continue;
  }
  const rate = r.merged ? `${Math.round((r.firstRed * 100) / r.merged)}%` : "—";
  out.push(`| ${r.repo} | ${r.merged} | ${r.firstRed} | ${rate} | ${r.redRuns} |`);
}
out.push("", `## 何度も落ちる検査（${MIN_PRS}つ以上の別々の PR で落ちたもの）`, "");
const any = rows.filter((r) => r.cand && r.cand.length);
if (!any.length) out.push("ありません。");
for (const r of any) {
  for (const c of r.cand.slice(0, 5)) {
    const links = c.prs.map((n) => `[#${n}](https://github.com/${owner}/${r.repo}/pull/${n})`).join(" ");
    out.push(`- **${r.repo}**: ${c.check}（${c.prs.length} PR: ${links}）`);
  }
}
out.push("");
console.log(out.join("\n"));
if (process.env.FLAKY_OUT) writeFileSync(process.env.FLAKY_OUT, JSON.stringify(flaky, null, 2));
