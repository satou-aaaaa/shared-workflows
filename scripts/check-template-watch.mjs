// ひな形の ci-failure-issue.yml が、ひな形の中で main に動くワークフロー（schedule・push）を全部見張っているかを調べる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// きっかけ: 2026-11-07 ひな形の見張りの一覧に Setup check（月1）が無く、main で落ちても Issue が立たなかった（incidents/2026-11-07-game-template-review-gaps.md）。
// 写した先のリポジトリは drift-check.mjs が同じことを見る（無くてよい名前の一覧 UNWATCHED もそちらと同じにする）。
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'template/.github/workflows';
const UNWATCHED = ['CI failure issue', 'Branch cleanup', 'Labels', 'CodeQL', 'Scorecard', 'Weekly summary'];
const drift = readFileSync('scripts/drift-check.mjs', 'utf8');
const live = (f) => readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const list = (live('ci-failure-issue.yml').match(/^\s*workflows:\s*\[(.*)\]/m) || [])[1];
if (!list) { console.error('✗ template の ci-failure-issue.yml に workflows: [...] の1行が無い'); process.exit(1); }
const watched = list.split(',').map((x) => x.trim().replace(/^["']|["']$/g, ''));
const errors = [];
for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  const t = live(f);
  const name = (t.match(/^name:\s*["']?(.+?)["']?\s*$/m) || [])[1];
  if (!name || !/^\s*(schedule|push):/m.test(t) || UNWATCHED.includes(name)) continue;
  if (!watched.includes(name)) errors.push(`${f}（${name}）が main で動くのに、ci-failure-issue.yml の workflows: に無い`);
}
if (!drift.includes(`const UNWATCHED = ${JSON.stringify(UNWATCHED).replace(/"/g, "'").replace(/,/g, ', ')};`)) errors.push('drift-check.mjs の UNWATCHED がこのファイルの一覧とちがう（両方を同じにする）');
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ ひな形の見張りの一覧に、main で動くワークフローがそろっている');
