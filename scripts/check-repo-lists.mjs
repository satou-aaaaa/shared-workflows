// リポジトリの一覧（repos.txt）が1か所にまとまっているかを調べる（Lint・check.sh から呼ぶ。Claude は使わない）。
// 調べること:
//   1. repos.txt の行が「名前 種類」の形で、名前の ABC 順・重なりなし（並行の PR が同じ所に足さず、ぶつかりにくい）
//   2. ワークフロー・スクリプト・README・手順書に、リポジトリの名前を並べた一覧（1行に6つ以上）が残っていない（一覧は repos.txt だけ）
//   3. repos.txt の game が、routines/project-practices.md の「ゲーム」の表に1行ずつあり、その表が名前の順
// きっかけ: 2026-11-05 CI time report の一覧だけ古かった（incidents/2026-11-05-ci-time-report-missing-repos.md）。
// 2026-11-07 一覧が7か所に分かれていて、新作を足す PR どうしが毎回ぶつかった（incidents/2026-11-07-repo-list-conflicts.md）。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRepos, REPOS_FILE } from './repos.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const errors = [];

// 1. repos.txt の形と並び
const { repos, problems } = parseRepos(readFileSync(REPOS_FILE, 'utf8'));
errors.push(...problems);
const seen = new Set();
repos.forEach((r, i) => {
  if (seen.has(r.name)) errors.push(`repos.txt ${r.line}行目: ${r.name} が2回ある`);
  seen.add(r.name);
  const prev = repos[i - 1];
  if (prev && prev.name > r.name) errors.push(`repos.txt ${r.line}行目: ${r.name} は ${prev.name} より前に入れる（名前の ABC 順。末尾に足すと並行の PR がぶつかる）`);
});
if (seen.has('shared-workflows')) errors.push('repos.txt に shared-workflows を書かない（要るワークフローが足す）');

// 2. ほかのファイルに一覧を書いていないか（incidents/ は起きたことの記録なので見ない）
const names = new Set(repos.map((r) => r.name));
const files = [
  'README.md', 'AGENTS.md',
  ...['.github/workflows', 'scripts', 'routines', 'bootstrap'].flatMap((d) => (existsSync(join(root, d)) ? readdirSync(join(root, d)).map((f) => `${d}/${f}`) : [])),
].filter((p) => /\.(md|ya?ml|mjs|js|sh)$/.test(p) && p !== 'scripts/check-repo-lists.mjs');
for (const p of files) {
  read(p).split('\n').forEach((line, i) => {
    const hit = new Set((line.match(/[a-z0-9][a-z0-9-]*[a-z0-9]/g) || []).filter((w) => names.has(w)));
    if (hit.size >= 6) errors.push(`${p}:${i + 1}: リポジトリの名前を ${hit.size} 個並べている。一覧は repos.txt だけに置き、ここは repos.txt を指す（読むなら node scripts/repos.mjs）`);
  });
}

// 3. ゲームの表
const pp = read('routines/project-practices.md');
const sec = pp.split(/^### ゲーム\s*$/m)[1]?.split(/^##/m)[0];
if (!sec) errors.push('routines/project-practices.md に「### ゲーム」の表が無い');
else {
  const rows = [...sec.matchAll(/^\| ([a-z0-9-]+)（/gm)].map((m) => m[1]);
  rows.forEach((n, i) => { if (i && rows[i - 1] > n) errors.push(`routines/project-practices.md「ゲーム」の表: ${n} は ${rows[i - 1]} より前に入れる（名前の ABC 順）`); });
  const have = new Set(rows);
  for (const r of repos.filter((x) => x.kind === 'game')) if (!have.has(r.name)) errors.push(`routines/project-practices.md「ゲーム」の表に ${r.name} の行が無い`);
  for (const n of rows) if (!repos.some((x) => x.name === n && x.kind === 'game')) errors.push(`routines/project-practices.md「ゲーム」の表の ${n} が repos.txt に game として無い`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ リポジトリの一覧は repos.txt の1か所（${repos.length} 件・名前の順）`);
