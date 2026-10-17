// CI の実行時間を集計して Markdown を標準出力に書く（Claude は使わない）。
// 使い方: GH_TOKEN=... OWNER=satou-aaaaa REPOS="a b c" node scripts/ci-time.mjs
// 直近7日とその前の7日を比べ、ワークフローごとの回数・中央値・p90・合計分を出す。
// 合計時間が長い上位のワークフローは、最新の成功した実行の「遅いステップ」も出す。
// 時間は実行の開始から終了まで（待ち行列の時間を除く壁時計の時間）。

import { execFileSync } from "node:child_process";

const owner = process.env.OWNER || "satou-aaaaa";
const repos = (process.env.REPOS || "").split(/\s+/).filter(Boolean);
const DAY = 86400e3;
const now = Date.now();

// gh CLI 経由で呼ぶ（Actions では GH_TOKEN を使う）
async function api(path) {
  try {
    return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] }));
  } catch (e) {
    throw new Error(`${(e.stderr || e.message).toString().trim().split("\n")[0]} ${path}`);
  }
}

// 直近14日の完了した実行を集める（最大1000件／リポジトリ）
async function runs(repo) {
  const since = new Date(now - 14 * DAY).toISOString().slice(0, 10);
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const j = await api(`repos/${owner}/${repo}/actions/runs?status=completed&created=>=${since}&per_page=100&page=${page}`);
    out.push(...j.workflow_runs);
    if (j.workflow_runs.length < 100) break;
  }
  return out
    .filter((r) => r.run_started_at && r.updated_at)
    .map((r) => ({
      id: r.id,
      name: r.name,
      path: r.path,
      event: r.event,
      conclusion: r.conclusion,
      start: Date.parse(r.run_started_at),
      sec: Math.max(0, (Date.parse(r.updated_at) - Date.parse(r.run_started_at)) / 1000),
    }));
}

const q = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const fmt = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, "0")}秒` : `${Math.round(sec)}秒`);
const min = (sec) => (sec / 60).toFixed(1);

function stats(list) {
  const secs = list.filter((r) => r.conclusion !== "skipped" && r.conclusion !== "cancelled").map((r) => r.sec);
  return { n: secs.length, p50: q(secs, 0.5), p90: q(secs, 0.9), total: secs.reduce((a, b) => a + b, 0) };
}

const rows = [];
for (const repo of repos) {
  let all;
  try {
    all = await runs(repo);
  } catch (e) {
    rows.push({ repo, error: String(e.message) });
    continue;
  }
  const byWf = new Map();
  for (const r of all) {
    if (!byWf.has(r.path)) byWf.set(r.path, []);
    byWf.get(r.path).push(r);
  }
  for (const [path, list] of byWf) {
    const cur = list.filter((r) => r.start >= now - 7 * DAY);
    const prev = list.filter((r) => r.start < now - 7 * DAY);
    const events = [...new Set(cur.map((r) => r.event))].join(",");
    const lastOk = cur.filter((r) => r.conclusion === "success").sort((a, b) => b.start - a.start)[0];
    rows.push({ repo, name: list[0].name, path, events, cur: stats(cur), prev: stats(prev), lastOk });
  }
}

const ok = rows.filter((r) => !r.error && r.cur.n > 0).sort((a, b) => b.cur.total - a.cur.total);
const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
const sumCur = ok.reduce((a, r) => a + r.cur.total, 0);
const sumPrev = rows.filter((r) => !r.error).reduce((a, r) => a + r.prev.total, 0);

const lines = [];
lines.push(`${day} 時点（自動）。直近7日の CI の実行時間です。合計 **${min(sumCur)} 分**（前の7日 ${min(sumPrev)} 分）。`);
lines.push("時間は実行の開始から終了まで。取り消し・スキップは除く。改善の手順は routines/ci-speedup.md。");
lines.push("");
lines.push("| リポジトリ | ワークフロー | きっかけ | 回数 | 中央値 | p90 | 合計(分) | 前週の中央値 |");
lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |");
for (const r of ok) {
  const file = r.path.replace(/^\.github\/workflows\//, "").replace(/@.*$/, "");
  lines.push(
    `| ${r.repo} | ${r.name}（${file}） | ${r.events} | ${r.cur.n} | ${fmt(r.cur.p50)} | ${fmt(r.cur.p90)} | ${min(r.cur.total)} | ${r.prev.n ? fmt(r.prev.p50) : "—"} |`,
  );
}
for (const r of rows.filter((r) => r.error)) lines.push(`| ${r.repo} | 読めませんでした（${r.error}） | | | | | | |`);

// 合計時間の上位5本: 最新の成功した実行の遅いステップ
lines.push("", "### 遅いステップ（合計時間の上位5本、最新の成功した実行）", "");
for (const r of ok.slice(0, 5)) {
  if (!r.lastOk) continue;
  try {
    const j = await api(`repos/${owner}/${r.repo}/actions/runs/${r.lastOk.id}/jobs?per_page=50`);
    const steps = [];
    for (const job of j.jobs) {
      for (const s of job.steps || []) {
        if (!s.started_at || !s.completed_at) continue;
        steps.push({ job: job.name, step: s.name, sec: (Date.parse(s.completed_at) - Date.parse(s.started_at)) / 1000 });
      }
    }
    steps.sort((a, b) => b.sec - a.sec);
    const top = steps.slice(0, 3).map((s) => `${s.job} › ${s.step} ${fmt(s.sec)}`).join(" / ");
    lines.push(`- **${r.repo} ${r.name}**（[実行](https://github.com/${owner}/${r.repo}/actions/runs/${r.lastOk.id})）: ${top || "ステップ情報なし"}`);
  } catch (e) {
    lines.push(`- **${r.repo} ${r.name}**: 読めませんでした（${e.message}）`);
  }
}

process.stdout.write(lines.join("\n") + "\n");
