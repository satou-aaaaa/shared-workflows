// actions/upload-artifact の段に continue-on-error を必ず書かせる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 見返す用の控え（QA の結果など）は true：GitHub の置き場が時間切れになっても、通った検査を赤にしない。
// 成果そのもの（取ったページなど）は false：置けなければ失敗にする。どちらかを決めて書く。
// 2026-11-22 医療費いくらの QA が172項目すべて通ったのに、控えの置き場の ETIMEDOUT で赤になり ci-failure の Issue が立った
// （incidents/2026-11-22-qa-flaky-coach-and-upload.md）。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function findMissing(text) {
  const lines = text.split('\n'), bad = [];
  lines.forEach((l, i) => {
    if (!/uses:\s*actions\/upload-artifact@/.test(l)) return;
    // 段の始まり（「- 」の行）と終わり（同じ深さの次の「- 」か、浅い行）を探す
    let s = i; while (s > 0 && !/^\s*- /.test(lines[s])) s--;
    const ind = lines[s].search(/-/);
    let e = i + 1; while (e < lines.length && !(lines[e].trim() && (lines[e].search(/\S/) < ind || (lines[e].search(/\S/) === ind && /^\s*- /.test(lines[e]))))) e++;
    if (!lines.slice(s, e).some((x) => /^\s*-?\s*continue-on-error:\s*(true|false)\b/.test(x))) bad.push(i + 1);
  });
  return bad;
}

if (process.argv.includes('--self-test')) {
  const ok = findMissing('steps:\n      - if: always()\n        continue-on-error: true\n        uses: actions/upload-artifact@x\n      - uses: actions/upload-artifact@y\n        with:\n          name: a\n      - run: echo\n        continue-on-error: true\n');
  if (JSON.stringify(ok) !== '[5]') { console.error('✗ check-upload-artifact の自己検査', ok); process.exit(1); }
  console.log('✓ check-upload-artifact の自己検査');
  process.exit(0);
}
const errs = [];
for (const dir of ['.github/workflows', 'template/.github/workflows']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
    for (const n of findMissing(readFileSync(path.join(dir, f), 'utf8'))) errs.push(`${dir}/${f}:${n}`);
  }
}
if (errs.length) {
  console.error('✗ upload-artifact の段に continue-on-error が無い（見返す用の控えなら true、成果そのものなら false を書く）:\n  ' + errs.join('\n  '));
  process.exit(1);
}
console.log('✓ upload-artifact の段はどれも continue-on-error を決めて書いている');
