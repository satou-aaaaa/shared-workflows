// 全リポジトリの「次にやること」を、急ぐ順に1行ずつ出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/next-actions.mjs            （トークンなしでも動くが、GitHub の回数制限が厳しい）
//         GH_TOKEN=$(gh auth token) node scripts/next-actions.mjs
// 出た行の対応のしかたは routines/without-claude.md の B の分岐表。
// 見るもの: 自動マージ停止の Issue・main の CI 失敗 Issue・CI が赤の PR・3日以上動きの無い PR・needs-decision の Issue、
//           起きた問題の記録（incidents/）の残っている対策と、30日に2件以上あった種類（再発防止。incidents/README.md）。
const OWNER = process.env.OWNER || 'satou-aaaaa';
// weekly-summary.yml・scorecard.yml の REPOS と同じ並び（リポジトリを足したらここにも足す）
const REPOS = (process.env.REPOS || 'sandbox last-tell tenbin dungeon-boardgame naitei-no-michi local-kanban carcassonne-research shared-workflows').split(/\s+/).filter(Boolean);
const STALE_DAYS = 3;
const ACTION_DAYS = 14; // 再発防止の対策がこれより長く残っていたら出す
const REPEAT_DAYS = 30; // この期間に同じ種類が2件以上なら出す
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
    for (const i of fails) {
      // 週1の定期実行は次の回まで成功で閉じないので、日数を出して止まったものを目立たせる（2026-10-22 Law watch が3週落ち続けた件）
      const days = Math.floor((now - Date.parse(i.created_at)) / 86400000);
      if (days >= STALE_DAYS) add(1, `${days}日直されていない CI 失敗（main）[${r}] ${i.title} → 担当に渡っていない。監督が直すスレッドを立てる ${i.html_url}`);
      else add(2, `CI 失敗（main）[${r}] ${i.title} → ログを見て直す ${i.html_url}`);
    }

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

// 再発防止: incidents/ の記録を読む（チェックアウトがあるときだけ。無ければ確かめられなかったと書く）
try {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../incidents/', import.meta.url);
  const byKind = new Map();
  for (const f of readdirSync(dir).sort()) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-.+\.md$/);
    if (!m) continue;
    const text = readFileSync(new URL(f, dir), 'utf8');
    const url = `https://github.com/${OWNER}/shared-workflows/blob/main/incidents/${f}`;
    const age = Math.floor((now - Date.parse(m[1])) / 86400000);
    const kind = text.match(/^- 種類: (.+)$/m)?.[1]?.trim() || '（種類なし）';
    if (age <= REPEAT_DAYS) byKind.set(kind, [...(byKind.get(kind) || []), f]);
    for (const line of text.split('\n')) {
      if (!line.startsWith('- [ ] ')) continue;
      const due = line.match(/期限: (\d{4}-\d{2}-\d{2})/)?.[1];
      const overdue = due && Date.parse(due) + 86400000 <= now;
      if (overdue || age >= ACTION_DAYS) add(4, `再発防止の対策が残っている${overdue ? `（期限 ${due} を過ぎた）` : `（${age}日）`}: ${line.slice(6, 80)} → 担当が入れるか、入れない理由を記録に書く ${url}`);
    }
  }
  for (const [kind, files] of byKind) {
    if (files.length >= 2) add(4, `同じ種類の問題が${REPEAT_DAYS}日で${files.length}件（${kind}）→ 一つ一つの対策が効いていない。土曜の見直し（routines/routine-review.md の D）で根本の仕組みを直す ${files.join('・')}`);
  }
} catch (e) { skipped.push(`incidents/（${e.message}）`); }

items.sort((a, b) => a.rank - b.rank);
if (!items.length) console.log('何もありません');
items.forEach((it, n) => console.log(`${n + 1}. ${it.text}`));
if (skipped.length) {
  console.log(`\n確かめられなかったもの（「何もない」とは言えない）: ${skipped.join('、')}`);
  process.exitCode = 1;
}
