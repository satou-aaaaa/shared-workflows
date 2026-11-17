// 保存の読み直しの共通部品（template/store/store.js）を、ブラウザなしで確かめる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 見ること: 版の行がある・外へ通信しない・壊れた写しや版ちがいを捨てる・数は多いほう・
//          とことんを終えた（null）あとに古い回を戻さない（incidents/2026-11-17-endless-revive-after-save-failure.md）・
//          日付の回は記録帳になければ戻す・別の回は日付の新しいほうで古いほうを記録へ・同じ回は進んだほう、
//          そして 12 本のゲームの load()（scripts/fixtures/store/load-e0f898.js）と、でたらめな写し 3000 組で同じ答えを返すこと。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const errors = [];
const ok = (name, cond) => { if (!cond) errors.push(name); };
const SRC = 'template/store/store.js';
const src = readFileSync(SRC, 'utf8');
ok(`${SRC} に「共通部品の版: N」の行がある`, /共通部品の版:\s*\d+/.test(src));
const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
ok(`${SRC} が外へ通信しない`, !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(/.test(code));
ok(`${SRC} に </script> が無い（index.html に写すと途中で切れる）`, !/<\/script/i.test(src));
// 印（<!-- store:end -->）を中に書くと、写すたびに区切りを取りちがえて写しが2重になる（2026-11-17）。HTML のコメントの形も書かない
ok(`${SRC} に HTML のコメント（<!-- -->）が無い（写しの区切りを取りちがえる）`, !/<!--|-->/.test(src));
{
  const { STORE, storeBlock } = await import('./sync-template.mjs');
  const page = `<head>\n${storeBlock()}\n<script>x</script>`;
  const again = page.replace(STORE, storeBlock());
  ok('写しを2回かけても同じ（区切りを取りちがえない）', again === page && (again.match(/store:end -->/g) || []).length === 1);
}

const S = createRequire(import.meta.url)('../' + SRC);
const J = (x) => JSON.stringify(x);

// ゲーム側の手の見本（e0f898 の12本と同じ形）
const fresh = () => ({ v: 1, t: 0, days: {}, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, best: 0 });
const BOOK = { d: 'days', h: 'hdays', a: 'adays' };
const hooks = (log = []) => ({
  v: 1, fresh, objs: ['days', 'hdays', 'adays', 'dex', 'runs', 'kofi', 'ach'], strictBook: true,
  tidy: (s) => s,
  bank: (s, r) => { log.push(r.id); return !!(r.res && r.res.length >= 3 && BOOK[r.mode] && (s[BOOK[r.mode]][r.date] = r.res.length)); },
  doneOf: (r) => !!(r.res && r.res.length >= 3),
  bookOf: (s, mode) => (BOOK[mode] ? s[BOOK[mode]] : null),
  join: (w, o) => (w.cur && o.cur && w.res.length === o.res.length && w.cur.tag === o.cur.tag
    ? { ...w, cur: { ...w.cur, wrong: [...new Set([...(w.cur.wrong || []), ...(o.cur.wrong || [])])], hints: Math.max(w.cur.hints || 0, o.cur.hints || 0) } } : w),
});

// 1. 壊れた写し・版ちがいは捨てる
ok('壊れた JSON は null', S.parse('{x', 1) === null);
ok('版ちがいは null', S.parse('{"v":2}', 1) === null);
ok('配列は null', S.parse('[1]', 1) === null);
ok('片方だけなら、そのまま（置き場を補う）', J(S.merge(null, { v: 1, best: 3, runs: null }, hooks()).runs) === '{}' && S.merge(null, { v: 1, best: 3 }, hooks()).best === 3);

// 2. 数は多いほう・true は残す
const m2 = S.merge({ v: 1, t: 2, best: 1, dex: { a: 1 } }, { v: 1, t: 1, best: 5, dex: { a: 3, b: 1 }, seen: true }, hooks());
ok('数は多いほう', m2.best === 5 && m2.dex.a === 3 && m2.dex.b === 1 && m2.seen === true);

// 3. とことんを終えた（新しい写しで null）なら、古い写しの途中を戻さない（2026-11-17 の不具合）
const e = { mode: 'e', id: 'e1', date: '2026-11-17', res: [1, 1], cur: null };
// 記録帳を持たないモードの回を戻す形（strictBook: false。4本のゲーム）でも、記録帳が無ければ戻さない形でも
for (const strictBook of [false, true]) {
  const m3 = S.merge({ v: 1, t: 5, runs: { e: null } }, { v: 1, t: 1, runs: { e } }, { ...hooks(), strictBook });
  ok(`とことんを終えたあと、古い回が戻らない（strictBook: ${strictBook}）`, m3.runs.e === null);
}
const m3b = S.merge({ v: 1, t: 1, runs: { e: null } }, { v: 1, t: 5, runs: { e } }, hooks());
ok('とことんの途中が新しいなら、そのまま', J(m3b.runs.e) === J(e));

// 3b. 終えた回の印 gone（震度よみ型）：新しい写しに終えた回が残っていても、gone にあれば消す（hataraku-kimari #1 で発見、版2）
{
  const d = { mode: 'd', id: 'g1', date: '2000-01-01', res: [1], cur: null };
  const newer = S.merge({ v: 1, t: 1, gone: { g1: 1 }, runs: { d: null } }, { v: 1, t: 5, runs: { d } }, hooks());
  const older = S.merge({ v: 1, t: 5, gone: { g1: 1 }, runs: { d: null } }, { v: 1, t: 1, runs: { d } }, hooks());
  const keep = S.merge({ v: 1, t: 1, gone: { other: 1 }, runs: { d: null } }, { v: 1, t: 5, runs: { d } }, hooks());
  ok('gone にある回は、新しい写しにあっても戻さない', newer.runs.d === null && older.runs.d === null);
  ok('gone に無い回は、これまでどおり（記録帳になければ戻す）', keep.runs.d && keep.runs.d.id === 'g1');
}

// 4. 今日の回：終えた側が null でも、記録帳になければ戻す・あれば戻さない
const d = { mode: 'd', id: 'd1', date: '2026-11-17', res: [1], cur: null };
ok('今日の途中は記録帳に無ければ戻す', J(S.merge({ v: 1, t: 5, runs: { d: null } }, { v: 1, t: 1, runs: { d } }, hooks()).runs.d) === J(d));
ok('今日の途中は記録帳にあれば戻さない', S.merge({ v: 1, t: 5, runs: { d: null }, days: { '2026-11-17': 3 } }, { v: 1, t: 1, runs: { d } }, hooks()).runs.d === null);

// 5. 別の回は日付の新しいほう、古いほうは bank
const log = [];
const old = { mode: 'd', id: 'x', date: '2026-11-16', res: [1, 1, 1] }, neu = { mode: 'd', id: 'y', date: '2026-11-17', res: [] };
const m5 = S.merge({ v: 1, t: 5, runs: { d: old } }, { v: 1, t: 1, runs: { d: neu } }, hooks(log));
ok('別の回は日付の新しいほう', m5.runs.d.id === 'y' && log.includes('x') && m5.days['2026-11-16'] === 3);

// 6. 同じ回は進んだほう・印は合わせる
const p1 = { mode: 'd', id: 'z', date: '2026-11-17', res: [1], cur: { tag: 'q', wrong: [1], hints: 1 } };
const p2 = { mode: 'd', id: 'z', date: '2026-11-17', res: [1], cur: { tag: 'q', wrong: [2], hints: 0 } };
const m6 = S.merge({ v: 1, t: 5, runs: { d: p1 } }, { v: 1, t: 1, runs: { d: p2 } }, hooks());
ok('同じ回は進んだほうで、まちがいを合わせる', J(m6.runs.d.cur.wrong.sort()) === '[1,2]' && m6.runs.d.cur.hints === 1);

// 7. 12本のゲームの load() と、でたらめな写しで同じ答え
const ref = readFileSync('scripts/fixtures/store/load-e0f898.js', 'utf8');
function runRef(a, b) {
  const ctx = { mem: a === null ? null : J(a), localStorage: { getItem: () => (b === null ? null : J(b)) }, KEY: 'k', fresh, tidy: (s) => s, out: null };
  const h = hooks(); Object.assign(ctx, { bank: h.bank, doneOf: h.doneOf, bookOf: h.bookOf });
  vm.runInNewContext(ref.replace(/\/\/ ([^\n]*?) if \(w/, '/* $1 */ if (w') + '\nout = load();', ctx);
  return ctx.out;
}
// 乱数は種から（mulberry32。毎回同じ写しの組で確かめる）
let seed = 7;
const rnd = (n) => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) % n); };
const pick = (xs) => xs[rnd(xs.length)];
const run = (mode) => pick([undefined, null, { mode, id: pick(['a', 'b']), date: pick(['2026-11-16', '2026-11-17']), res: Array(rnd(4)).fill(1), cur: pick([null, { tag: pick(['q', 'r']), wrong: [rnd(3)], hints: rnd(3) }]) }]);
const save = () => {
  if (!rnd(8)) return null;
  const s = { v: pick([1, 1, 1, 2]), t: rnd(4), best: rnd(5), dex: { a: rnd(3) }, runs: {} };
  for (const m of ['d', 'h', 'e', 'p']) { const r = run(m); if (r !== undefined) s.runs[m] = r; }
  if (rnd(2)) s.days = { '2026-11-17': rnd(4) };
  return s;
};
let diff = 0, first = '';
for (let i = 0; i < 3000; i++) {
  const a = save(), b = save();
  const want = J(runRef(a, b));
  const got = J(S.merge(a === null ? null : JSON.parse(J(a)), b === null ? null : JSON.parse(J(b)), hooks()));
  if (want !== got) { diff++; if (!first) first = `${J(a)} + ${J(b)}\n  ゲーム: ${want}\n  共通:   ${got}`; }
}
ok(`12本のゲームの load() と同じ答え（ちがい ${diff}/3000）${first ? '\n  例: ' + first : ''}`, diff === 0);

if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ 保存の読み直しの共通部品（template/store/store.js）');
