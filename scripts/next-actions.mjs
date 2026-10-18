// 全リポジトリの「次にやること」を、急ぐ順に1行ずつ出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/next-actions.mjs            （トークンなしでも動くが、GitHub の回数制限が厳しい）
//         GH_TOKEN=$(gh auth token) node scripts/next-actions.mjs
// 出た行の対応のしかたは routines/without-claude.md の B の分岐表。
// 見るもの: 自動マージ停止の Issue・main の CI 失敗 Issue・CI が赤の PR・3日以上動きの無い PR・needs-decision の Issue。
const OWNER = process.env.OWNER || 'satou-aaaaa';
// weekly-summary.yml・scorecard.yml の REPOS と同じ並び（リポジトリを足したらここにも足す）
const REPOS = (process.env.REPOS || 'sandbox last-tell tenbin dungeon-boardgame naitei-no-michi carcassonne-research shared-workflows').split(/\s+/).filter(Boolean);
const STALE_DAYS = 3;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

async function api(path) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const items = []; // { rank, text }
const add = (rank, text) => items.push({ rank, text });
const skipped = [];
const now = Date.now();

try {
  const stop = await api(`repos/${OWNER}/shared-workflows/issues?state=open&labels=${encodeURIComponent('自動マージ停止')}&per_page=20`);
  for (const i of stop) add(1, `自動マージ停止: ${i.title} → そのリポジトリは直す PR だけマージする ${i.html_url}`);
} catch (e) { skipped.push(`shared-workflows の自動マージ停止（${e.message}）`); }

for (const r of REPOS) {
  try {
    const fails = await api(`repos/${OWNER}/${r}/issues?state=open&labels=ci-failure&per_page=20`);
    for (const i of fails) add(2, `CI 失敗（main）[${r}] ${i.title} → ログを見て直す ${i.html_url}`);

    const decisions = await api(`repos/${OWNER}/${r}/issues?state=open&labels=needs-decision&per_page=20`);
    for (const i of decisions) if (!i.pull_request) add(5, `needs-decision [${r}] ${i.title} → 読んで選ぶ ${i.html_url}`);

    const prs = await api(`repos/${OWNER}/${r}/pulls?state=open&per_page=50`);
    for (const p of prs) {
      const runs = await api(`repos/${OWNER}/${r}/commits/${p.head.sha}/check-runs?per_page=100`);
      const red = runs.check_runs.filter((c) => ['failure', 'timed_out', 'cancelled'].includes(c.conclusion)).map((c) => c.name);
      const days = Math.floor((now - Date.parse(p.updated_at)) / 86400000);
      const draft = p.draft ? '（下書き）' : '';
      if (red.length) add(3, `PR の CI が赤 [${r}] #${p.number} ${p.title}${draft}（${[...new Set(red)].join('・')}）→ 直すか下書きに戻す ${p.html_url}`);
      else if (days >= STALE_DAYS) add(4, `${days}日動きの無い PR [${r}] #${p.number} ${p.title}${draft} → CI が緑ならマージ、要らなければ閉じる ${p.html_url}`);
    }
  } catch (e) { skipped.push(`${r}（${e.message}）`); }
}

items.sort((a, b) => a.rank - b.rank);
if (!items.length) console.log('何もありません');
items.forEach((it, n) => console.log(`${n + 1}. ${it.text}`));
if (skipped.length) {
  console.log(`\n確かめられなかったもの（「何もない」とは言えない）: ${skipped.join('、')}`);
  process.exitCode = 1;
}
