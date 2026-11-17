// ゲームの作りの見分け（scripts/game-patterns.mjs）が、事故の形を見つけ、直した形・コメントに残った古い形では出さないかを確かめる（Lint）
// depth:*（depth.js を写したのにつないでいない）・hint:cut-moves（ヒント2で消した選び肢が戻る）・hint:left-fixed（のこりの数が決まった数）・stars:role（星の表示が読まれない・色だけで分ける）・qa:url-includes（URL を includes で探して CodeQL が赤）
import { cutMoves, starsBare, leftFixed, urlIncludes, depthGaps, waitCounted, playerBugs, heightRaw } from './game-patterns.mjs';

const cases = [
  ['事故の形（1行・left.length - 1）', true, 'const cutOf = () => { if (cur.hints < 2) return []; const left = P.opts.map((_, i) => i).filter((i) => i !== P.ans && !cur.wrong.includes(i)); return left.slice(0, Math.max(0, left.length - 1)); };'],
  ['事故の形（left.slice(0, -1)）', true, 'const cutOf = () => { const left = idx.filter((i) => i !== ans && !cur.wrong.includes(i)); return left.slice(0, -1); };'],
  ['事故の形（複数行）', true, 'const cutOf = () => {\n  if (cur.hints < 2) return [];\n  const left = idx.filter((i) =>\n    i !== ans && !cur.wrong.includes(i));\n  return left.slice(0, left.length - 1);\n};'],
  ['事故の形（function）', true, 'function cutOf() {\n  const left = idx.filter((i) => i !== ans && cur.wrong.indexOf(i) < 0);\n  return left.slice(0, -1);\n}'],
  ['直した形', false, 'const cutOf = () => (cur.hints < 2 ? [] : P.opts.map((_, i) => i).filter((i) => i !== P.ans).slice(0, -1));'],
  ['直した形の前のコメントに古い形が残る', false, '// 前は const cutOf = () => { const left = idx.filter((i) => !cur.wrong.includes(i)); return left.slice(0, left.length - 1); };\n/* const cutOf = () => cur.wrong.includes(1) && x.length - 1; */\nconst cutOf = () => (cur.hints < 2 ? [] : idx.filter((i) => i !== ans).slice(0, -1));'],
  ['あとの別の関数の wrong.includes は見ない', false, 'const cutOf = () => idx.filter((i) => i !== ans).slice(0, -1);\nconst shown = () => idx.filter((i) => !cur.wrong.includes(i)).length - 1;'],
  ['cutOf が無い', false, 'const x = 1;'],
];
let bad = 0;
for (const [name, want, src] of cases) {
  const got = cutMoves(src);
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
const stars = [
  ['星：role も ☆ も無い形', true, 'const starStr = (s) => `<span class="stars" aria-label="星${s}つ">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;'],
  ['星：role はあるが取れない星も ★', true, 'const starStr = (s) => `<span class="stars" role="img" aria-label="星${s}つ">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;'],
  ['星：直した形', false, 'const starStr = (s) => `<span class="stars" role="img" aria-label="星${s}つ">${"★".repeat(s)}<span class="off" aria-hidden="true">${"☆".repeat(3 - s)}</span></span>`;'],
  ['星：コメントの古い形は見ない', false, '// 前は <span class="stars" aria-label="x">\nconst starStr = (s) => `<span class="stars" role="img" aria-label="星${s}つ">${"★".repeat(s)}${"☆".repeat(3 - s)}</span>`;'],
  ['星：星の表示が無い', false, 'const x = 1;'],
];
for (const [name, want, src] of stars) {
  const got = starsBare(src);
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
const left = [
  ['のこり：決まった数', true, 'const cutOf = () => (cur.hints < 2 ? [] : P.opts.filter((t) => t !== P.ans).slice(0, -1));\nconst m = "💡 ちがう選び肢を消しました。のこりは2つです。";'],
  ['のこり：いま押せる数', false, 'const cutOf = () => (cur.hints < 2 ? [] : P.opts.filter((t) => t !== P.ans).slice(0, -1));\nconst m = `のこりは${P.opts.filter((x) => !cutOf().includes(x) && !cur.wrong.includes(x)).length}つです。`;'],
  ['のこり：コメントの古い形は見ない', false, 'const cutOf = () => [];\n// 前は「のこりは2つです」'],
  ['のこり：cutOf の無いゲームは見ない', false, 'const m = "のこりは2つです";'],
];
for (const [name, want, src] of left) {
  const got = leftFixed(src);
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
const urls = [
  ['URL：includes で探す（CodeQL が赤）', true, 'check("出典がある", html.includes("https://laws.e-gov.go.jp/law/335M50004002003"));'],
  ['URL：indexOf で探す', true, "const ok = html.indexOf('https://www.caa.go.jp/') >= 0;"],
  ['URL：定義を正規表現で見る', false, 'check("出典がある", /const SRC = "https:\\/\\/laws\\.e-gov\\.go\\.jp\\/law\\/335M50004002003";/.test(html));'],
  ['URL：URL でない文字の includes は見ない', false, "const ok = html.indexOf('src=\"transfer.js\"') < html.indexOf('src=\"gen.js\"') && html.includes(\"https\");"],
  ['URL：ホスト名だけを includes で探す', true, 'const ok = html.includes("laws.e-gov.go.jp");'],
  ['URL：ホスト名とパスを indexOf で探す', true, "const ok = html.indexOf('ko-fi.com/satouaaaaa') >= 0;"],
  ['URL：ファイル名の includes は見ない', false, 'const ok = sw.includes("gen.js") && shell.includes("./icon-512.png") && html.includes("manifest.webmanifest");'],
  ['URL：コメントの古い形は見ない', false, '// 前は html.includes("https://example.jp/")\nconst x = 1;'],
];
for (const [name, want, src] of urls) {
  const got = urlIncludes(src);
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
const heights = [
  ['高さを丸めずに 44 とくらべる（動きの途中で 43.98 と測れる）', true, '.filter((b) => b.getBoundingClientRect().height < 44)'],
  ['丸めてくらべる', false, '.filter((b) => Math.round(b.getBoundingClientRect().height) < 44)'],
  ['44 でない数は見ない', false, 'r.getBoundingClientRect().height < 10'],
];
for (const [name, want, src] of heights) {
  const got = heightRaw(src);
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
const waits = [
  ['待つ回まで数える（遅い CI で尽きる）', true, 'for (let k = 0; k < 80 && !up; k++) {\n  const st = await p.evaluate(() => 1);\n  if (st.t !== "a") { await p.waitForTimeout(120); continue; }\n  await step1(p);\n}'],
  ['時間で区切る', false, 'const t0 = Date.now();\nfor (let k = 0; k < 80 && Date.now() - t0 < 9e4; k++) {\n  if (st.t !== "a") { await p.waitForTimeout(120); continue; }\n}'],
  ['手を打ったあとに待つ（待つだけの回ではない）', false, 'for (let k = 0; k < 3000; k++) {\n  if (await adOpen(p)) { await solve(p); await p.waitForTimeout(60); continue; }\n}'],
];
for (const [name, want, src] of waits) {
  const got = waitCounted(src).length > 0;
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want ? '出す' : '出さない'}）`);
  if (got !== want) bad++;
}
// 深さの部品：つないだ形では何も出さず、足りない所だけを出す（id の並びで見る）
const GOOD = {
  page: '<script src="transfer.js" data-game="g" data-keys="g-v1,g-depth"></script>\n<script src="depth.js" data-game="g" data-key="g-depth"></script>\n<script>Depth.setValid((t) => true); const a = Depth.sureHtml(); Depth.judge(true); Depth.mark(t, 1, "x"); function early() { Depth.mark(t, 1, "x"); } const l = Depth.due();</script>',
  sw: 'const CACHE = "g-v2";\nconst SHELL = ["./", "./index.html", "./transfer.js", "./depth.js"];',
  run: 'import { checkDepth } from "./depth-check.mjs";\nconst e = await checkDepth(src);',
};
const depthCases = [
  ['深さ：全部つないだ形', '', GOOD],
  ['深さ：depth.js を読んでいない', 'depth:script', { ...GOOD, page: GOOD.page.replace(/<script src="depth\.js"[^>]*><\/script>/, '') }],
  ['深さ：引き継ぎに復習の記録が無い', 'depth:keys', { ...GOOD, page: GOOD.page.replace('g-v1,g-depth', 'g-v1') }],
  ['深さ：setValid を呼ばない', 'depth:valid', { ...GOOD, page: GOOD.page.replace('Depth.setValid((t) => true); ', '') }],
  ['深さ：復習をつながない', 'depth:review', { ...GOOD, page: GOOD.page.replace(/Depth\.mark\(t, 1, "x"\); /g, '') }],
  ['深さ：解き終えたときしか復習に入れない', 'depth:early', { ...GOOD, page: GOOD.page.replace('function early() { Depth.mark(t, 1, "x"); } ', '') }],
  ['深さ：自信のボタンを出さない', 'depth:sure', { ...GOOD, page: GOOD.page.replace('const a = Depth.sureHtml(); ', '') }],
  ['深さ：SHELL に無い（コメントにだけある）', 'depth:sw', { ...GOOD, sw: 'const CACHE = "g-v2";\n// "./depth.js" も入れる\nconst SHELL = ["./", "./index.html", "./transfer.js"];' }],
  ['深さ：2段目のヒントが、まちがえた分け方を除いて消す', '', { ...GOOD, page: GOOD.page + '\n<script>const left2Of = () => GK.filter((x) => x !== cur.P.grp && !cur.w2.includes(x));\nconst cut2Of = () => (cur.h2 ? left2Of().slice(0, 1) : []);</script>' }],
  ['深さ：2段目のヒントが、まちがえた分け方も消す先に選ぶ', 'depth:hint2', { ...GOOD, page: GOOD.page + '\n<script>const cut2Of = () => (cur.h2 ? [GK.filter((x) => x !== cur.P.grp)[0]] : []); // w2 は見ない</script>' }],
  ['深さ：keep が same のあとで early・2段目も合わせる・続きから戻れる', '', { ...GOOD, page: GOOD.page + '\n<script>function keep() { let ok = false; const st0 = cur.step; save((s) => { const r = s.runs[MODE]; if (!same(r)) return; ok = true; cur.step = Math.max(cur.step, was.step || 1); }); if (ok) early(); if (ok && cur.step === 2 && st0 !== 2) setTimeout(() => askWhy(), 0); }\nconst h = `${s.runs.r ? `<button id="go-r">復習の続きから</button>` : rv ? `<button id="go-r">復習</button>` : ""}`;</script>' }],
  ['深さ：keep が same を確かめる前に early', 'depth:early-same', { ...GOOD, page: GOOD.page + '\n<script>function keep() { early(); save((s) => { const r = s.runs[MODE]; if (!same(r)) return; r.cur = cur; }); }</script>' }],
  ['深さ：keep が別のタブの2段目を合わせても画面を変えない', 'depth:step-sync', { ...GOOD, page: GOOD.page + '\n<script>function keep() { let ok = false; save((s) => { const r = s.runs[MODE]; if (!same(r)) return; ok = true; cur.step = Math.max(cur.step, was.step || 1); }); if (ok) early(); }</script>' }],
  ['深さ：復習のボタンが日の来た数だけで出る', 'depth:resume', { ...GOOD, page: GOOD.page + '\n<script>const h = `${rv ? `<button id="go-r">復習 ${rv}問</button>` : ""}`;</script>' }],
  ['深さ：QA が checkDepth を呼ばない（コメントにだけある）', 'depth:run', { ...GOOD, run: '// checkDepth(src) はあとで\nconst x = 1;' }],
];
for (const [name, want, files] of depthCases) {
  const got = depthGaps(files).map((x) => x[0]).join();
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want || '出さない'}${got === want ? '' : ` ← ${got || 'なし'}`}）`);
  if (got !== want) bad++;
}

// 遊ぶ人が困る作り（playerBugs）：事故の形だけを出し、直した形・コメントの中の古い形では出さない（id の並びで見る）
const HOWTO_OK = '$("howto-ok").onclick = () => { save((s) => { s.tut = true; }); $("howto").close(); };\n$("howto").addEventListener("close", () => { if (!load().tut) save((s) => { s.tut = true; }); });\n$("howto").addEventListener("cancel", () => { if (!load().tut) save((s) => { s.tut = true; }); });';
const bugCases = [
  ['困る作り：直した形', '', 'function save(fn) { try { localStorage.setItem(KEY, j); mem = null; saveWarn(false); } catch (e) { mem = j; saveWarn(true); } }\n$("quit").onclick = () => finish();\n' + HOWTO_OK],
  ['困る作り：保存に失敗しても黙る', 'save:silent', 'function save(fn) { try { localStorage.setItem(KEY, j); mem = null; } catch (e) { mem = j; } }'],
  ['困る作り：正解の直後に降りられない', 'endless:stuck', 'if ($("quit")) $("quit").onclick = () => { if (cur && cur.done) return; finish(); };'],
  ['困る作り：endFinish の形でも降りられない', 'endless:stuck', 'if ($("quit")) $("quit").onclick = () => { if (cur && cur.done) return; endFinish(); };'],
  ['困る作り：正解したらボタンを隠す', 'endless:stuck', 'if ($("hint")) $("hint").disabled = true; if ($("quit")) $("quit").hidden = true;'],
  ['困る作り：降りる前に保存を挟んでも、正解の直後に止める', 'endless:stuck', 'if ($("quit")) $("quit").onclick = () => { if (cur && cur.done) return; save((s2) => { s2.runs.e.over = true; }); finish(); };'],
  ['困る作り：ボタンを出し直すのは困らない', '', 'if ($("quit")) $("quit").hidden = false;'],
  ['困る作り：コメントの古い形は見ない', '', '// 前は catch (e) { mem = j; } と if (cur && cur.done) return; finish(); だった\nconst x = 1;'],
  ['困る作り：モードの鍵', 'free:gate', '<button id="go-e">🔗 連戦（今日の5体に出会うと開く）</button>'],
  ['困る作り：コメントの「押すと開く」は鍵ではない', '', '// 引き継ぎ（transfer.js）は data-hk を押すと開く\nconst x = 1;'],
  ['困る作り：遊び方を Esc で閉じると残らない', 'howto:close', '$("howto-ok").onclick = () => { save((s) => { s.tut = true; }); $("howto").close(); };'],
  ['困る作り：出典のリンクが44pxより低い', 'tap:low-link', '<style>.note a,.src a{min-height:44px} .src a{min-height:32px;padding:6px 0}</style>'],
  ['困る作り：リンクが44pxなら困らない', '', '<style>.src a{min-height:44px;padding:6px 0} .btn{min-height:30px}</style>'],
  ['困る作り：知らせがボタンの上で押すのを止める', 'toast:blocks', '<style>.toast{position:fixed;left:50%;bottom:24px;z-index:9}</style>'],
  ['困る作り：知らせは押すのを通す', '', '<style>.toast{pointer-events:none;position:fixed;left:50%;bottom:24px}</style>'],
  ['困る作り：CSS のコメントの古い形は見ない', '', '<style>/* .toast{position:fixed} */ .toast{position:fixed;pointer-events:none}</style>'],
  ['困る作り：終えたとことんが読み直しで戻る', 'endless:revive', 'if (!x || !y) { const r = x || y; if (!r || bank(s, r) || doneOf(r)) continue; }'],
  ['困る作り：空白がちがっても終えたとことんが戻る形を見分ける', 'endless:revive', 'if (!r || bank( s, r ) || doneOf( r )) continue;'],
  ['困る作り：終えたとことんは戻さない', '', 'if (!x || !y) { const r = x || y; if (!r || bank(s, r) || doneOf(r) || (r.mode === "e" && n.runs[m] === null)) continue; }'],
  ['困る作り：cancel が無い', 'howto:close', HOWTO_OK.split('\n').slice(0, 2).join('\n')],
];
for (const [name, want, src] of bugCases) {
  const got = playerBugs(src).map((x) => x[0]).join();
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want || '出さない'}${got === want ? '' : ` ← ${got || 'なし'}`}）`);
  if (got !== want) bad++;
}
// check-game-new.mjs：もとからあるものは通し、新しく持ち込んだものだけで落とす
{
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const d = mkdtempSync(join(tmpdir(), 'gnew-'));
  const SILENT = 'function save(fn) { try { localStorage.setItem(K, j); } catch (e) { mem = j; } }';
  const GOODSAVE = 'function save(fn) { try { localStorage.setItem(K, j); saveWarn(false); } catch (e) { mem = j; saveWarn(true); } }';
  const STUCK = '$("quit").onclick = () => { if (cur && cur.done) return; finish(); };';
  const run = (base, head) => {
    const b = join(d, 'base.html'), h = join(d, 'head.html');
    if (base != null) writeFileSync(b, base); writeFileSync(h, head);
    try { execFileSync('node', [new URL('./check-game-new.mjs', import.meta.url).pathname, base != null ? b : join(d, 'none.html'), h], { stdio: 'pipe' }); return 0; } catch (e) { return e.status; }
  };
  const newCases = [
    ['新しく持ち込む：もとからあるだけなら通す', 0, run(SILENT, SILENT + '\nconst y = 2;')],
    ['新しく持ち込む：別の困る作りを足したら落とす', 1, run(SILENT, SILENT + '\n' + STUCK)],
    ['新しく持ち込む：新作（main に無い）は全部見る', 1, run(null, SILENT)],
    ['新しく持ち込む：直した PR は通す', 0, run(SILENT, GOODSAVE)],
  ];
  for (const [name, want, got] of newCases) {
    console.log(`${got === want ? '✓' : '✗'} ${name}（終わりの数 ${want}${got === want ? '' : ` ← ${got}`}）`);
    if (got !== want) bad++;
  }
}
if (bad) { console.error(`✗ ゲームの作りの見分けが ${bad} 件ちがう`); process.exit(1); }
console.log('✓ hint:cut-moves・hint:left-fixed・stars:role・qa:url-includes・depth:*・遊ぶ人が困る作り（playerBugs・check-game-new）の見分けが通った');
