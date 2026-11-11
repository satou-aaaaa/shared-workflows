// エージェントが出した PR の質を数えて Markdown を標準出力に書く（Claude は使わない）。成績表（scorecard.yml）から呼ぶ。
// 使い方: GH_TOKEN=... OWNER=satou-aaaaa REPOS="a b c" [DAYS=7] [FLAKY_OUT=flaky.json] [SCORE_OUT=score.json] node scripts/pr-quality.mjs
//
// 数えるもの（直近 DAYS 日にマージされた PR。Dependabot は除く）
// - 最初の CI で赤: PR で最初に終わった実行が、どれかのワークフローで失敗していた PR の割合（やり直しの多さ）
// - 赤の回数: PR の実行のうち失敗した数（再実行・直しの push を含む）
// - 何度も落ちる検査: 同じ検査（失敗の注記の題、無ければジョブ名）が 3つ以上の別々の PR で落ちたもの。
//   PR の中身と関係なく落ちる「不安定な検査」の候補（Google Testing Blog「Flaky Tests at Google and How We Mitigate Them」）。
//   ここは閉じた PR も含めて数える（検査だけの PR でも落ちるため）。
// - PR の大きさ: 変更行（足した行＋消した行。lockfile・sw.js・changes.html・docs/ の作り直しページなど生成物は除く）の中央値と、
//   LARGE 行を超えた PR の「最初の CI で赤」の割合。大きい変更ほど危ない（DORA 2024・Google「Small CLs」）ので、分けるべきかの目安にする。
// FLAKY_OUT を渡すと、リポジトリごとの候補を JSON で書く（成績表が Issue「不安定な検査: <repo>」の開け閉めに使う）。

// SCORE_OUT を渡すと、成績表の上の表（マージ・差し戻し・CI失敗・直るまで）の数もリポジトリごとに JSON で書く。
//   成績表のシェルがリポジトリごとに gh で読み直していたのをやめ、ここで1回読んだ PR の一覧を使い回す。
// 読む回数の目安（2026-11-09、1週間のマージが1,064件で時間切れ。incidents/2026-11-09-weekly-jobs-timeout.md）:
//   リポジトリごとに PR の一覧・実行の一覧（PR ごとでなく1回）・ci-failure の Issue を読み、
//   変更行は GraphQL 1回で新しい50件、落ちた検査は新しい FAIL_MAX 回の失敗だけを読む。4本ずつ並べて読む。
import { writeFileSync } from "node:fs";
import { makeApi, pool, nextLink, reportUsage, OverBudget } from "./gh-api.mjs";

const owner = process.env.OWNER || "satou-aaaaa";
const repos = (process.env.REPOS || "").split(/\s+/).filter(Boolean);
const days = Number(process.env.DAYS || 7);
const MIN_PRS = 3;
const LARGE = Number(process.env.LARGE || 400);
const FAIL_MAX = Number(process.env.FAIL_MAX || 5);
// 外の都合で落ちやすい定期の検査。CI失敗に数えない（scorecard.yml の EXTERNAL と同じ）
const EXTERNAL = new RegExp(process.env.EXTERNAL || "Site watch|Lighthouse|Link check|Law watch");
// 生成物（手で書かない・作り直しのコマンドで作るもの）。大きさに数えない
const GENERATED = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|sw\.js|changes\.html)$|^docs\/(?!index\.html$)[^/]+\.html$|\.min\.(js|css)$/;
const since = Date.now() - days * 86400e3;
const api = makeApi();

// 一覧をページの終わりまで（または stop が true を返すまで）読む
async function pages(path, pick, stop = () => false, max = 10) {
  const all = [];
  let url = path;
  for (let n = 0; url && n < max; n++) {
    const { body, headers } = await api(url, { full: true });
    const list = pick(body);
    all.push(...list);
    if (!list.length || stop(list)) break;
    url = nextLink(headers);
  }
  return all;
}

// 失敗の理由として意味のない注記（終了コードだけ・まとめの1行）は数えない
const NOISE = /^(Process completed with exit code|不合格 ok )/;
const JOB_ONLY = "（ジョブ名だけ。理由はログで確かめる）";
// 人の承認を待つあいだ赤のままにする検査。PR の質や不安定さとは関係ないので数えない
const WAITS_FOR_PERSON = new Set(["Permission guard"]);

