// ワークフローの run: で、落ちたコマンドの終わりの番号を「code=$?」で後から拾っていないかを見る（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// GitHub Actions の run: は bash -e で動く（shell の既定 `bash -e {0}`。set -uo pipefail と書いても -e は残る）。
// そのため `log=$(cmd); code=$?` や `cmd` の次の行の `code=$?` は、cmd が落ちたその場で段ごと止まり、$? まで来ない。
// 拾うときは `code=0; log=$(cmd) || code=$?` の形にする（|| の左は -e で止まらない）。set +e の間は見ない。
// 2026-11-24 Common check（毎日の共通の点検）が、最初に決まりに外れたゲームを見つけたところで段ごと落ちた
// （incidents/2026-11-24-common-check-exit-code-under-bash-e.md）。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function findBad(text) {
  const bad = [];
  let eOn = true;
  text.split('\n').forEach((l, i) => {
    if (/^\s*(-\s+)?(name|run|uses):/.test(l)) eOn = true; // 段が替われば bash -e に戻る
    if (/^\s*set\s+\+e\b/.test(l)) eOn = false;
    if (/^\s*set\s+-[a-z]*e/.test(l)) eOn = true;
    if (!eOn || /^\s*#/.test(l)) return;
    if (/\$\?/.test(l) && !/\|\|/.test(l)) bad.push(i + 1);
  });
  return bad;
}

if (process.argv.includes('--self-test')) {
  const ok = 'run: |\n  code=0; log=$(node a.mjs 2>&1) || code=$?\n  node b.mjs || rc=$?\n';
  const ng1 = 'run: |\n  log=$(node a.mjs 2>&1); code=$?\n';
  const ng2 = 'run: |\n  node a.mjs > log\n  code=$?\n';
  const off = 'run: |\n  set +e\n  node a.mjs\n  code=$?\n  set -e\n';
  const back = 'run: |\n  set +e\n  x\n- name: b\n  run: |\n  node a.mjs\n  code=$?\n';
  if (findBad(ok).length || findBad(ng1).join() !== '2' || findBad(ng2).join() !== '3' || findBad(off).length || findBad(back).join() !== '7') {
    console.error('✗ check-exit-codes の自己検査が通らない'); process.exit(1);
  }
  console.log('✓ check-exit-codes 自己検査');
  process.exit(0);
}

let n = 0;
for (const dir of ['.github/workflows', 'template/.github/workflows']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
    const p = path.join(dir, f);
    for (const line of findBad(readFileSync(p, 'utf8'))) {
      console.error(`✗ ${p}:${line} run: は bash -e で動くので、落ちたコマンドのあとの $? までは来ない。code=0; x=$(cmd) || code=$? の形にする（incidents/2026-11-24-common-check-exit-code-under-bash-e.md）`);
      n++;
    }
  }
}
if (n) process.exit(1);
console.log('✓ run: の終わりの番号の拾い方');
