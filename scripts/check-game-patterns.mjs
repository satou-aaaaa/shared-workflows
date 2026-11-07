// ゲームの作りの見分け（scripts/game-patterns.mjs）が、事故の形を見つけ、直した形・コメントに残った古い形では出さないかを確かめる（Lint）
// hint:cut-moves（ヒント2で消した選び肢が戻る）と stars:role（星の表示が読まれない・色だけで分ける）
import { cutMoves, starsBare } from './game-patterns.mjs';

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
if (bad) { console.error(`✗ ゲームの作りの見分けが ${bad} 件ちがう`); process.exit(1); }
console.log('✓ hint:cut-moves・stars:role の見分けが通った');