// リポジトリの PR の実行を1回でまとめて読み、ブランチごとに分ける（前は PR ごとに読んでいた）
async function runsByBranch(repo, prs) {
  if (!prs.length) return new Map();
  const from = new Date(Math.min(...prs.map((p) => Date.parse(p.created_at)))).toISOString().slice(0, 10);
  const runs = await pages(`repos/${owner}/${repo}/actions/runs?created=%3E%3D${from}&exclude_pull_requests=true&per_page=100`, (j) => j.workflow_runs || []);
  const map = new Map();
  for (const r of runs) {
    if (!["pull_request", "pull_request_target"].includes(r.event) || r.status !== "completed") continue;
    if (r.conclusion === "cancelled" || r.conclusion === "skipped" || WAITS_FOR_PERSON.has(r.name)) continue;
    if (!map.has(r.head_branch)) map.set(r.head_branch, []);
    map.get(r.head_branch).push(r);
  }
  return map;
}

function prRuns(byBranch, pr) {
  return (byBranch.get(pr.head.ref) || [])
    // 同じブランチ名を前の PR でも使っていることがある（エージェントはブランチを使い回す）。
    // この PR が開く前と閉じた後の実行は、この PR のものではないので数えない
    .filter((r) => Date.parse(r.created_at) >= Date.parse(pr.created_at))
    .filter((r) => !pr.closed_at || Date.parse(r.created_at) <= Date.parse(pr.closed_at))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

async function failedChecks(repo, run) {
  const keys = new Set();
  const jobs = (await api(`repos/${owner}/${repo}/actions/runs/${run.id}/jobs?per_page=100`)).jobs;
  for (const job of jobs.filter((x) => x.conclusion === "failure")) {
    let anns = [];
    try {
      anns = await api(`repos/${owner}/${repo}/check-runs/${job.id}/annotations?per_page=100`);
    } catch (e) {
      if (e instanceof OverBudget) throw e;
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

// マージした PR の変更行（生成物を除く）を、GraphQL 1回でまとめて読む（PR ごとに files を読むと、多い週は数百回になる）。
// 新しい50件・1件100ファイルまで。読めなければ空（変更行の列が — になる）
async function prSizes(repo) {
  const query = `query($o: String!, $r: String!) { repository(owner: $o, name: $r) { pullRequests(states: MERGED, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
    nodes { number files(first: 100) { nodes { path additions deletions } } } } } }`;
  const map = new Map();
  try {
    const j = await api("graphql", { graphql: { query, variables: { o: owner, r: repo } } });
    for (const pr of j.data?.repository?.pullRequests?.nodes || []) {
      map.set(pr.number, (pr.files?.nodes || []).filter((f) => !GENERATED.test(f.path)).reduce((t, f) => t + (f.additions || 0) + (f.deletions || 0), 0));
    }
  } catch (e) {
    if (e instanceof OverBudget) throw e;
  }
  return map;
}

// 数の並びの中央値（空なら null）
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

// 成績表の上の表の数（マージ・差し戻し・CI失敗・直るまで）
async function score(repo, all) {
  const merged = all.filter((p) => p.merged_at && Date.parse(p.merged_at) >= since);
  const issues = await api(`repos/${owner}/${repo}/issues?labels=ci-failure&state=all&since=${new Date(since).toISOString()}&per_page=100`);
  const mine = issues.filter((i) => !i.pull_request && !EXTERNAL.test(i.title));
  const fixed = mine.filter((i) => i.closed_at && Date.parse(i.closed_at) >= since).map((i) => (Date.parse(i.closed_at) - Date.parse(i.created_at)) / 3600e3);
  return {
    merged: merged.filter((p) => p.user.login !== "dependabot[bot]").length,
    reverts: merged.filter((p) => p.title.startsWith("差し戻し")).length,
    fails: mine.filter((i) => Date.parse(i.created_at) >= since).length,
    mttr: fixed.length ? `${Math.round((fixed.reduce((a, b) => a + b, 0) / fixed.length) * 10) / 10} 時間` : "—",
  };
}

async function one(repo) {
  // 閉じた PR を新しく動いた順に読み、期間より前まで来たらやめる（前は1ページ100件だけで、多い週は取りこぼしていた）
  const all = await pages(`repos/${owner}/${repo}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`, (j) => j, (l) => Date.parse(l[l.length - 1].updated_at) < since);
  const sc = await score(repo, all);
  const prs = all.filter((p) => p.closed_at && Date.parse(p.closed_at) >= since && p.user.login !== "dependabot[bot]");
  const byBranch = await runsByBranch(repo, prs);
  const byCheck = new Map(); // 検査 → PR 番号の集合
  let merged = 0, firstRed = 0, redRuns = 0, large = 0, largeRed = 0;
  const sizes = [];
  const fails = []; // [run, pr]
  const newest = [...prs].sort((a, b) => Date.parse(b.closed_at) - Date.parse(a.closed_at));
  const sizeOf = prs.some((p) => p.merged_at) ? await prSizes(repo) : new Map();
  for (const pr of newest) {
    const runs = prRuns(byBranch, pr);
    if (pr.merged_at) {
      merged++;
      // ワークフローごとの最初の実行のどれかが失敗なら「最初の CI で赤」
      const first = new Map();
      for (const r of runs) if (!first.has(r.name)) first.set(r.name, r);
      const red = [...first.values()].some((r) => r.conclusion === "failure");
      if (red) firstRed++;
      const size = sizeOf.get(pr.number);
      if (size !== undefined) {
        sizes.push(size);
        if (size > LARGE) {
          large++;
          if (red) largeRed++;
        }
      }
      redRuns += runs.filter((r) => r.conclusion === "failure").length;
    }
    for (const r of runs.filter((x) => x.conclusion === "failure" && Date.parse(x.created_at) >= since)) fails.push([r, pr]);
  }
  fails.sort((a, b) => Date.parse(b[0].created_at) - Date.parse(a[0].created_at));
  for (const [r, pr] of fails.slice(0, FAIL_MAX)) {
    for (const k of await failedChecks(repo, r)) {
      if (!byCheck.has(k)) byCheck.set(k, new Set());
      byCheck.get(k).add(pr.number);
    }
  }
  const cand = [...byCheck.entries()]
    .filter(([, s]) => s.size >= MIN_PRS)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([check, s]) => ({ check, prs: [...s].sort((a, b) => a - b) }));
  return { repo, score: sc, merged, firstRed, redRuns, cand, med: median(sizes), large, largeRed, failsRead: Math.min(fails.length, FAIL_MAX), failsAll: fails.length };
}

const rows = await pool(repos, 4, async (repo) => {
  try {
    return await one(repo);
  } catch (e) {
    return { repo, error: e instanceof OverBudget ? `${e.message}ので読まず` : e.message };
  }
});
const flaky = {};
for (const r of rows) {
  const named = (r.cand || []).filter((c) => !c.check.endsWith(JOB_ONLY));
  if (named.length) flaky[r.repo] = named;
}

const out = [];
out.push("## PR の質（最初の CI で通ったか）", "");
out.push(`直近${days}日にマージされた PR（Dependabot を除く）。「最初の CI で赤」が多いほど、push の前の確かめが足りないか、検査が不安定です。`, "");
out.push(`変更行はリポジトリごとに新しい50件まで、落ちた検査は新しい ${FAIL_MAX} 回の失敗までを読んで数える（全部を読むと時間切れになるため）。`, "");
out.push(`変更行は生成物を除いた足した行＋消した行。${LARGE} 行を超える PR が多く、その赤の割合が高ければ、PR を分ける（routines/pr.md「PR は小さく」）。`, "");
out.push(`| リポジトリ | マージ | 最初の CI で赤 | 割合 | 赤の回数（再実行を含む） | 変更行の中央値 | ${LARGE} 行超（うち最初が赤） |`, "| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const r of rows) {
  if (r.error) {
    out.push(`| ${r.repo} | 読めず（${r.error}） | — | — | — | — | — |`);
    continue;
  }
  const rate = r.merged ? `${Math.round((r.firstRed * 100) / r.merged)}%` : "—";
  const med = r.med === null ? "—" : r.med;
  out.push(`| ${r.repo} | ${r.merged} | ${r.firstRed} | ${rate} | ${r.redRuns} | ${med} | ${r.large}（${r.largeRed}） |`);
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
if (process.env.SCORE_OUT) writeFileSync(process.env.SCORE_OUT, JSON.stringify(Object.fromEntries(rows.map((r) => [r.repo, r.error ? { error: r.error } : r.score])), null, 2));
const u = reportUsage("成績表");
if (u.warn) console.log(`\n⏱ ${u.text}。時間切れが近い（予算の ${u.rate}%）`);
