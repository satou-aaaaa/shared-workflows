// ひな形の ci-failure-issue.yml が、ひな形の中で main に動くワークフロー（schedule・push）を全部見張っているかを調べる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// ほかに：自動マージのあと main で起こすもの・Dependabot の major をどちらのマージの道でも外すか・公開後の確認が main の先頭の版だけを last-good にするか（2026-11-17）。
// きっかけ: 2026-11-07 ひな形の見張りの一覧に Setup check（月1）が無く、main で落ちても Issue が立たなかった（incidents/2026-11-07-game-template-review-gaps.md）。
// あわせて、自動マージのきっかけで main の push でも動くワークフローを、automerge.yml の dispatch: で main で起こすかも見る（2026-11-17）。
// 写した先のリポジトリは drift-check.mjs が同じことを見る（無くてよい名前の一覧 UNWATCHED もそちらと同じにする）。
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'template/.github/workflows';
const UNWATCHED = ['CI failure issue', 'Scorecard', 'Weekly summary'];
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
// 自動マージのきっかけのワークフローで main の push でも動くものは、マージのあと main で起こす（recheck_main: false のとき）。
// GITHUB_TOKEN のマージでは main の push で動かないので、起こさないと main の失敗の Issue が古いまま残る（2026-11-17 hatsuden-kurabe #1 の CodeRabbit、Secret scan が抜けていた）
{
  const am = live('automerge.yml');
  const trig = ((am.match(/^\s*workflows:\s*\[(.*)\]/m) || [])[1] || '').split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const disp = ((am.match(/^\s*dispatch:\s*(.*)$/m) || [])[1] || '').split(/\s+/).filter(Boolean);
  if (/recheck_main:\s*false/.test(am)) {
    for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
      const t = live(f);
      const name = (t.match(/^name:\s*["']?(.+?)["']?\s*$/m) || [])[1];
      if (!trig.includes(name) || !/^\s*push:/m.test(t)) continue;
      if (!disp.includes(f)) errors.push(`automerge.yml のきっかけの ${name}（${f}）は main の push で動くのに、dispatch: に無い（自動マージのあと main で動かない）`);
      if (!/^\s*workflow_dispatch:/m.test(t)) errors.push(`${f}（${name}）に workflow_dispatch が無い（自動マージのあと main で起こせない）`);
    }
  }
}
// Dependabot の major 更新は、どちらのマージの道（Dependabot auto-merge の予約・Auto merge）でも自動でマージしない（2026-11-17 hatsuden-kurabe #1 の CodeRabbit）
for (const f of ['.github/workflows/automerge.yml', '.github/workflows/dependabot-automerge.yml']) {
  const t = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  if (!t.includes('version-update:semver-major')) errors.push(`${f} が Dependabot の major 更新（version-update:semver-major）を自動マージから外していない`);
}
// 公開後の確認は、main の先頭の版のときだけ last-good を覚える（古い版の再実行で、壊れた版を last-good にしない。2026-11-17 nenkin-shikumi #1 の CodeRabbit）
{
  const pd = readFileSync('.github/workflows/post-deploy.yml', 'utf8');
  const step = (pd.split(/^\s*- name: 正常なら last-good として覚える\s*$/m)[1] || '').split(/^\s*- name: /m)[0];
  if (!step) errors.push('.github/workflows/post-deploy.yml に「正常なら last-good として覚える」の手順が無い（名前を変えたらこの検査も直す）');
  else if (!/git fetch[^\n]*origin main/.test(step) || !/\[ "\$head" != "\$SHA" \]/.test(step) || step.search(/\$head" != "\$SHA"/) > step.search(/refs\/tags\/last-good/)) errors.push('.github/workflows/post-deploy.yml の「正常なら last-good として覚える」が、last-good を書く前に origin/main の先頭と SHA を比べていない');
}
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ ひな形の見張りの一覧・自動マージのあとに起こすもの・Dependabot の major・last-good の覚え方がそろっている');
