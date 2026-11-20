// 古くなる情報の台帳（freshness.md）を読み、見直しが要るゲームを出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方（リポジトリの一番上で）:
//   node scripts/freshness.mjs --lint       台帳の形・抜け・並びを調べる（ネットを使わない。Lint・check.sh）
//   node scripts/freshness.mjs --self-test  見分け方そのものの検査（ネットを使わない。Lint・check.sh）
//   node scripts/freshness.mjs              見直しが要る行を Markdown で出す（e-Gov 法令API v2 を読む。freshness.yml が Issue にする）
//     環境変数 TODAY=YYYY-MM-DD で今日を替えられる（試すとき）
// 見直しが要る行:
//   1. 「次に見る日」が今日から DUE_DAYS 日以内
//   2. 「法令」の法令に、確認した日より後に公布された改正か、確認した日より後〜今日までに施行された改正がある
//      （確認した日に、その日までに公布された改正は施行予定のものも含めて見た、という約束。先の施行は見直すときに「次に見る日」で受ける）
// 考え方: routines/freshness.md と freshness.md の「考え方」（GOV.UK の見直し日、e-Gov 法令API v2 の改正履歴）
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRepos } from './repos.mjs';

export const DUE_DAYS = 14;
// 法令を読む時間の上限（秒）。超えたら残りを「読めなかった」にして本文は必ず出す（freshness.yml の timeout-minutes より短く）
const BUDGET_SEC = Number(process.env.BUDGET_SEC || 480);
const HEADER = '| リポジトリ | 古くなる情報 | 見直しの時期 | 法令 | 確認した日 | 次に見る日 |';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LAW = /^[0-9]{3}[0-9A-Z]{12}$/;
const API = 'https://laws.e-gov.go.jp/api/2/law_revisions/';

const addDays = (d, n) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const validDate = (d) => DATE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

// 表を読む。形の問題は problems に入れる（全部まとめて出せるように）
export function parse(text) {
  const problems = [];
  const begin = text.indexOf('<!-- freshness:begin -->');
  const end = text.indexOf('<!-- freshness:end -->');
  if (begin < 0 || end < begin) return { rows: [], problems: ['freshness.md に <!-- freshness:begin --> と <!-- freshness:end --> が無い'] };
  const lines = text.slice(begin, end).split('\n').slice(1).filter((l) => l.trim());
  if (lines[0] !== HEADER) problems.push(`表の見出しは「${HEADER}」にする`);
  const rows = [];
  for (const line of lines.slice(2)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) { problems.push(`列が6つでない行: ${line.slice(0, 60)}`); continue; }
    const [repo, info, when, laws, checked, next] = cells;
    rows.push({ repo, info, when, laws: laws === '—' ? [] : laws.split(/\s+/), checked, next: next === '—' ? null : next, lawsCell: laws });
  }
  return { rows, problems };
}

// 台帳の形・抜け・並び。games は repos.txt の game の名前、known は repos.txt の全部の名前
export function lint(text, games, known) {
  const { rows, problems } = parse(text);
  const seen = new Set();
  let prev = '';
  for (const r of rows) {
    const at = `freshness.md の ${r.repo}`;
    if (seen.has(r.repo)) problems.push(`${at} が2行ある`);
    seen.add(r.repo);
    if (prev && prev > r.repo) problems.push(`${at} は ${prev} より前に入れる（名前の ABC 順）`);
    prev = r.repo;
    if (!known.has(r.repo)) problems.push(`${at} が repos.txt に無い（消したゲームなら行も消す）`);
    if (!r.info) problems.push(`${at}: 古くなる情報が空`);
    if (!validDate(r.checked)) problems.push(`${at}: 確認した日 ${r.checked} は YYYY-MM-DD の日付にする`);
    for (const id of r.laws) if (!LAW.test(id)) problems.push(`${at}: 法令ID ${id} の形がちがう（laws.e-gov.go.jp/law/<法令ID> の15字）`);
    if (r.info.startsWith('なし')) {
      if (r.next !== null) problems.push(`${at}: 古くならない（なし）なら次に見る日は —`);
      if (r.laws.length) problems.push(`${at}: 古くならない（なし）なら法令は —（法令があれば古くなる情報を書く）`);
      continue;
    }
    if (!r.when || r.when === '—') problems.push(`${at}: 見直しの時期を書く`);
    if (r.next === null || !validDate(r.next)) { problems.push(`${at}: 次に見る日 ${r.next ?? '—'} を YYYY-MM-DD で書く（古くならないなら古くなる情報を「なし（理由）」に）`); continue; }
    if (validDate(r.checked) && (r.next <= r.checked || r.next > addDays(r.checked, 731))) problems.push(`${at}: 次に見る日は確認した日の後、2年以内にする`);
  }
  for (const g of games) if (!seen.has(g)) problems.push(`freshness.md に ${g} の行が無い（新作は名前の順の位置に1行足す。古くならないなら「なし（理由）」。routines/freshness.md）`);
  return { rows, problems };
}

