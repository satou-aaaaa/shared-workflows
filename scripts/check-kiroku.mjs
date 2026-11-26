// ゲームの共通部品 kiroku（template/kiroku/kiroku.js）と、文字の大きさの切り替え（sync-template の migrateFs）を、ブラウザなしで確かめる
// （check.sh と CI の Lint が呼ぶ。Claude は使わない）。画面の動き（見やすさの窓の「文字の大きさ・音・長く遊んだら知らせる」）は check-a11y-block.mjs が見る。
// 見ること: 版の行・外へ通信しない・写しを2回かけても同じ・Kiroku.note を home() に1回だけ足す・はじめての人にお知らせを出さない・
//          戻ってきた人には一度だけ出す・成績のまとめに外へ出してはいけない物を入れない・migrateFs が前の大きさを引き継ぐ形にする
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const errors = [];
const ok = (name, cond) => { if (!cond) errors.push(name); };
const SRC = 'template/kiroku/kiroku.js';
const src = readFileSync(SRC, 'utf8');
ok(`${SRC} に「版: N」の行がある`, /\/\/ 版: \d+/.test(src));
const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
ok(`${SRC} が外へ通信しない（個人データはとらない。2026-11-26）`, !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(|EventSource|new Image\(/.test(code));
ok(`${SRC} に Math.random が無い`, !/Math\.random/.test(code));
const S = await import('./sync-template.mjs');
{
  const game = ['<head><!-- a11y:begin -->a<!-- a11y:end -->\n<!-- core:begin -->c<!-- core:end -->\n</head><body><script>',
    'function home() {', '  const s = load(), k = 1;', '  app.innerHTML = `x`;', '  bindFooter();', '  if (!s.tut) firstPlay();', '}', '</script></body>'].join('\n');
  const m1 = S.migrateKiroku(game), filled = m1.replace(S.KIROKU, () => S.kirokuBlock());
  const m2 = S.migrateKiroku(filled);
  ok('migrateKiroku：kiroku の印を core:end のすぐ後ろに置く', /<!-- core:end -->\n<!-- kiroku:begin -->/.test(m1));
  ok('migrateKiroku：home() の bindFooter(); の前に Kiroku.note を1行足す', m1.includes(`${S.KIROKU_NOTE}  bindFooter();`));
  ok('migrateKiroku：2回かけても同じ（中身を写したあとも）', m2 === filled && (m2.match(/成績のまとめ（共通部品 kiroku）/g) || []).length === 1);
  const noLoad = game.replace('  const s = load(), k = 1;\n', '');
  ok('migrateKiroku：const s = load() の無い home() には足さない', !S.migrateKiroku(noLoad).includes('Kiroku.note('));
  ok('migrateKiroku：core の印の無いページは変えない', S.migrateKiroku('<head></head>') === '<head></head>');
}
{
  const fsGame = ['<style>html.fs1{font-size:17px}html.fs2{font-size:19px}html.fs3{font-size:23px}</style><script>',
    'const KEY = "g-v1", FSKEY = "g-fs";',
    'function fsGet() { try { const v = +localStorage.getItem(FSKEY); return v >= 1 && v <= 3 ? v : 1; } catch (e) { return 1; } }',
    'function fsSet(v) { try { localStorage.setItem(FSKEY, String(v)); } catch (e) {} document.documentElement.classList.remove("fs1", "fs2", "fs3"); document.documentElement.classList.add("fs" + v); }',
    'document.documentElement.classList.remove("fs1", "fs2", "fs3"); document.documentElement.classList.add("fs" + fsGet());', '</script>'].join('\n');
  const m = S.migrateFs(fsGame);
  ok('migrateFs：CSS を html.a11y-fs1〜3 にする', m.includes('html.a11y-fs1{font-size:17px}html.a11y-fs2{font-size:19px}html.a11y-fs3{font-size:23px}') && !/html\.fs\d\{/.test(m));
  ok('migrateFs：既定が「ふつう」(1) のゲームは A11y.fsFrom(FSKEY, 1) で引き継ぐ', m.includes('A11y.fsFrom(FSKEY, 1);'));
  ok('migrateFs：fsGet・fsSet は共通の設定を使う', m.includes('function fsGet() { return A11y.fs(); }') && m.includes('function fsSet(v) { A11y.set("fs", v); }') && !m.includes('localStorage.setItem(FSKEY'));
  ok('migrateFs：2回かけても同じ', S.migrateFs(m) === m);
  ok('migrateFs：文字の大きさを持たないゲームは変えない', S.migrateFs('<script>x</script>') === '<script>x</script>');
}
{
  // 部品をブラウザの代わりの小さな環境で動かす
  const run = (store, opt = {}) => {
    const shown = [];
    const el = () => ({ setAttribute() {}, addEventListener() {}, querySelector: () => ({ addEventListener() {} }), remove() {}, set innerHTML(v) { shown.push(v); }, isConnected: true, className: '' });
    const doc = { readyState: 'complete', head: { appendChild() {} }, documentElement: {}, body: { prepend() {}, appendChild() {} }, querySelector: () => ({ textContent: 'テスト' }), querySelectorAll: () => [], getElementById: () => (opt.news ? { textContent: JSON.stringify(opt.news) } : null), createElement: el, addEventListener() {}, hidden: false, title: 't' };
    const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    const ctx = { window: {}, document: doc, localStorage: ls, location: { pathname: '/g1/' }, performance: { now: () => 0 }, addEventListener() {}, setInterval() {}, MutationObserver: class { observe() {} }, Date, JSON, Math, Object, Array, String };
    ctx.window = ctx;
    vm.runInNewContext(src, ctx);
    return { K: ctx.Kiroku, shown, store };
  };
  const a = run({});
  a.K.note(() => ({ s: { days: {} }, tally: { played: 0, solved: 0 } }));
  ok('はじめての人：成績のまとめを書かない・お知らせを出さず見たことにする', !('kiroku-v1' in a.store) && a.shown.length === 0 && /"\*"/.test(a.store['news-v1'] || ''));
  const b = run({});
  b.K.note(() => ({ s: { days: { '2026-11-20': {} }, ebest: 4, name: 'x', id: 'secret' }, tally: { played: 1, solved: 3 }, ach: [2, 10] }));
  const rec = JSON.parse(b.store['kiroku-v1'] || '{}').g1 || {};
  ok('戻ってきた人：成績のまとめを書く（遊んだ日・正解・自己ベスト・実績）', rec.played === 1 && rec.solved === 3 && rec.best === 4 && rec.ach && rec.ach.join('/') === '2/10');
  ok('成績のまとめには決まった項目だけを入れる（記録の中身をそのまま写さない）', Object.keys(rec).sort().join(',') === 'ach,best,last,name,played,solved,streak');
  ok('戻ってきた人：お知らせを一度だけ出す', b.shown.filter((h) => /新しくなりました/.test(h)).length === 1);
  b.K.note(() => ({ s: { days: { '2026-11-20': {} } }, tally: { played: 1 } }));
  ok('同じページでホームを描き直しても、お知らせを重ねて出さない', b.shown.filter((h) => /新しくなりました/.test(h)).length === 1);
  const c = run({ 'news-v1': JSON.stringify({ '*': '2099-01-01' }) }, { news: [{ d: '2026-11-26', t: 'ゲームの知らせ' }] });
  c.K.note(() => ({ s: { days: { a: 1 } }, tally: { played: 1 } }));
  ok('ゲームだけの知らせ（id="game-news"）も出す・共通の知らせは見た所まで出さない', c.shown.some((h) => /ゲームの知らせ/.test(h)) && !c.shown.some((h) => /文字の大きさ/.test(h)));
  const d = run({ 'kiroku-v1': '[1,2]', 'news-v1': 'x' });
  d.K.note(() => { throw new Error('x'); });
  ok('壊れた記録・ゲーム側の失敗でも止まらない', true);
}
if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join('\n')); process.exit(1); }
console.log('✓ kiroku（成績・お知らせ・長く遊んだら知らせる）と文字の大きさの切り替え');
