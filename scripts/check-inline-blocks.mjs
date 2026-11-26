// index.html の <script> に包んで写すひな形（template/ の下の .js 全部）に、写しを途中で切る文字が無いかを見る（check.sh と CI の Lint が呼ぶ）。
// 2026-11-26 kiroku.js の説明のコメントに </script> を書き、写したゲームで部品の中身が画面に出た（手元の QA で見つけた。check-core.mjs は core.js しか見ていなかった）。
// 写す部品は scripts/sync-template.mjs の「<script …>\n${tpl('…')}</script>」の形から拾うので、新しい部品を足しても、ここが自動で見る。
import { readFileSync } from 'node:fs';

const sync = readFileSync('scripts/sync-template.mjs', 'utf8');
const files = [...new Set([...sync.matchAll(/<script[^>]*>\\n\$\{tpl\('([^']+)'\)\}<\/script>/g)].map((m) => `template/${m[1]}`))];
const bad = [];
if (files.length < 3) bad.push(`写す部品を ${files.length} 個しか拾えない（sync-template.mjs の書き方が変わった。ここの拾い方を直す）`);
for (const p of files) {
  const s = readFileSync(p, 'utf8');
  if (/<\/script/i.test(s)) bad.push(`${p} に </script> がある（index.html に写すとそこで切れ、残りが画面に出る。<\\/script と書くか言いかえる）`);
  if (/<!--/.test(s)) bad.push(`${p} に <!-- がある（写しの区切り xx:begin〜end を取りちがえる・<script> の中で <!-- と <script が続くと切れ目がずれる）`);
}
if (bad.length) { console.error(bad.map((b) => `✗ ${b}`).join('\n')); process.exit(1); }
console.log(`✓ index.html に写す部品 ${files.length} 個（${files.join('・')}）に </script>・<!-- が無い`);