// 1つの法令の改正履歴から、その行で見直しが要る改正を選ぶ
export function pickRevisions(revisions, checked, today) {
  const out = [];
  const ids = new Set();
  for (const v of revisions) {
    if (!v.amendment_law_id || ids.has(v.law_revision_id)) continue;
    const promulgated = v.amendment_promulgate_date || '';
    const enforced = v.amendment_enforcement_date || v.amendment_scheduled_enforcement_date || '';
    const newLaw = promulgated > checked;
    const enforcing = enforced > checked && enforced <= today;
    if (!newLaw && !enforcing) continue;
    ids.add(v.law_revision_id);
    out.push({ title: v.law_title, amend: v.amendment_law_title || v.amendment_law_num || '（名前なし）', promulgated, enforced: enforced || '未定', why: newLaw ? '確認した日より後に公布' : '確認した日より後に施行' });
  }
  return out.sort((a, b) => (a.enforced < b.enforced ? -1 : 1));
}

async function fetchRevisions(id, deadline = Infinity) {
  for (let i = 0; i < 3; i++) {
    const left = deadline - Date.now();
    if (left < 1000) return { error: '時間切れで読まなかった' };
    try {
      const res = await fetch(API + id, { signal: AbortSignal.timeout(Math.min(30000, left)), headers: { accept: 'application/json' } });
      if (res.status === 404) return { error: '法令ID が見つからない（e-Gov）' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { revisions: json.revisions || [] };
    } catch (e) {
      if (i === 2) return { error: String(e.message || e) };
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

export async function report(rows, today, get = fetchRevisions) {
  const due = rows.filter((r) => r.next && r.next <= addDays(today, DUE_DAYS));
  const lawIds = [...new Set(rows.flatMap((r) => r.laws))];
  const cache = new Map();
  const deadline = Date.now() + BUDGET_SEC * 1000;
  for (const id of lawIds) {
    if (Date.now() > deadline) { cache.set(id, { error: '時間切れで読まなかった' }); continue; }
    cache.set(id, await get(id, deadline));
    await new Promise((r) => setTimeout(r, 200)); // e-Gov に負担をかけない
  }
  const changed = [];
  for (const r of rows) {
    const hits = r.laws.flatMap((id) => (cache.get(id).revisions ? pickRevisions(cache.get(id).revisions, r.checked, today) : []));
    if (hits.length) changed.push({ r, hits });
  }
  const failed = lawIds.filter((id) => cache.get(id).error).map((id) => `${id}（${cache.get(id).error}）`);
  const lines = [`<!-- count: ${due.length + changed.length} -->`, `<!-- failed: ${failed.length} -->`];
  lines.push(`${today} の見直し（自動。台帳は freshness.md、直し方は routines/freshness.md）。見直しの日が来た ${due.length} 本・法令が変わった ${changed.length} 本。`, '');
  if (due.length) {
    lines.push('## 見直しの日が来た', '', '| リポジトリ | 古くなる情報 | 次に見る日 |', '| --- | --- | --- |');
    for (const r of due) lines.push(`| ${r.repo} | ${r.info} | ${r.next} |`);
    lines.push('');
  }
  if (changed.length) {
    lines.push('## 法令が変わった（確認した日より後）', '');
    for (const { r, hits } of changed) {
      lines.push(`### ${r.repo}（確認した日 ${r.checked}）`, `古くなる情報: ${r.info}`, '');
      for (const h of hits.slice(0, 8)) lines.push(`- ${h.title}：${h.amend}（公布 ${h.promulgated}・施行 ${h.enforced}。${h.why}）`);
      if (hits.length > 8) lines.push(`- ほか ${hits.length - 8} 件`);
      lines.push('');
    }
  }
  if (failed.length) lines.push('## 読めなかった法令（次の週にもう一度読む）', '', ...failed.map((f) => `- ${f}`), '');
  if (!due.length && !changed.length) lines.push('今週、見直しが要るゲームはありません。');
  return { text: lines.join('\n'), count: due.length + changed.length, failed: failed.length };
}

async function selfTest() {
  const errors = [];
  const t = (cond, what) => { if (!cond) errors.push(what); };
  const table = (rows) => `<!-- freshness:begin -->\n${HEADER}\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n<!-- freshness:end -->`;
  const ok = table(['| a-game | 税の金額 | 毎年4月 | 340AC0000000033 | 2026-11-01 | 2027-04-10 |', '| b-game | なし（理科） | — | — | 2026-11-01 | — |']);
  t(lint(ok, ['a-game', 'b-game'], new Set(['a-game', 'b-game'])).problems.length === 0, '正しい表を通す');
  t(lint(ok, ['a-game', 'b-game', 'c-game'], new Set(['a-game', 'b-game', 'c-game'])).problems.some((p) => p.includes('c-game の行が無い')), '抜けた新作を見つける');
  const bad = table(['| b-game | なし（理科） | — | — | 2026-11-01 | 2027-01-01 |', '| a-game | 税 | 毎年4月 | 340AC | 2026-11-01 | 2029-01-01 |']);
  const p = lint(bad, ['a-game', 'b-game'], new Set(['a-game', 'b-game'])).problems.join('\n');
  t(p.includes('ABC 順'), '並びのまちがいを見つける');
  t(p.includes('次に見る日は —'), '古くならない行の日付を見つける');
  t(p.includes('法令ID 340AC'), '法令ID の形を見つける');
  t(p.includes('2年以内'), '2年より先の日を見つける');
  const revs = [
    { law_revision_id: '1', law_title: '所得税法', amendment_law_id: 'x', amendment_law_title: '新しい改正', amendment_promulgate_date: '2027-03-31', amendment_enforcement_date: '2028-01-01' },
    { law_revision_id: '2', law_title: '所得税法', amendment_law_id: 'y', amendment_law_title: '前から決まっていた改正', amendment_promulgate_date: '2025-03-31', amendment_enforcement_date: null, amendment_scheduled_enforcement_date: '2027-01-01' },
    { law_revision_id: '6', law_title: '所得税法', amendment_law_id: 'v', amendment_law_title: 'もうすぐの施行', amendment_promulgate_date: '2025-03-31', amendment_enforcement_date: '2027-05-01' },
    { law_revision_id: '3', law_title: '所得税法', amendment_law_id: 'z', amendment_law_title: '古い改正', amendment_promulgate_date: '2024-03-31', amendment_enforcement_date: '2025-01-01' },
    { law_revision_id: '4', law_title: '所得税法', amendment_law_id: 'w', amendment_law_title: 'ずっと先の施行', amendment_promulgate_date: '2025-03-31', amendment_enforcement_date: '2030-01-01' },
    { law_revision_id: '5', law_title: '所得税法', amendment_law_id: null, amendment_promulgate_date: null, amendment_enforcement_date: null },
  ];
  const got = pickRevisions(revs, '2026-11-01', '2027-04-05').map((h) => h.amend);
  t(got.includes('新しい改正'), '確認した日より後の公布を出す');
  t(got.includes('前から決まっていた改正'), '確認した日のあとに施行された改正を出す');
  t(!got.includes('古い改正') && !got.includes('ずっと先の施行') && !got.includes('もうすぐの施行') && got.length === 2, '関係ない改正・まだ施行されていない前からの改正・最初の制定を出さない');
  const rows = parse(ok).rows;
  const r1 = await report(rows, '2026-11-20', async () => ({ error: 'HTTP 500' }));
  t(r1.count === 0 && r1.failed === 1 && r1.text.split('\n')[1] === '<!-- failed: 1 -->', '法令を読めなかった数を2行目に出す（0件で Issue を閉じないため）');
  if (errors.length) {
    console.error(errors.map((e) => `::error::freshness の見分けがこわれている: ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('✓ freshness の見分け（自己検査）');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const arg = process.argv[2];
  if (arg === '--self-test') await selfTest();
  else {
    const text = readFileSync('freshness.md', 'utf8');
    const repos = readRepos();
    const games = repos.filter((r) => r.kind === 'game').map((r) => r.name);
    const { rows, problems } = lint(text, games, new Set(repos.map((r) => r.name)));
    if (problems.length) {
      console.error(problems.map((e) => `::error::${e}`).join('\n'));
      console.error('直し方: freshness.md の「書き方」');
      process.exit(1);
    }
    if (arg === '--lint') console.log(`✓ 古くなる情報の台帳（${rows.length} 本・見張る ${rows.filter((r) => r.next).length} 本）`);
    else {
      const today = process.env.TODAY || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      const { text: body } = await report(rows, today);
      console.log(body);
    }
  }
}
