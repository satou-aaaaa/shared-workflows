// 研究を進める毎日の回（routines/research-loop.md）で、今日やる1件を選ぶ（Claude は使わない。GitHub も読まない）。
// 使い方: node scripts/research-next.mjs [リポジトリのフォルダ ...]   （省略時は ../ にある RESEARCH_REPOS）
//         --date YYYY-MM-DD で日付を変えて確かめられる（既定は今日の日本時間）。
//         --skip <リポジトリ>:<R-番号> でその項目を飛ばす（ほかのスレッドの開いた PR が同じ項目を進めているとき。何度でも書ける）。
// 各リポジトリの docs/BACKLOG.md（研究の「次にやること」一覧）を読み、
//   1. 日替わりで最初に見るリポジトリを決め（日本時間の日付の通し番号 ÷ 本数の余り）、
//   2. そのリポジトリに「作業中」があれば続きを、無ければ「次」の中で優先の数が小さく番号の若いもの（待ちが済んでいるもの）を選ぶ。
//   3. することが無いリポジトリは飛ばして次へ。
// 考え方: 進み具合の記録を回の初めに読み、1回に1つずつ進める（Anthropic「Effective harnesses for long-running agents」）。
import { readFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

export const RESEARCH_REPOS = ['carcassonne-research', 'gem-merchant-research', 'isle-routes-research'];
export const STATES = ['次', '作業中', '済み', '保留', 'やめた'];

// BACKLOG.md の本文を項目の配列にする。見出し「## R-123 題」と、その下の「- 名前: 値」の行を読む。
export function parseBacklog(text) {
  const items = [];
  const errors = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(R-\d{3,})\s+(.+?)\s*$/);
    if (h) {
      cur = { id: h[1], title: h[2], fields: {} };
      items.push(cur);
      continue;
    }
    if (/^##\s/.test(line)) { cur = null; continue; }
    const f = cur && line.match(/^-\s*([^:：]+)[:：]\s*(.*)$/);
    if (f && !(f[1].trim() in cur.fields)) cur.fields[f[1].trim()] = f[2].trim();
  }
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) errors.push(`${it.id} が2回ある`);
    seen.add(it.id);
    it.state = it.fields['状態'] ?? '';
    it.priority = Number.parseInt(it.fields['優先'] ?? '9', 10);
    if (Number.isNaN(it.priority)) it.priority = 9;
    it.waits = (it.fields['待ち'] ?? '').match(/R-\d{3,}/g) ?? [];
    if (!STATES.includes(it.state)) errors.push(`${it.id} の状態「${it.state}」は ${STATES.join('・')} のどれでもない`);
    if (!it.fields['完了条件']) errors.push(`${it.id} に「完了条件」が無い`);
    if (it.state === '済み' && !it.fields['結果']) errors.push(`${it.id} は済みなのに「結果」が無い`);
  }
  return { items, errors };
}

// 1つのリポジトリで、今日やる項目（無ければ null）。
export function pickInRepo(items, skip = new Set()) {
  items = items.filter((i) => !skip.has(i.id) || i.state === '済み');
  const working = items.filter((i) => i.state === '作業中');
  if (working.length) return { item: working[0], mode: '続ける' };
  const done = new Set(items.filter((i) => i.state === '済み').map((i) => i.id));
  const ready = items
    .filter((i) => i.state === '次' && i.waits.every((w) => done.has(w)))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return ready.length ? { item: ready[0], mode: '始める' } : null;
}

// 日本時間の日付の通し番号（1970-01-01 を 0 とする）。
export function dayNumber(date) {
  const jst = new Date(date.getTime() + 9 * 3600e3);
  return Math.floor(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) / 864e5);
}

// repos: [{ name, items }]。日替わりの順に見て、最初にすることがあるリポジトリの1件。skip は「リポジトリ:R-番号」の集合。
export function plan(repos, date, skip = new Set()) {
  const start = repos.length ? dayNumber(date) % repos.length : 0;
  for (let k = 0; k < repos.length; k++) {
    const r = repos[(start + k) % repos.length];
    const mine = new Set([...skip].filter((s) => s.startsWith(`${r.name}:`)).map((s) => s.slice(r.name.length + 1)));
    const p = pickInRepo(r.items, mine);
    if (p) return { repo: r.name, ...p, order: repos.map((_, j) => repos[(start + j) % repos.length].name) };
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  let date = new Date();
  const di = args.indexOf('--date');
  if (di >= 0) {
    date = new Date(`${args[di + 1]}T12:00:00+09:00`);
    args.splice(di, 2);
  }
  const skip = new Set();
  for (let si = args.indexOf('--skip'); si >= 0; si = args.indexOf('--skip')) {
    skip.add(args[si + 1]);
    args.splice(si, 2);
  }
  const dirs = args.length ? args : RESEARCH_REPOS.map((n) => join('..', n));
  const repos = [];
  let bad = 0;
  for (const d of dirs) {
    const name = basename(resolve(d));
    const p = join(d, 'docs', 'BACKLOG.md');
    if (!existsSync(p)) {
      console.log(`読めない: ${name}（${p} が無い。clone したか確かめる）`);
      bad++;
      continue;
    }
    const { items, errors } = parseBacklog(readFileSync(p, 'utf8'));
    for (const e of errors) console.log(`書き方の誤り: ${name} ${e}（今日の回で直す）`);
    const count = (s) => items.filter((i) => i.state === s).length;
    console.log(`一覧: ${name} 次${count('次')}・作業中${count('作業中')}・保留${count('保留')}・済み${count('済み')}`);
    if (count('作業中') > 1) console.log(`注意: ${name} に作業中が ${count('作業中')} 件ある（1件にそろえる）`);
    repos.push({ name, items });
  }
  const p = plan(repos, date, skip);
  if (!p) {
    console.log('今日: することなし（どのリポジトリにも「次」「作業中」が無い。一覧に次の候補を足す）');
  } else {
    const f = p.item.fields;
    console.log(`今日: ${p.repo} ${p.item.id}「${p.item.title}」を${p.mode}（見る順 ${p.order.join(' → ')}）`);
    console.log(`  完了条件: ${f['完了条件']}`);
    for (const k of ['手がかり', '実行', 'PR', 'ブランチ']) if (f[k]) console.log(`  ${k}: ${f[k]}`);
  }
  if (bad) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
