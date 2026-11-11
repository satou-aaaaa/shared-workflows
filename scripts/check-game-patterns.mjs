// ゲームの作りの見分け（scripts/game-patterns.mjs）が、事故の形を見つけ、直した形・コメントに残った古い形では出さないかを確かめる（Lint）
// depth:*（depth.js を写したのにつないでいない）・hint:cut-moves（ヒント2で消した選び肢が戻る）・hint:left-fixed（のこりの数が決まった数）・stars:role（星の表示が読まれない・色だけで分ける）・qa:url-includes（URL を includes で探して CodeQL が赤）
import { cutMoves, starsBare, leftFixed, urlIncludes, depthGaps } from './game-patterns.mjs';

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
// 深さの部品：つないだ形では何も出さず、足りない所だけを出す（id の並びで見る）
const GOOD = {
  page: '<script src="transfer.js" data-game="g" data-keys="g-v1,g-depth"></script>\n<script src="depth.js" data-game="g" data-key="g-depth"></script>\n<script>Depth.setValid((t) => true); const a = Depth.sureHtml(); Depth.judge(true); Depth.mark(t, 1, "x"); const l = Depth.due();</script>',
  sw: 'const CACHE = "g-v2";\nconst SHELL = ["./", "./index.html", "./transfer.js", "./depth.js"];',
  run: 'import { checkDepth } from "./depth-check.mjs";\nconst e = await checkDepth(src);',
};
const depthCases = [
  ['深さ：全部つないだ形', '', GOOD],
  ['深さ：depth.js を読んでいない', 'depth:script', { ...GOOD, page: GOOD.page.replace(/<script src="depth\.js"[^>]*><\/script>/, '') }],
  ['深さ：引き継ぎに復習の記録が無い', 'depth:keys', { ...GOOD, page: GOOD.page.replace('g-v1,g-depth', 'g-v1') }],
  ['深さ：setValid を呼ばない', 'depth:valid', { ...GOOD, page: GOOD.page.replace('Depth.setValid((t) => true); ', '') }],
  ['深さ：復習をつながない', 'depth:review', { ...GOOD, page: GOOD.page.replace('Depth.mark(t, 1, "x"); ', '') }],
  ['深さ：自信のボタンを出さない', 'depth:sure', { ...GOOD, page: GOOD.page.replace('const a = Depth.sureHtml(); ', '') }],
  ['深さ：SHELL に無い（コメントにだけある）', 'depth:sw', { ...GOOD, sw: 'const CACHE = "g-v2";\n// "./depth.js" も入れる\nconst SHELL = ["./", "./index.html", "./transfer.js"];' }],
  ['深さ：QA が checkDepth を呼ばない（コメントにだけある）', 'depth:run', { ...GOOD, run: '// checkDepth(src) はあとで\nconst x = 1;' }],
];
for (const [name, want, files] of depthCases) {
  const got = depthGaps(files).map((x) => x[0]).join();
  console.log(`${got === want ? '✓' : '✗'} ${name}（${want || '出さない'}${got === want ? '' : ` ← ${got || 'なし'}`}）`);
  if (got !== want) bad++;
}
if (bad) { console.error(`✗ ゲームの作りの見分けが ${bad} 件ちがう`); process.exit(1); }
console.log('✓ hint:cut-moves・hint:left-fixed・stars:role・qa:url-includes・depth:* の見分けが通った');
