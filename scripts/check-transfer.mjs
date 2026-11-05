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
// 広げた大きさを数える DecompressionStream（膨らむコードを途中でやめたかを見る）
const inflated = { n: 0 };
class CountingDS {
  constructor(f) {
    const ds = new DecompressionStream(f);
    this.writable = ds.writable;
    this.readable = ds.readable.pipeThrough(new TransformStream({ transform(ch, c) { inflated.n += ch.length; c.enqueue(ch); } }));
  }
}
function boot({ game, keys, local, session }) {
  const ctx = {
    console, Promise, Response, Blob, TextEncoder, TextDecoder, CompressionStream, DecompressionStream: CountingDS, Uint8Array, atob, btoa, Date, JSON, Error, setTimeout,
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
const local = store({ 'kippu-v1': rec, 'kippu-x': '{"font":1}', 'a11y-v1': '{"font":2}', 'bento-v1': '{"other":1}' });
const w = boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local, session: store() });
const c = await w.HK.encode();
ok('書き出したコードが HK1.<中身>.<CRC> の形', /^HK1\.[A-Za-z0-9_-]+\.[0-9a-z]+$/.test(c));
const back = await w.HK.decode(c);
ok('読み戻すと同じ記録（自分のキーだけ・ほかのゲームのキーは入らない）', JSON.stringify(back.d) === JSON.stringify({ 'kippu-v1': rec, 'kippu-x': '{"font":1}' }));
ok('URL ごと貼っても読める', (await w.HK.decode(`見てね https://example.test/game/#hk=${c}\n`)).d['kippu-v1'] === rec);
const kind = (p) => p.then(() => 'ok', (e) => e.kind || e.message);
const mid = Math.floor(c.length / 2);
ok('写しまちがいを弾く', (await kind(w.HK.decode(c.slice(0, mid) + (c[mid] === 'A' ? 'B' : 'A') + c.slice(mid + 1)))) === 'crc');
ok('途中で切れたコードを弾く', (await kind(w.HK.decode(c.slice(0, mid)))) !== 'ok');
const other = boot({ game: 'bento-zume', keys: 'bento-v1', local: store({ 'bento-v1': '{}' }), session: store() });
ok('別のゲームのコードを弾く', (await kind(other.HK.decode(c))) === 'game');
const wide = boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x,bento-v1', local: store({ 'bento-v1': '{}', 'kippu-v1': '{}' }), session: store() });
ok('知らないキー（ほかのゲームの記録）が入ったコードを弾く', (await kind(w.HK.decode(await wide.HK.encode()))) === 'keys');

// 読み直したときの入れ替え：前の記録を控えに残し、ほかのゲームのキーには触らない
const local2 = store({ 'kippu-v1': '{"old":1}', 'bento-v1': '{"other":1}', 'a11y-v1': '{"font":2}' });
const session2 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: back.d, undo: false }) });
boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: local2, session: session2 });
ok('入れ替えると取り込んだ記録になる', local2.getItem('kippu-v1') === rec && local2.getItem('kippu-x') === '{"font":1}');
ok('入れ替えでほかのゲームの記録・分け合う設定（a11y-v1）に触らない', local2.getItem('bento-v1') === '{"other":1}' && local2.getItem('a11y-v1') === '{"font":2}');
ok('入れ替える前の記録を控え（hk-backup:<ゲーム>）に残す', JSON.parse(local2.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === '{"old":1}');
ok('預けた中身は1回で消す（読み直すたびに入れ替えない）', session2.getItem('hk-pending:kippu-10') === null && !!session2.getItem('hk-done:kippu-10'));
// HTML の印になる文字（< > " ' `）が入った記録のコードは弾く（ゲームが innerHTML に入れてもスクリプトにならないように）
const evil = boot({ game: 'kippu-10', keys: 'kippu-v1', local: store({ 'kippu-v1': JSON.stringify({ v: 1, ebest: '<img src=x onerror=alert(1)>' }) }), session: store() });
ok('HTML の印の文字が入った記録のコードを弾く', (await kind(w.HK.decode(await evil.HK.encode()))) === 'bad');
const evil2 = boot({ game: 'kippu-10', keys: 'kippu-v1', local: store({ 'kippu-v1': JSON.stringify({ dex: { '1" onmouseover="x': 1 } }) }), session: store() });
ok('キーの名前に HTML の印の文字が入った記録のコードも弾く', (await kind(w.HK.decode(await evil2.HK.encode()))) === 'bad');

// 小さなコードが大きく膨らむもの（0 を 50MB 縮めたもの）は、広げきる前に弾く
{
  const { deflateRawSync } = await import('node:zlib');
  const z = deflateRawSync(Buffer.alloc(50 * 1024 * 1024, 48));
  const CRCT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let c = 0xffffffff; for (const x of z) c = CRCT[(c ^ x) & 255] ^ (c >>> 8);
  const bomb = 'HK1.' + z.toString('base64url') + '.' + ((c ^ 0xffffffff) >>> 0).toString(36);
  inflated.n = 0;
  const k = await kind(w.HK.decode(bomb));
  ok(`大きく膨らむコードを広げきる前に弾く（${Math.round(z.length / 1024)}KB のコード。結果 ${k}・広げたのは ${Math.round(inflated.n / 1048576)}MB）`, k === 'big' && inflated.n < 8 * 1024 * 1024);
}

// 控えを書けない（端末の空きが無い）ときは入れ替えない
const full = store({ 'kippu-v1': '{"old":1}' });
const realSet = full.setItem;
full.setItem = (k, v) => { if (k.startsWith('hk-backup:')) throw new Error('QuotaExceededError'); return realSet(k, v); };
const session3 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': rec }, undo: false }) });
boot({ game: 'kippu-10', keys: 'kippu-v1', local: full, session: session3 });
ok('控えを書けないときは入れ替えず、元の記録のまま', full.getItem('kippu-v1') === '{"old":1}' && /元のまま/.test(session3.getItem('hk-done:kippu-10') || ''));

const bad = boot({ game: 'x', keys: '*', local: store(), session: store() });
ok('data-keys に分け合う a11y-v1 があるときは動かない', !boot({ game: 'x', keys: 'x-v1,a11y-v1', local: store(), session: store() }).HK && !boot({ game: 'x', keys: 'x-v1,a11y*', local: store(), session: store() }).HK);
ok('data-keys が * だけのときは動かない（同じサイトのほかのゲームの記録まで持ち出さない）', !bad.HK);

if (errors.length) {
  console.error(errors.map((e) => `::error::引き継ぎコード: ${e} が通らない`).join('\n'));
  process.exit(1);
}
console.log('引き継ぎコード: ひな形の検査が通った');
