// ゲームの共通部品 game-core（template/core/core.js）を、ブラウザなしで確かめる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 見ること: 版の行がある・外へ通信しない・</script> と HTML のコメントが無い（写しの区切りを取りちがえない）・写しを2回かけても同じ・
//          esc が属性に入れてよい形にする・num が配列や true を数にしない（#410）・日付の計算・連続日数・
//          「動きを減らす」のとき震わせない・お知らせを読み上げにも届ける。
// 吹き出し（Core.coach）の画面の動きは、各ゲームの qa/run.mjs が template/qa/core-check.mjs で確かめる。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const errors = [];
const ok = (name, cond) => { if (!cond) errors.push(name); };
const SRC = 'template/core/core.js';
const src = readFileSync(SRC, 'utf8');
ok(`${SRC} に「共通部品の版: N」の行がある`, /共通部品の版:\s*\d+/.test(src));
const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
ok(`${SRC} が外へ通信しない`, !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(|EventSource/.test(code));
ok(`${SRC} に Math.random が無い（ゲームの QA が「乱数は練習・とことんだけ」を index.html の中の数で見ている）`, !/Math\.random/.test(code));
ok(`${SRC} に </script> が無い（index.html に写すと途中で切れる）`, !/<\/script/i.test(src));
ok(`${SRC} に HTML のコメント（<!-- -->）が無い（写しの区切りを取りちがえる）`, !/<!--|-->/.test(src));
{
  const { CORE, coreBlock } = await import('./sync-template.mjs');
  const page = `<head>\n${coreBlock()}\n<script>x</script>`;
  const again = page.replace(CORE, () => coreBlock());
  ok('写しを2回かけても同じ（区切りを取りちがえない）', again === page && (again.match(/core:end -->/g) || []).length === 1);
}
{
  // 全ゲームを game-core に切り替える（migrateCore）。決まった古い形だけを替え、何度かけても同じ
  const { migrateCore, CORE, coreBlock } = await import('./sync-template.mjs');
  const game = [
    '<head><!-- a11y:begin -->a<!-- a11y:end -->\n<!-- store:begin -->s<!-- store:end -->',
    '<script src="transfer.js" data-game="g" data-keys="g-v1"></script>\n<script src="depth.js"></script>\n</head><body><script>',
    'const FEEDBACK = "https://github.com/satou-aaaaa/g/issues/new?template=feedback.yml";',
    'const num = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);',
    'const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");',
    'const buzz = (n = 12) => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };',
    'const f = () => `<a href="${FEEDBACK}" target="_blank" rel="noopener">感想を送る</a>`;',
    '<a id="fb2" target="_blank" rel="noopener">感想</a>',
    '</script></body>',
  ].join('\n');
  const m = migrateCore(game);
  const own = m.replace(CORE, '');
  ok('migrateCore：game-core を保存の共通部品のすぐあと（transfer.js・depth.js・</head> の並びの前）に入れる', /<!-- store:end -->\n<!-- core:begin/.test(m) && /<\/script>\n<script src="depth\.js"><\/script>\n<\/head>/.test(m));
  ok('migrateCore：古い num・esc・buzz を Core.* にする', /const num = Core\.num;/.test(own) && /const esc = Core\.esc;/.test(own) && /const buzz = Core\.buzz;/.test(own) && !/Number\.isFinite\(\+v\)/.test(own));
  ok('migrateCore：感想のリンクを Googleフォームへ（data-feedback と bindFeedback を1つ）', (own.match(/data-feedback="fun"/g) || []).length === 2 && (own.match(/Core\.bindFeedback\(/g) || []).length === 1);
  ok('migrateCore：何度かけても同じ', migrateCore(m) === m);
  ok('migrateCore：共通部品のかたまりの中は替えない（同じ形の関数がある）', m.match(CORE)[0] === coreBlock());
  ok('migrateCore：形のちがう関数・head の無いページは触らない', migrateCore('const num = (x) => +x;') === 'const num = (x) => +x;');
  // 2026-11-27 手で写したままの toast・untilNext・buzz・esc・num（説明の // があってもよい）を1行ごと Core.* にする
  const hand = [
    '<head><!-- a11y:begin -->a<!-- a11y:end -->\n</head><body><script>',
    '  function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2000); }',
    'function untilNext() { const n = jstNow(), ms = 864e5 - (n.getTime() % 864e5); return `${Math.floor(ms / 36e5)}時間${Math.floor((ms % 36e5) / 6e4)}分`; }',
    'const buzz = (n = 12) => { try { if (!(window.A11y && A11y.on("calm"))) navigator.vibrate && navigator.vibrate(n); } catch (e) {} };',
    'const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");',
    'const num = (v) => ((typeof v === "number" || typeof v === "string") && Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0); // 数と文字だけ（CodeRabbit）',
    'function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1600); }',
    '</script></body>',
  ].join('\n');
  const h = migrateCore(hand), hown = h.replace(CORE, '');
  ok('migrateCore：手で写した toast・untilNext・buzz・esc・num を Core.* にする（字下げは残す）', /\n  function toast\(t\) \{ Core\.toast\(t\); \}/.test(hown) && /return Core\.untilNext\(\)/.test(hown) && /const buzz = Core\.buzz;/.test(hown) && /const esc = Core\.esc;/.test(hown) && /^const num = Core\.num; \/\/ 共通部品 game-core（配列・true を数にしない #410）$/m.test(hown));
  ok('migrateCore：形のちがう toast（長さのちがうもの）は触らない', hown.includes('setTimeout(() => d.remove(), 1600); }'));
  ok('migrateCore：手で写した小部品の切り替えも、何度かけても同じ', migrateCore(h) === h);
  // 2026-11-27 Ko-fi 応援の一文とフッターの応援先を Core.kofi・Core.KOFI にする（ことばはゲームのものを残す）
  const kofiPage = ['<head><!-- a11y:begin -->a<!-- a11y:end -->\n</head><body><script>',
    'const footer = () => `<footer><a href="https://ko-fi.com/satouaaaaa" target="_blank" rel="noopener">Ko-fi で応援</a></footer>`;',
    'const r = `${showKofi ? `<p class="note">役に立ったら、<a href="https://ko-fi.com/satouaaaaa" target="_blank" rel="noopener">Ko-fi でコーヒー1杯の応援</a>をもらえると、新しい星座とゲームづくりの励みになります（任意・遊ぶのはずっと無料）。</p>` : ""}`;',
    '</script></body>'].join('\n');
  const kp = migrateCore(kofiPage).replace(CORE, '');
  ok('migrateCore：Ko-fi の一文を Core.kofi（ゲームのことばのまま）、フッターを Core.KOFI にする', kp.includes('${showKofi ? Core.kofi("役に立ったら", "新しい星座とゲームづくり") : ""}') && kp.includes('href="${Core.KOFI}"') && !/ko-fi\.com/.test(kp));
}

{
  // 「戻る」でホームへ（migrateBack）。画面を描く関数の最初に mark、home に route を足す。何度かけても同じ
  const { migrateBack, coreBlock } = await import('./sync-template.mjs');
  const game = [coreBlock(), '<script>', 'function home() {', '  app.innerHTML = `<h1>ホーム</h1>`;', '}', 'function book(x) {', '  if (x) return home();', '  app.innerHTML = `<h1>帳</h1>`;', '}', 'function helper() {', '  return 1;', '}', 'const one = () => { app.innerHTML = "x"; };', '</script>'].join('\n');
  const m = migrateBack(game);
  const own = m.replace(coreBlock(), '');
  ok('migrateBack：home に route と mark("")、画面を描く関数に mark を足す', /function home\(\) \{\n  Core\.screens\.route\(\{\}, home\); Core\.screens\.mark\(""\);/.test(own) && /function book\(x\) \{\n  Core\.screens\.mark\("book"\);/.test(own));
  ok('migrateBack：描かない関数・トップレベルの関数でないものには足さない', !/helper\(\) \{\n  Core/.test(own) && (own.match(/Core\.screens\.mark/g) || []).length === 2);
  ok('migrateBack：何度かけても同じ', migrateBack(m) === m);
  ok('migrateBack：home の無いゲーム・game-core の無いページは触らない', migrateBack(game.replace('function home()', 'function top()')) === game.replace('function home()', 'function top()') && migrateBack('function home() {\n  app.innerHTML = 1;\n}') === 'function home() {\n  app.innerHTML = 1;\n}');
  ok('migrateBack：game-core の中（Core.screens の中身）は触らない', m.includes(coreBlock()));
}

// 小さなにせものの画面（要るところだけ）
function fakeDom({ calm = false, now = Date.parse('2026-11-21T14:00:00Z') } = {}) {
  const made = [];
  const el = (tag) => {
    const e = { tagName: tag, id: '', className: '', textContent: '', style: {}, attrs: {}, children: [], isConnected: true,
      setAttribute(k, v) { this.attrs[k] = String(v); }, remove() { this.isConnected = false; }, appendChild(c) { this.children.push(c); return c; }, prepend(c) { this.children.unshift(c); } };
    made.push(e); return e;
  };
  const body = el('body');
  const document = {
    body, head: el('head'), documentElement: { classList: Object.assign(['a11y-read'].concat(calm ? ['a11y-calm'] : []), { contains: (c) => calm && c === 'a11y-calm' }) }, title: 'テストのゲーム',
    createElement: el, getElementById: (id) => made.find((m) => m.id === id && m.isConnected) || null,
    querySelectorAll: (sel) => (sel === '.toast.core-toast' ? made.filter((m) => m.isConnected && m.className === 'toast core-toast') : []),
  };
  const vib = [];
  const win = { document, URLSearchParams, innerWidth: 390, innerHeight: 844, addEventListener: () => {}, navigator: { vibrate: (n) => vib.push(n), userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }, setTimeout: (f) => { f(); return 1; }, clearTimeout: () => {}, Date: class extends Date { static now() { return now; } } };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(src, win);
  return { Core: win.Core, made, vib };
}

const { Core, made, vib } = fakeDom();
ok('window.Core に版がある', Core && Core.v >= 1);
ok('Core.kofi：もとの一文と同じ形（class="note kofi"・応援先・任意の説明）', Core.kofi("役に立ったら", "新しいゲームづくり") === '<p class="note kofi">役に立ったら、<a href="https://ko-fi.com/satouaaaaa" target="_blank" rel="noopener">Ko-fi でコーヒー1杯の応援</a>をもらえると、新しいゲームづくりの励みになります（任意・遊ぶのはずっと無料）。</p>' && Core.KOFI === 'https://ko-fi.com/satouaaaaa');
{
  // 画面の切り替えは、単体の部品 template/screens/screens.js と game-core の中身が同じ（ほかのプロジェクトでも同じ物を使う。2026-11-23）
  const part = (t) => { const m = t.match(/\/\/ screens:begin[^\n]*\n([\s\S]*?)\n\s*\/\/ screens:end/); return m ? m[1] : null; };
  const one = readFileSync('template/screens/screens.js', 'utf8');
  ok('template/screens/screens.js と core.js の screens:begin〜end の中身が同じ（片方だけ直していない）', part(one) !== null && part(one) === part(src));
  const oneCode = one.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  ok('template/screens/screens.js が外へ通信しない・</script> と HTML のコメントが無い', !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(|EventSource/.test(oneCode) && !/<\/script|<!--|-->/i.test(one));
}
ok('Core.screens（画面の切り替え）がある・data-screen の無いページでは画面が無い', Core && Core.screens && typeof Core.screens.go === 'function' && Core.screens.list().length === 0 && Core.screens.now() === '');
ok('esc が & < > " \' を変える（属性の中でも切れない）', Core.esc(`a&b<c>"d'e`) === 'a&amp;b&lt;c&gt;&quot;d&#39;e');
ok('esc が null・数も文字にする', Core.esc(null) === '' && Core.esc(5) === '5');
ok('num が 0 以上の整数だけを返す', Core.num(3.7) === 3 && Core.num('4') === 4 && Core.num(-1) === 0 && Core.num('x') === 0 && Core.num(Infinity) === 0);
ok('num が配列・true・オブジェクト・空の文字を数にしない（#410）', Core.num([5]) === 0 && Core.num(true) === 0 && Core.num({}) === 0 && Core.num('') === 0 && Core.num(null) === 0);
ok('today は日本時間（UTC 14:00 は翌日の 23:00 でなく同じ日の 23:00）', Core.today() === '2026-11-21');
ok('prevDay・nextDay が月と年をまたぐ', Core.prevDay('2026-03-01') === '2026-02-28' && Core.nextDay('2026-12-31') === '2027-01-01' && Core.prevDay('2028-03-01') === '2028-02-29');
ok('md は先頭の0を付けない', Core.md('2026-01-05') === '1/5');
ok('dayNo は初日が1', Core.dayNo('2026-11-17', '2026-11-17') === 1 && Core.dayNo('2026-11-21', '2026-11-17') === 5);
ok('ymAdd が年をまたぐ', Core.ymAdd('2026-12', 1) === '2027-01' && Core.ymAdd('2026-01', -1) === '2025-12');
ok('untilNext が日本時間の0時までを出す（23:00 → 1時間0分）', Core.untilNext() === '1時間0分');
ok('連続：今日まだなら昨日から数える', Core.streak({ '2026-11-20': 1, '2026-11-19': 1, '2026-11-17': 1 }) === 2);
ok('連続：今日も入れる', Core.streak({ '2026-11-21': 1, '2026-11-20': 1 }) === 2);
ok('連続：無い・壊れた記録は0', Core.streak(null) === 0 && Core.streak({}) === 0 && Core.streak('x') === 0);
ok('連続：constructor などの名前を日に数えない', Core.streak(Object.assign(Object.create({ '2026-11-21': 1 }), {})) === 0);
Core.buzz(20);
ok('振動する（動きを減らすでないとき）', vib.length === 1 && vib[0] === 20);
{
  const d = fakeDom({ calm: true });
  d.Core.buzz(20);
  ok('「動きを減らす」のときは震わせない', d.vib.length === 0);
}
Core.toast('保存しました');
const live = made.find((m) => m.id === 'core-live');
ok('お知らせを読み上げにも届ける（role=status の場所に入る）', live && live.attrs.role === 'status' && live.textContent === '保存しました');
ok('お知らせの帯そのものは二重に読ませない（aria-hidden）', made.some((m) => m.className === 'toast core-toast' && m.attrs['aria-hidden'] === 'true'));
Core.saveWarn(true); Core.saveWarn(true);
ok('保存できない帯は1つだけ・role=alert', made.filter((m) => m.id === 'savewarn' && m.isConnected).length === 1 && made.find((m) => m.id === 'savewarn').attrs.role === 'alert');
Core.saveWarn(false);
ok('保存できたら帯を消す', !made.some((m) => m.id === 'savewarn' && m.isConnected));
{
  const u = new URL(Core.feedbackUrl({ game: '震度よみ', ver: 'shd-v12', screen: '練習', q: 't4|m1', kind: 'data' }));
  const g = (k) => u.searchParams.get(k);
  ok('感想フォーム：全ゲームで1つのフォームへ（事前入力の形）', u.origin === 'https://docs.google.com' && u.pathname.endsWith('/viewform') && g('usp') === 'pp_url');
  ok('感想フォーム：種類を押したボタンで選んだ状態にする', g('entry.241861188') === '問題・答え・出典のまちがい' && new URL(Core.feedbackUrl({})).searchParams.get('entry.241861188') === '感想');
  ok('感想フォーム：ゲーム名を入れる', g('entry.443796210') === '震度よみ');
  const info = g('entry.1094269478') || '';
  ok('感想フォーム：付属情報に版・画面・問題・大きさ・ブラウザ・日付・見やすさが入る', /版: shd-v12 \/ 共通部品 core \d/.test(info) && /画面: 練習/.test(info) && /問題: t4\|m1/.test(info) && /390x844/.test(info) && /Safari \/ iOS/.test(info) && /日付: 2026-11-21/.test(info) && /見やすさ: read/.test(info), info);
  ok('感想フォーム：内容（自由記入）は空のまま・名前やメールの欄を作らない', !u.searchParams.has('entry.1894161961') && !/mail|名前/.test(info));
  ok('感想フォーム：機種名や細かい版を入れない', !/iPhone OS 18_0|AppleWebKit|Mobile\/15E148/.test(info));
}
ok('Core.coach に start・stop・active がある', ['start', 'stop', 'leave', 'active'].every((k) => typeof Core.coach[k] === 'function'));

{
  // 写した中身（core・store・写すときに足す行）が、ゲームの QA の決まりにかからない（2026-11-22 incidents/2026-11-22-core-text-tripped-game-qa.md）
  //  - jobun-tobatsu など：行の途中の // のあとが ; { } ) で終わるとコードの途中と見る
  //  - funka-level など：写し元の言葉として、相談窓口の短い番号（188 など）を探す
  const { migrateCore } = await import('./sync-template.mjs');
  const added = migrateCore('<head></head><script>\nconst FEEDBACK = "x";\n</script>');
  for (const [f, t] of [['template/core/core.js', src], ['template/store/store.js', readFileSync('template/store/store.js', 'utf8')], ['migrateCore で足す行', added]]) {
    const bad = t.split('\n').map((l) => (l.match(/(?:^|\s)\/\/(?!\S*\.)(.*)$/) || [])[1]).filter((c) => c && /(;|\{|\}\)?|=>\s*\S+\))\s*$/.test(c.trim()));
    ok(`${f}：コメント // のあとを ; { } ) で終えない（${bad.slice(0, 2).join(' | ')}）`, bad.length === 0);
    //  - 多くのゲーム：写し元のゲームの名前（shindo など）が残っていないかを見る。共通部品にはゲームの名前を書かない
    const games = readFileSync('repos.txt', 'utf8').split('\n').filter((l) => /^[a-z]/.test(l)).map((l) => l.split(/\s+/)[0]).filter((n) => n.length > 3);
    const named = games.filter((n) => t.includes(n));
    ok(`${f}：ゲームの名前（repos.txt）を書かない（${named.join('・')}）`, named.length === 0);
    ok(`${f}：相談窓口の番号を書かない（188・189 は長い数の一部でも。110・118・119・171 は単独で）`, !/188|189|(?<!\d)(110|118|119|171)(?!\d)/.test(t));
  }
}
{
  // 枠の無い古い sw.js（FONT_CACHE などがあって写せない）でも、SHELL に transfer-qr.js を足す。2回かけても同じ（2026-11-22 batsu-doko）
  const { withQrShell } = await import('./sync-template.mjs');
  const sw = 'const CACHE = "x-v1";\nconst FONT_CACHE = "x-fonts";\nconst SHELL = ["./", "./index.html", "./transfer.js"];\n';
  const once = withQrShell(sw);
  ok('写せない sw.js にも SHELL に transfer-qr.js を足す・2回かけても同じ', once.includes('"./transfer.js", "./transfer-qr.js"]') && withQrShell(once) === once && once.includes('FONT_CACHE'));
}
// はじめての練習（migrateFirstPlay・migrateFirstQa）：ひな形の形のゲームにだけ足し、2回かけても同じ。QA の前提も替える
{
  const { migrateFirstPlay, migrateFirstQa } = await import('./sync-template.mjs');
  const game = '\nfunction home() {\n  if (!s.tut) openHow();\n}\nfunction practiceMenu() {\n  document.querySelectorAll(".lv button").forEach((b) => (b.onclick = () => startRun("p", +b.dataset.t)));\n}\nfunction startRun(mode, opt) {}\nfunction play() { a = `<div id="choices"></div><div class="verdict"></div><button id="next">`; }\n';
  const once = migrateFirstPlay(game);
  ok('migrateFirstPlay：はじめては firstPlay・練習の入り口の .lv button を押す・吹き出しは #choices と #next', once.includes('if (!s.tut) firstPlay();') && once.includes('document.querySelector(".lv button")') && once.includes('sel: "#choices"') && once.includes('wait: ".verdict"'));
  ok('migrateFirstPlay：2回かけても同じ', migrateFirstPlay(once) === once);
  const other = game.replace('startRun("p"', 'go("p"').replace('if (!s.tut) openHow();', 'if (!s.tut && !$("howto").open) openHow();') + '<button class="main" id="go-d">';
  const tip = migrateFirstPlay(other);
  ok('migrateFirstPlay：練習の入り口が無い形は、ホームのはじめのボタン（#go-d）に吹き出しを1つ・2回かけても同じ', tip.includes('if (!s.tut) firstPlay();') && tip.includes('sel: "#go-d"') && !tip.includes('practiceMenu();\n  const b') && migrateFirstPlay(tip) === tip);
  ok('migrateFirstPlay：はじめに遊び方を開かないゲームには足さない', migrateFirstPlay(other.replace('if (!s.tut && !$("howto").open) openHow();', '')) === other.replace('if (!s.tut && !$("howto").open) openHow();', ''));
  const qa = 'const check = (n, ok) => r.push(ok);\n  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);\n  await p.click("#howto-ok");\n  if (await q.locator("#howto[open]").count()) await q.click("#howto-ok");\n';
  const q1 = migrateFirstQa(qa);
  const q2 = migrateFirstQa('const check = (n, ok) => r.push(ok);\n  check("はじめて開くと遊び方が出る", await p.evaluate(() => document.getElementById("howto").open));\n  check("初めて開くと遊び方が出る", await p.isVisible("#howto"));\n  const shown = await p.evaluate(() => document.getElementById("howto").open);\n');
  const q3 = 'const check = (n, ok) => r.push(ok);\nconst firstClose = async (q) => {};\n    check("こわれた記録でも画面が出る", await p.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ v: 1 })); }));\n    check(`枠`, await pu.evaluate(() => document.activeElement && document.activeElement.id === "howto-ok"));\n    const x = await q.evaluate(() => { const d = document.getElementById("howto"); d.dispatchEvent(new Event("cancel")); });\n';
  const q4 = migrateFirstQa(q3);
  ok('migrateFirstQa：前に写したゲームにも、あとから足した書き換え（こわれた記録・開いたときの枠・Esc の保存）をかけ、2回かけても同じ', q4.includes('{ tut: true, v: 1 }') && q4.includes('await firstClose(pu).then(() => pu.evaluate(() => openHow()));\n    check(`枠`') && q4.includes('localStorage.clear(); const d') && migrateFirstQa(q4) === q4);
  ok('migrateFirstQa：evaluate・isVisible・shown の形も吹き出しを見る', !q2.includes('遊び方が出る"') && (q2.match(/core-coach/g) || []).length >= 3 && migrateFirstQa(q2) === q2);
  ok('migrateFirstQa：「わかった」は firstClose に・はじめての検査は吹き出しを見る・2回かけても同じ', q1.includes('const firstClose = async') && q1.includes('await firstClose(p);') && q1.includes('await firstClose(q);') && !q1.includes('click("#howto-ok")\n') && q1.includes('#core-coach").waitFor(') && migrateFirstQa(q1) === q1);
}
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ game-core（template/core/core.js）');
