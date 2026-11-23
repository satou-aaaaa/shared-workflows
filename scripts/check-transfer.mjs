// 引き継ぎコードのひな形（template/transfer.js・template/qa/transfer-check.mjs）を、ブラウザなしで確かめる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 見ること: 版の行がある・外へ通信する書き方が無い・書き出したコードを読み戻せる・写しまちがい/別のゲーム/知らないキー/新しい版を弾く・
//          読み直したときの入れ替えで前の記録を控えに残す・ほかのゲームのキーに触らない。
//          版13：番号を進めてから控えを読む・途中で止まったときの印・保存に失敗したタブを自動で読み直さない・保存と入れ替えの重なりを知らせる。
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
{
  // 版14：QR の部品は transfer-qr.js に分け、箱を開いたときにだけ読む（毎回の表示を止める量を減らす）
  const qr = readFileSync('template/transfer-qr.js', 'utf8');
  ok('template/transfer-qr.js に QR を作る部品（qrcode-generator）が入り、window.HKQR に置く', /var qrcode = function\(\)/.test(qr) && /qrcode-generator 2\.\d+\.\d+/.test(qr) && /window\.HKQR = \(function/.test(qr));
  ok('template/transfer-qr.js が外へ通信しない', !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(/.test(qr.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')));
  ok('template/transfer.js に QR の部品そのものは入れない（transfer-qr.js を箱を開いたときに読む）', !/var qrcode = function\(\)/.test(src) && /transfer-qr\.js/.test(src) && /function loadQr\(\)/.test(src));
  const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx.window); vm.runInContext(qr, ctx.window);
  const q = ctx.window.HKQR(0, 'L'); q.addData('https://example.test/#hk=HK1.abc.1', 'Byte'); q.make();
  ok('transfer-qr.js の HKQR で QR を作れる', q.getModuleCount() >= 21);
}
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
function boot({ game, keys, local, session, Storage }) {
  const ctx = {
    console, Promise, Response, Blob, TextEncoder, TextDecoder, CompressionStream, DecompressionStream: CountingDS, Uint8Array, atob, btoa, Date, JSON, Error, setTimeout,
    localStorage: local, sessionStorage: session,
    location: { href: 'https://example.test/game/', hash: '', pathname: '/game/', search: '', replace() {} },
    history: { replaceState() {} },
    document: { currentScript: { dataset: { game, keys } }, readyState: 'loading', addEventListener() {} },
    addEventListener() {},
  };
  if (Storage) ctx.Storage = Storage;
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
// 取り込んだあとの知らせには「控えに戻す」を付ける（取り込んだ記録の形でゲームが動かなくても戻せるように。版4）
const done = (ss) => { try { return JSON.parse(ss.getItem('hk-done:kippu-10') || 'null'); } catch { return null; } };
ok('前の記録があって取り込んだときは、知らせに「控えに戻す」を付ける', done(session2)?.u === true);
{
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': '{"old":1}' }, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: store({ 'kippu-v1': rec }), session: ss });
  ok('控えに戻したあとの知らせには「控えに戻す」を付けない', done(ss)?.u === false && /戻しました/.test(done(ss)?.m || ''));
}
// 控えに戻すときは、入れ替えが済むまで控えを上書きしない（途中で止まっても控えが残り、もう一度戻せる。版5）
{
  const bk = JSON.stringify({ at: '2026-11-01T00:00:00Z', d: { 'kippu-v1': '{"old":1}', 'kippu-x': '{"x":1}' } });
  const l = store({ 'kippu-v1': rec, 'kippu-x': '{"font":1}', 'hk-backup:kippu-10': bk });
  const rs = l.setItem; let n = 0;
  l.setItem = (k, v) => { if (!k.startsWith('hk-') && ++n >= 2) throw new Error('QuotaExceededError'); return rs(k, v); };
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: JSON.parse(bk).d, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l, session: ss });
  ok('控えに戻す途中で止まり元にも戻せなかったときも、控え（戻したい記録）を消さない', l.getItem('hk-backup:kippu-10') === bk && done(ss)?.u === true);
  const l2 = store({ 'kippu-v1': rec, 'hk-backup:kippu-10': bk });
  const s2 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: JSON.parse(bk).d, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l2, session: s2 });
  const l3 = store({ 'kippu-v1': rec, 'hk-backup:kippu-10': bk });
  const rs3 = l3.setItem; l3.setItem = (k, v) => { if (k.startsWith('hk-backup:')) throw new Error('QuotaExceededError'); return rs3(k, v); };
  const s3 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: JSON.parse(bk).d, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l3, session: s3 });
  ok('控えに戻せても新しい控えを書けないときは、戻す前の記録に戻して「元のまま」と知らせる', l3.getItem('kippu-v1') === rec && l3.getItem('kippu-x') === null && l3.getItem('hk-backup:kippu-10') === bk && /元のまま/.test(done(s3)?.m || ''));
  ok('控えに戻せたら、戻す前の記録が新しい控えになる（もう一度押すと戻る）', l2.getItem('kippu-v1') === '{"old":1}' && JSON.parse(l2.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === rec);
}
// deflate-raw を作れない古いブラウザでは「古い」と知らせる（形のまちがいにしない）
{
  const old = boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: store(), session: store() });
  old.DecompressionStream = function () { throw new TypeError('Unsupported compression format: deflate-raw'); };
  ok('deflate-raw を知らないブラウザでは「古い」と知らせる', (await kind(old.HK.decode(c))) === 'old');
}
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

