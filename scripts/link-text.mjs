// リンク検査（lychee）が読み違える URL の書き方を見つける（Claude は使わない）。
// Markdown の地の文の URL のすぐ後ろに全角の字（）・。・ひらがな など）が続くと、lychee はそこまで URL と読み、404 で落ちる。
// 例: 「Ko-fi（https://ko-fi.com/satouaaaaa）へのリンク」→ https://ko-fi.com/satouaaaaa）へのリンク… を調べる
// （incidents/2026-11-08-link-check-wide-char-after-url.md）。<https://…> か [名前](https://…) で書けば読み違えない。
// 使い方: node scripts/link-text.mjs [リポジトリのフォルダ]
//   そのリポジトリの .github/workflows/link-check.yml の files（無ければ共通部品の既定 *.html）に入る .md を調べる。
//   game-qa.yml が PR ごとに、drift-check.mjs が週1で全リポジトリに回す。
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 地の文の URL（直前が ( や < でない）で、空白や < > ] を挟まずに ASCII 以外の字が続くもの（文字の組は < > ] を除く ASCII の見える字）
const BARE = /(?<![(<\w])https?:\/\/[!-;=?-\\^-~]*[^\x00-\x7f]/gu;

// コードの中（``` の塊と `…`）は lychee も調べないので除く。行の番号は残す
function stripCode(md) {
  return md
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, (b) => b.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (b) => ' '.repeat(b.length));
}

// [{ line, text }]（text は URL と、続いた1字）
export function bareUrls(md) {
  const out = [];
  stripCode(md).split('\n').forEach((l, i) => {
    for (const m of l.matchAll(BARE)) out.push({ line: i + 1, text: m[0] });
  });
  return out;
}

// link-check の呼び出しの files（空白区切りの glob）。書いていなければ共通部品の既定
export function linkFiles(yml) {
  const m = yml.match(/^\s*files:\s*["']?([^"'\n#]*)["']?/m);
  return (m ? m[1] : '*.html').trim().split(/\s+/).filter(Boolean);
}

// lychee の glob のうち、ここで使うもの（* と ?、/ をまたがない）
const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
export function checkedMd(files, paths) {
  const res = files.map(globRe);
  return [...paths].filter((p) => p.endsWith('.md') && res.some((r) => r.test(p))).sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || '.';
  const wf = join(dir, '.github', 'workflows', 'link-check.yml');
  if (!existsSync(wf)) { console.log('link-check.yml が無いので見ない'); process.exit(0); }
  const paths = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\n').filter(Boolean);
  let bad = 0;
  for (const p of checkedMd(linkFiles(readFileSync(wf, 'utf8')), paths)) {
    for (const h of bareUrls(readFileSync(join(dir, p), 'utf8'))) {
      console.log(`::error file=${p},line=${h.line}::URL のすぐ後ろに全角の字があり、リンク検査がそこまで URL と読んで落ちる（${h.text}）。<https://…> か [名前](https://…) で書く`);
      bad++;
    }
  }
  if (bad) process.exit(1);
  console.log('✓ リンク検査が読み違える URL は無い');
}
