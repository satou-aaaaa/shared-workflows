// リンク検査が読み違える URL の見分け（scripts/link-text.mjs）が、事故の形を見つけ、正しい書き方では出さないかを確かめる（Lint）
// 2026-11-07 rosen-hitofude・seiza-tsunagi の Link check が「Ko-fi（https://…）へ」で落ちた（incidents/2026-11-08-link-check-wide-char-after-url.md）
import { bareUrls, linkFiles, checkedMd } from './link-text.mjs';

const cases = [
  ['事故の形（全角かっこの中）', 1, '- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。'],
  ['事故の形（句点）', 1, '公開: https://satou-aaaaa.github.io/x/。'],
  ['<> で囲む', 0, '- 応援は Ko-fi（<https://ko-fi.com/satouaaaaa>）へのただのリンクだけ。'],
  ['[名前](URL)', 0, '応援は [Ko-fi](https://ko-fi.com/satouaaaaa)（遊ぶのは無料）。'],
  ['後ろに空白', 0, 'Ko-fi（https://ko-fi.com/satouaaaaa ）へ'],
  ['`コード` の中', 0, '`https://ko-fi.com/satouaaaaa）へ` は見ない'],
  ['``` の塊の中', 0, '```\nhttps://ko-fi.com/satouaaaaa）へ\n```'],
  ['行の番号', 3, 'a\n```\nx\n```\nhttps://a.example/）へ'],
];
let bad = 0;
for (const [name, want, src] of cases) {
  const h = bareUrls(src);
  const got = name === '行の番号' ? (h[0]?.line === 5 ? 3 : -1) : h.length;
  console.log(`${got === want ? '✓' : '✗'} ${name}`);
  if (got !== want) bad++;
}
const files = [
  ['files: の既定は *.html', '*.html', 'jobs:\n  check:\n    uses: x\n'],
  ['files: を読む', '*.html README.md', "    with:\n      files: '*.html README.md'\n"],
];
for (const [name, want, yml] of files) {
  const got = linkFiles(yml).join(' ');
  console.log(`${got === want ? '✓' : '✗'} ${name}`);
  if (got !== want) bad++;
}
const md = checkedMd(['*.html', '*.md'], ['AGENTS.md', 'README.md', 'docs/a.md', 'index.html']).join(' ');
const md2 = checkedMd(['*.html', 'README.md'], ['AGENTS.md', 'README.md']).join(' ');
for (const [name, ok] of [['*.md は直下の .md だけ', md === 'AGENTS.md README.md'], ['README.md だけ', md2 === 'README.md']]) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) bad++;
}
if (bad) { console.error(`✗ link-text の見分けが ${bad} 件まちがえた`); process.exit(1); }