// 受け取る側が弾く大きさの記録は、書き出しの時点で止める
{
  const big = boot({ game: 'kippu-10', keys: 'kippu-v1', local: store({ 'kippu-v1': JSON.stringify({ v: 1, pad: 'a'.repeat(4 * 1024 * 1024 + 10) }) }), session: store() });
  ok('4MB を超える記録は書き出しで止める（作れたのに取り込めない、をなくす）', (await kind(big.HK.encode())) === 'big');
}
// URL の途中で改行されていても読める
ok('URL の途中で改行されたコードも読める', (await w.HK.decode(`https://example.test/game/#hk=${c.slice(0, 20)}\n${c.slice(20)}\n`)).d['kippu-v1'] === rec);

// 改行のあとに字下げ（空白・タブ）があっても読める。改行の無い空白のあとの文字はコードに入れない
ok('改行のあとの字下げをまたいだコードも読める', (await w.HK.decode(`https://example.test/game/#hk=${c.slice(0, 20)}\n    ${c.slice(20)}`)).d['kippu-v1'] === rec);
// URL のすぐ下に字下げした別の行（メモなど）があっても、コードに入れない（版6。hikari-michi #2 の CodeRabbit の指摘）
ok('URL の下の字下げした別の行の字はコードに入れない', (await kind(w.HK.decode(`https://example.test/game/#hk=${c}\n  Note: keep`))) === 'ok');
ok('折り返したコードの下に字下げした別の行があっても読める', (await kind(w.HK.decode(`https://example.test/game/#hk=${c.slice(0, 20)}\n  ${c.slice(20)}\n  keep this`))) === 'ok');
ok('コードの下の行も字だけのときは、合うところまでで止める', (await kind(w.HK.decode(`${c}\nabc`))) === 'ok');
ok('ほんとうの写しまちがいは今までどおり弾く', (await kind(w.HK.decode(`https://example.test/game/#hk=${c.slice(0, 20)}\n  ${c[20] === 'A' ? 'B' : 'A'}${c.slice(21)}`))) === 'crc');
ok('コードのあとに空白と言葉が続いても読める', (await w.HK.decode(`#hk=${c} です`)).d['kippu-v1'] === rec);
// 記録が無いときはコードを作らない（受け取る側で必ず弾かれる）
ok('記録が無いときは書き出さない', (await kind(boot({ game: 'kippu-10', keys: 'kippu-v1', local: store(), session: store() }).HK.encode())) === 'empty');

// 預けた中身に data-keys の外のキー（前の版の控えの a11y-v1・控え hk-backup:）があっても書かない
{
  const l = store({ 'kippu-v1': '{"old":1}', 'a11y-v1': '{"font":2}', 'hk-backup:bento-zume': 'x' });
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': rec, 'a11y-v1': '{"font":9}', 'hk-backup:bento-zume': 'y' }, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,k*', local: l, session: ss });
  const hw = boot({ game: 'kippu-10', keys: 'kippu-v1,h*', local: store({ 'kippu-v1': rec, 'hk-backup:kippu-10': '{}' }), session: store() });
  ok('h* と書いても控え（hk-）は書き出さない', !Object.keys((await hw.HK.decode(await hw.HK.encode())).d).some((k) => k.startsWith('hk-')));
  ok('戻すときも data-keys の外のキー・hk- のキーには書かない', l.getItem('kippu-v1') === rec && l.getItem('a11y-v1') === '{"font":2}' && l.getItem('hk-backup:bento-zume') === 'x');
}

