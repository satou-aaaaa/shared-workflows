// 引き継ぎコードのひな形（template/transfer.js・template/qa/transfer-check.mjs）を、ブラウザなしで確かめる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 見ること: 版の行がある・外へ通信する書き方が無い・書き出したコードを読み戻せる・写しまちがい/別のゲーム/知らないキー/新しい版を弾く・
//          読み直したときの入れ替えで前の記録を控えに残す・ほかのゲームのキーに触らない。
// 画面（QR・確認の箱・控えに戻す）は各ゲームの qa/run.mjs が transfer-check.mjs で確かめる。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const errors = [];
const ok = (name, cond) => { if (!cond) errors.push(name); };
const src = readFileSync('template/transfer.js', 'utf8');
const qa = readFileSync('template/qa/transfer-check.mjs', 'utf8');

ok('template/transfer.js に「引き継ぎの版: N」の行がある', /引き継ぎの版:\s*\d+/.test(src));
const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
ok('template/transfer.js が外へ通信しない（fetch・XMLHttpRequest・WebSocket・sendBeacon・import() を使わない）', !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(/.test(code));
ok('template/transfer.js に QR を作る部品（qrcode-generator）が入っている', /var qrcode = function\(\)/.test(src) && /qrcode-generator 2\.\d+\.\d+/.test(src));
ok('template/qa/transfer-check.mjs が checkTransfer を出している', /export async function checkTransfer\(/.test(qa));

// ブラウザの代わり（このファイルが使うものだけ）
function store(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m,
  };
}
function boot({ game, keys, local, session }) {
  const ctx = {
    console, Promise, Response, Blob, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Uint8Array, atob, btoa, Date, JSON, Error, setTimeout,
    localStorage: local, sessionStorage: session,
    location: { href: 'https://example.test/game/', hash: '', pathname: '/game/', search: '', replace() {} },
    history: { replaceState() {} },
    document: { currentScript: { dataset: { game, keys } }, readyState: 'loading', addEventListener() {} },
    addEventListener() {},
  };
  ctx.window = ctx;
  vm.runInNewContext(src, ctx);
  return ctx;
}

const rec = JSON.stringify({ v: 1, days: { '2026-11-05': [3, 3, 2] }, name: 'ひらがなと漢字' });
const local = store({ 'kippu-v1': rec, 'a11y-v1': '{"font":1}', 'bento-v1': '{"other":1}' });
const w = boot({ game: 'kippu-10', keys: 'kippu-v1,a11y-v1', local, session: store() });
const c = await w.HK.encode();
ok('書き出したコードが HK1.<中身>.<CRC> の形', /^HK1\.[A-Za-z0-9_-]+\.[0-9a-z]+$/.test(c));
const back = await w.HK.decode(c);
ok('読み戻すと同じ記録（自分のキーだけ・ほかのゲームのキーは入らない）', JSON.stringify(back.d) === JSON.stringify({ 'kippu-v1': rec, 'a11y-v1': '{"font":1}' }));
ok('URL ごと貼っても読める', (await w.HK.decode(`見てね https://example.test/game/#hk=${c}\n`)).d['kippu-v1'] === rec);
const kind = (p) => p.then(() => 'ok', (e) => e.kind || e.message);
const mid = Math.floor(c.length / 2);
ok('写しまちがいを弾く', (await kind(w.HK.decode(c.slice(0, mid) + (c[mid] === 'A' ? 'B' : 'A') + c.slice(mid + 1)))) === 'crc');
ok('途中で切れたコードを弾く', (await kind(w.HK.decode(c.slice(0, mid)))) !== 'ok');
const other = boot({ game: 'bento-zume', keys: 'bento-v1', local: store({ 'bento-v1': '{}' }), session: store() });
ok('別のゲームのコードを弾く', (await kind(other.HK.decode(c))) === 'game');
const wide = boot({ game: 'kippu-10', keys: 'kippu-v1,a11y-v1,bento-v1', local: store({ 'bento-v1': '{}', 'kippu-v1': '{}' }), session: store() });
ok('知らないキー（ほかのゲームの記録）が入ったコードを弾く', (await kind(w.HK.decode(await wide.HK.encode()))) === 'keys');

// 読み直したときの入れ替え：前の記録を控えに残し、ほかのゲームのキーには触らない
const local2 = store({ 'kippu-v1': '{"old":1}', 'bento-v1': '{"other":1}' });
const session2 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: back.d, undo: false }) });
boot({ game: 'kippu-10', keys: 'kippu-v1,a11y-v1', local: local2, session: session2 });
ok('入れ替えると取り込んだ記録になる', local2.getItem('kippu-v1') === rec && local2.getItem('a11y-v1') === '{"font":1}');
ok('入れ替えでほかのゲームの記録に触らない', local2.getItem('bento-v1') === '{"other":1}');
ok('入れ替える前の記録を控え（hk-backup:<ゲーム>）に残す', JSON.parse(local2.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === '{"old":1}');
ok('預けた中身は1回で消す（読み直すたびに入れ替えない）', session2.getItem('hk-pending:kippu-10') === null && !!session2.getItem('hk-done:kippu-10'));
const bad = boot({ game: 'x', keys: '*', local: store(), session: store() });
ok('data-keys が * だけのときは動かない（同じサイトのほかのゲームの記録まで持ち出さない）', !bad.HK);

if (errors.length) {
  console.error(errors.map((e) => `::error::引き継ぎコード: ${e} が通らない`).join('\n'));
  process.exit(1);
}
console.log('引き継ぎコード: ひな形の検査が通った');
