// ひな形の ci-failure-issue.yml が、ひな形の中で main に動くワークフロー（schedule・push）を全部見張っているかを調べる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// ほかに：自動マージのあと main で起こすもの・Dependabot の major をどちらのマージの道でも外すか・公開後の確認が main の先頭の版だけを last-good にするか（2026-11-17）。
// きっかけ: 2026-11-07 ひな形の見張りの一覧に Setup check（月1）が無く、main で落ちても Issue が立たなかった（incidents/2026-11-07-game-template-review-gaps.md）。
// あわせて、自動マージのきっかけで main の push でも動くワークフローを、automerge.yml の dispatch: で main で起こすかも見る（2026-11-17）。
// 写した先のリポジトリは drift-check.mjs が同じことを見る（無くてよい名前の一覧 UNWATCHED もそちらと同じにする）。
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

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
  // 値が引用符でくくってあっても読む（"a.yml b.yml" と a.yml b.yml は同じ設定。行末のコメントは外す）
  const rawDisp = ((am.match(/^\s*dispatch:\s*(.*)$/m) || [])[1] || '').replace(/\s+#.*$/, '').trim();
  const disp = rawDisp.replace(/^(["'])(.*)\1$/, '$2').split(/\s+/).filter(Boolean);
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
// 手順の run: を取り出し、git と gh を作り物にして本当に動かす（先頭と同じ版なら tag を書き、違えば書かない）
{
  const pd = readFileSync('.github/workflows/post-deploy.yml', 'utf8').split('\n');
  const at = pd.findIndex((l) => /^\s*- name: 正常なら last-good として覚える\s*$/.test(l));
  let script = '';
  if (at >= 0) {
    const r = pd.findIndex((l, k) => k > at && /^\s*run: \|\s*$/.test(l));
    const ind = r >= 0 ? pd[r].match(/^\s*/)[0].length + 2 : 0;
    const body = [];
    for (let k = r + 1; r >= 0 && k < pd.length; k++) {
      if (pd[k].trim() && pd[k].match(/^\s*/)[0].length < ind) break;
      body.push(pd[k].slice(ind));
    }
    script = body.join('\n');
  }
  if (!script) errors.push('.github/workflows/post-deploy.yml に「正常なら last-good として覚える」の run: が無い（名前を変えたらこの検査も直す）');
  else {
    const dir = mkdtempSync(join(tmpdir(), 'pd-'));
    writeFileSync(join(dir, 'git'), '#!/bin/sh\nif [ "$1" = rev-parse ]; then echo "$FAKE_HEAD"; fi\nexit 0\n', { mode: 0o755 });
    writeFileSync(join(dir, 'gh'), '#!/bin/sh\necho "$*" >> "$GH_LOG"\necho "$SHA"\n', { mode: 0o755 });
    writeFileSync(join(dir, 'step.sh'), script);
    const runStep = (head) => {
      const log = join(dir, `gh-${head}.log`);
      writeFileSync(log, '');
      spawnSync('bash', [join(dir, 'step.sh')], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, SHA: 'aaaa', R: 'o/r', FAKE_HEAD: head, GH_LOG: log, GITHUB_STEP_SUMMARY: join(dir, 'summary') }, encoding: 'utf8' });
      return readFileSync(log, 'utf8');
    };
    if (!/refs\/tags\/last-good|git\/refs/.test(runStep('aaaa'))) errors.push('post-deploy.yml の「正常なら last-good として覚える」が、main の先頭と同じ版なのに last-good を書かない');
    if (/refs\/tags\/last-good|git\/refs/.test(runStep('bbbb'))) errors.push('post-deploy.yml の「正常なら last-good として覚える」が、main の先頭とちがう版（古い版の再実行）でも last-good を書く');
    rmSync(dir, { recursive: true, force: true });
  }
}
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ ひな形の見張りの一覧・自動マージのあとに起こすもの・Dependabot の major・last-good の覚え方がそろっている');