{
  const l = store({ 'kippu-v1': '{"old":1}' });
  boot({ game: 'kippu-10', keys: 'kippu-v1', local: l, session: store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'a11y-v1': '{}' }, undo: true }) }) });
  ok('外のキーだけの控えに戻すときは、いまの記録を消さない', l.getItem('kippu-v1') === '{"old":1}');
}
// 控えを書けない（端末の空きが無い）ときは入れ替えない
const full = store({ 'kippu-v1': '{"old":1}' });
const realSet = full.setItem;
full.setItem = (k, v) => { if (k.startsWith('hk-backup:')) throw new Error('QuotaExceededError'); return realSet(k, v); };
const session3 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': rec }, undo: false }) });
boot({ game: 'kippu-10', keys: 'kippu-v1', local: full, session: session3 });
ok('控えを書けないときは入れ替えず、元の記録のまま', full.getItem('kippu-v1') === '{"old":1}' && /元のまま/.test(session3.getItem('hk-done:kippu-10') || ''));

// 入れ替えの途中で止まり、元にも戻せなかったときは、前の記録の控えを消さない
{
  const l = store({ 'kippu-v1': '{"old":1}', 'kippu-x': '{"x":1}' });
  const rs = l.setItem; let n = 0;
  l.setItem = (k, v) => { if (!k.startsWith('hk-') && ++n >= 2) throw new Error('QuotaExceededError'); return rs(k, v); };
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': rec, 'kippu-x': '{"font":1}' }, undo: false }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l, session: ss });
  ok('元に戻せなかったときは控えを残し、控えに戻せると知らせる', JSON.parse(l.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === '{"old":1}' && /控えに戻す/.test(ss.getItem('hk-done:kippu-10') || '') && JSON.parse(ss.getItem('hk-done:kippu-10') || '{}').u === true);
}

// 版7：保存に失敗したままの記録があると、古い記録のコードを作らない（成功し直せば作る）
{
  class FakeStorage {
    constructor(init) { this.m = new Map(Object.entries(init)); this.full = false; }
    get length() { return this.m.size; }
    key(i) { return [...this.m.keys()][i] ?? null; }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { if (this.full) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
  }
  const l = new FakeStorage({ 'kippu-v1': rec });
  const sw = boot({ game: 'kippu-10', keys: 'kippu-v1', local: l, session: store(), Storage: FakeStorage });
  l.full = true;
  let threw = false; try { l.setItem('kippu-v1', '{"new":1}'); } catch { threw = true; }
  ok('保存の失敗はゲームにそのまま返す', threw);
  ok('保存に失敗したままの記録があると、コードを作らない', (await kind(sw.HK.encode())) === 'unsaved');
  l.full = false; l.setItem('kippu-v1', '{"new":1}');
  ok('保存し直せたらコードを作る', (await kind(sw.HK.encode())) === 'ok');
  l.full = true; try { l.setItem('other-game', 'x'); } catch { /* ほかのキー */ }
  ok('ほかのキーの保存の失敗では止めない', (await kind(sw.HK.encode())) === 'ok');
}
// 版7：縮めないコード（HK0）も作れて、読み戻せる
{
  const c0 = await w.HK.encode(true);
  ok('縮めないコード（HK0）を作れる', /^HK0\./.test(c0));
  ok('縮めないコードも読み戻せる', (await w.HK.decode(c0)).d['kippu-v1'] === rec);
}
// 版7：URL のコードの途中に空白が入っても読める・入れ替えたらほかのタブへ知らせる
ok('URL のコードの途中の空白をまたいでも読める', (await kind(w.HK.decode(`https://example.test/game/#hk=${c.slice(0, 15)} ${c.slice(15, 30)}  ${c.slice(30)} keep`))) === 'ok');
ok('入れ替えたら、ほかのタブへ知らせる印（hk-sync:）を書く', !!local2.getItem('hk-sync:kippu-10'));
ok('知らせる印は書き出しに入れない', !Object.keys((await w.HK.decode(await boot({ game: 'kippu-10', keys: 'kippu-v1,h*', local: store({ 'kippu-v1': rec, 'hk-sync:kippu-10': '1' }), session: store() }).HK.encode())).d).some((k) => k.startsWith('hk-')));
// 版7：とても長い貼りつけは、CRC を計る前にすぐ弾く
{
  const t0 = Date.now();
  const k = await kind(w.HK.decode('HK0.' + 'A'.repeat(8 * 1024 * 1024 + 10) + '.0'));
  ok(`とても長い貼りつけはすぐ弾く（結果 ${k}・${Date.now() - t0}ms）`, k === 'big' && Date.now() - t0 < 1500);
}

// 版8：HK0 は base64 を戻す前に長さで弾く（MAX_CODE より短くても、戻すと MAX_JSON を超えるもの）
{
  const t0 = Date.now();
  const k = await kind(w.HK.decode('HK0.' + 'A'.repeat(6 * 1024 * 1024) + '.0'));
  ok(`HK0 の大きすぎる中身は base64 を戻す前に弾く（結果 ${k}・${Date.now() - t0}ms）`, k === 'big' && Date.now() - t0 < 1500);
}
// 版8：控えに戻したとき、戻す前が空でも空の記録を控えに残し、もう一度押せば行き来できる
{
  const bk = JSON.stringify({ at: '2026-11-01T00:00:00Z', d: { 'kippu-v1': rec } });
  const l = store({ 'hk-backup:kippu-10': bk });
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: JSON.parse(bk).d, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1', local: l, session: ss });
  const nb = JSON.parse(l.getItem('hk-backup:kippu-10') || 'null');
  ok('戻す前が空でも、空の記録を控えに残す（控えが消えない）', l.getItem('kippu-v1') === rec && nb && nb.d && Object.keys(nb.d).length === 0);
  const s2 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: nb.d, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1', local: l, session: s2 });
  ok('もう一度戻すと空に戻り、控えは前の記録になる', l.getItem('kippu-v1') === null && JSON.parse(l.getItem('hk-backup:kippu-10')).d['kippu-v1'] === rec);
}

// 版13（hatsuden-kurabe #1・nenkin-shikumi #1 の CodeRabbit）：タブをまたぐ保存と入れ替えの重なり・途中で止まったときの印・保存に失敗したタブ
// 画面の部品の代わり（帯・知らせを数える）
function dom() {
  const made = [];
  const mk = (tag) => {
    const e = { tag, kids: [], attrs: {}, style: {}, firstChild: null, parentNode: null, textContent: '',
      setAttribute(k, v) { this.attrs[k] = v; if (k === 'id') byId[v] = this; }, getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { this.kids.push(c); c.parentNode = this; if (!this.firstChild) this.firstChild = c; return c; },
      removeChild(c) { this.kids = this.kids.filter((x) => x !== c); c.parentNode = null; }, addEventListener() {}, querySelector: () => null, focus() {} };
    Object.defineProperty(e, 'id', { set(v) { byId[v] = e; }, get() { return e.attrs.id; } });
    made.push(e); return e;
  };
  const byId = {};
  const body = mk('body'), head = mk('head');
  const listeners = {};
  return {
    made, listeners,
    document: { currentScript: null, readyState: 'loading', body, head, documentElement: body,
      addEventListener: (t, f) => { (listeners['doc:' + t] ||= []).push(f); },
      createElement: mk, createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), getElementById: (id) => byId[id] || null, querySelector: () => null, activeElement: null },
    on: (t, f) => { (listeners['win:' + t] ||= []).push(f); },
    fire(t, ev) { for (const f of listeners[t] || []) f(ev); },
  };
}
class SpyStorage {
  constructor(init) { this.m = new Map(Object.entries(init)); this.full = false; this.before = null; }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.before) this.before(k, v); if (this.full && !String(k).startsWith('hk-')) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
function bootTab({ local, session = store(), game = 'kippu-10', keys = 'kippu-v1' }) {
  const d = dom();
  const reloads = { n: 0 };
  const ctx = {
    console, Promise, Response, Blob, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Uint8Array, atob, btoa, Date, JSON, Error, setTimeout,
    localStorage: local, sessionStorage: session, Storage: SpyStorage,
    location: { href: 'https://example.test/game/', hash: '', pathname: '/game/', search: '', replace() {}, reload() { reloads.n++; } },
    history: { replaceState() {} },
    document: { ...d.document, currentScript: { dataset: { game, keys } } },
    addEventListener: d.on,
  };
  ctx.window = ctx;
  const saved = SpyStorage.prototype.setItem;
  vm.runInNewContext(src, ctx);
  d.fire('doc:DOMContentLoaded');
  const restore = () => { SpyStorage.prototype.setItem = saved; };
  return { ctx, d, reloads, restore, banner: () => ctx.document.getElementById('hk-stale-tab'), toasts: () => d.made.filter((e) => e.attrs.class === 'hk-toast') };
}
{
  // 番号を進めてから控えを読む：番号を書いた直後に別のタブが保存した記録（A2）を、控えに残す
  const l = store({ 'kippu-v1': '{"a":1}' });
  const rs = l.setItem;
  l.setItem = (k, v) => { rs(k, v); if (k === 'hk-sync:kippu-10') rs('kippu-v1', '{"a":2}'); };
  boot({ game: 'kippu-10', keys: 'kippu-v1', local: l, session: store({ 'hk-pending:kippu-10': JSON.stringify({ d: { 'kippu-v1': rec }, undo: false }) }) });
  ok('入れ替えの番号を進めたあとに読んだ記録を控えにする（そのあいだに別のタブが保存した分を消さない）', l.getItem('kippu-v1') === rec && JSON.parse(l.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === '{"a":2}');
}
{
  // 控えを書けず、戻すのも途中で止まったときも、止まったときの印（hk-prevfp:）を残す。そのあと遊んだ記録は、もう一度戻すとき控えに残す
  const A = { 'kippu-v1': '{"a":1}', 'kippu-x': '{"ax":1}' }, B = { 'kippu-v1': '{"b":1}', 'kippu-x': '{"bx":1}' };
  const l = store({ ...A, 'hk-backup:kippu-10': JSON.stringify({ at: '2026-11-01T00:00:00Z', d: B }) });
  const rs = l.setItem; let n = 0; let on = true;
  l.setItem = (k, v) => {
    if (on && k === 'hk-backup:kippu-10') throw new Error('QuotaExceededError');
    if (on && !k.startsWith('hk-') && ++n >= 4) throw new Error('QuotaExceededError');
    return rs(k, v);
  };
  const ss = store({ 'hk-pending:kippu-10': JSON.stringify({ d: B, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l, session: ss });
  ok('控えを書けず、戻すのも途中で止まったときも、止まったときの印（hk-prevfp:）を残す', !!l.getItem('hk-prevfp:kippu-10') && !!l.getItem('hk-prev:kippu-10') && done(ss)?.u === true);
  on = false;
  l.setItem('kippu-v1', '{"c":1}'); l.setItem('kippu-x', '{"cx":1}');
  const ss2 = store({ 'hk-pending:kippu-10': JSON.stringify({ d: A, undo: true }) });
  boot({ game: 'kippu-10', keys: 'kippu-v1,kippu-x', local: l, session: ss2 });
  ok('止まったあとに遊んだ記録は、元の記録へ戻すとき控えに残す（消さない）', l.getItem('kippu-v1') === '{"a":1}' && JSON.parse(l.getItem('hk-backup:kippu-10') || '{}').d?.['kippu-v1'] === '{"c":1}');
}
{
  // 保存に失敗したままの記録があるタブは、別のタブで入れ替えても自動では読み直さず、帯で知らせる
  const l = new SpyStorage({ 'kippu-v1': '{"a":1}' });
  const t = bootTab({ local: l });
  try {
    l.full = true;
    try { l.setItem('kippu-v1', '{"mine":1}'); } catch { /* ゲームには失敗が返る */ }
    l.full = false;
    l.m.set('hk-sync:kippu-10', 'other');
    t.d.fire('win:storage', { key: 'hk-sync:kippu-10', newValue: 'other' });
    ok('保存に失敗したままの記録があるタブは、別のタブで入れ替えても自動で読み直さない', t.reloads.n === 0 && !!t.banner());
    l.setItem('kippu-v1', '{"mine":2}');
    ok('そのタブの次の保存でも読み直さず、記録も書かない（帯で知らせる）', t.reloads.n === 0 && l.getItem('kippu-v1') === '{"a":1}');
  } finally { t.restore(); }
  const l2 = new SpyStorage({ 'kippu-v1': '{"a":1}' });
  const t2 = bootTab({ local: l2 });
  try {
    l2.m.set('hk-sync:kippu-10', 'other');
    t2.d.fire('win:storage', { key: 'hk-sync:kippu-10', newValue: 'other' });
    ok('保存の失敗が無いタブは、今までどおり読み直す', t2.reloads.n === 1);
  } finally { t2.restore(); }
}
{
  // 確かめてから書くまでのあいだに別のタブが入れ替えたら、書いたあとに気づいて印（hk-race:<ゲーム>:<番号>）を残し、読み直す。印のある画面は知らせる
  const s1 = '1000.a', s2 = '2000.b', s3 = '3000.c';
  const l = new SpyStorage({ 'kippu-v1': '{"a":1}', 'hk-sync:kippu-10': s1 });
  const t = bootTab({ local: l });
  try {
    l.before = (k) => { if (k === 'kippu-v1') { l.before = null; l.m.set('hk-sync:kippu-10', s2); } };
    l.setItem('kippu-v1', '{"old":1}');
    ok('保存と入れ替えが重なったら、その入れ替えの番号の印（hk-race:）を残して読み直す', l.getItem(`hk-race:kippu-10:${s2}`) !== null && t.reloads.n === 1);
  } finally { t.restore(); }
  const t2 = bootTab({ local: l });
  try {
    ok('印のある画面を開くと「混ざったかもしれない」と知らせ、印を消す', t2.toasts().length === 1 && l.getItem(`hk-race:kippu-10:${s2}`) === null);
  } finally { t2.restore(); }
  l.m.set(`hk-race:kippu-10:${s1}`, '1');
  const t3 = bootTab({ local: l });
  try {
    ok('前の入れ替えの古い印では知らせず、印だけ消す', t3.toasts().length === 0 && l.getItem(`hk-race:kippu-10:${s1}`) === null);
  } finally { t3.restore(); }
  // 古い番号のままのタブが印を片づけても、あとから書かれた新しい入れ替えの印は消さない
  {
    const l5 = new SpyStorage({ 'kippu-v1': '{"a":1}', 'hk-sync:kippu-10': s2 });
    const t5 = bootTab({ local: l5 });
    try {
      l5.m.set(`hk-race:kippu-10:${s3}`, '1');
      t5.d.fire('win:storage', { key: `hk-race:kippu-10:${s2}`, newValue: '1' });
      ok('古い番号のタブの片づけで、新しい入れ替えの印を消さない', l5.getItem(`hk-race:kippu-10:${s3}`) === '1');
    } finally { t5.restore(); }
  }
  // 印を書けない（端末の空きが無い）ときは、読み直さずに帯で「混ざったかもしれない」と知らせ続ける
  {
    const l6 = new SpyStorage({ 'kippu-v1': '{"a":1}', 'hk-sync:kippu-10': s1 });
    const t6 = bootTab({ local: l6 });
    try {
      l6.before = (k) => {
        if (k === 'kippu-v1') l6.m.set('hk-sync:kippu-10', s2);
        if (String(k).startsWith('hk-race:')) throw new Error('QuotaExceededError');
      };
      l6.setItem('kippu-v1', '{"old":1}');
      const band = t6.banner();
      const text = band && band.firstChild && band.firstChild.nodeValue;
      ok('印を書けないときは読み直さず、帯で「混ざったかもしれない」と知らせる', t6.reloads.n === 0 && /混ざった/.test(text || ''));
    } finally { t6.restore(); }
  }
}

const bad = boot({ game: 'x', keys: '*', local: store(), session: store() });
ok('data-keys に分け合う a11y-v1 があるときは動かない', !boot({ game: 'x', keys: 'x-v1,a11y-v1', local: store(), session: store() }).HK && !boot({ game: 'x', keys: 'x-v1,a11y*', local: store(), session: store() }).HK);
ok('data-keys が * だけのときは動かない（同じサイトのほかのゲームの記録まで持ち出さない）', !bad.HK);

if (errors.length) {
  console.error(errors.map((e) => `::error::引き継ぎコード: ${e} が通らない`).join('\n'));
  process.exit(1);
}
console.log('引き継ぎコード: ひな形の検査が通った');
