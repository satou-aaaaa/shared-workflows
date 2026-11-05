// 全リポジトリを見るはずの一覧が、drift-check.mjs の REPOS（公開リポジトリ全部）から抜けていないかを調べる（Claude は使わない）。
// きっかけ: 2026-11-05 CI time report の REPOS が最初の6つのままで、ゲーム15本の CI 時間が集計に入っていなかった
// （incidents/2026-11-05-ci-time-report-missing-repos.md）。新しいリポジトリを drift-check に足したら、ここが落ちて気づける。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const listOf = (text, re, where) => {
  const m = text.match(re);
  if (!m) { console.error(`✗ ${where} の REPOS が見つからない`); process.exit(1); }
  return m[1].split(/\s+/).filter(Boolean);
};
const all = listOf(read('scripts/drift-check.mjs'), /process\.env\.REPOS \|\| '([^']+)'/, 'scripts/drift-check.mjs');
// 全部を見るはずの一覧（足すときはここにも足す）
const targets = [
  ['.github/workflows/ci-time-report.yml', /^\s*REPOS:\s*(.+)$/m],
];
let bad = 0;
for (const [file, re] of targets) {
  const have = new Set(listOf(read(file), re, file));
  const missing = all.filter((r) => !have.has(r));
  if (missing.length) { console.error(`✗ ${file} の REPOS に無い: ${missing.join(' ')}`); bad++; }
}
if (bad) process.exit(1);
console.log('✓ 全リポジトリの一覧がそろっている');
