// Issue・PR の本文のファイルを、GitHub の上限（65,536 字）に収める（Claude は使わない）。
// 2026-11-12 リポジトリが増えて CI time report の表が上限を超え、Issue が作れず、前の週の Issue だけ閉じて1件も無くなった
// （incidents/2026-11-12-ci-time-report-body-too-long.md）。長いときは行の切れ目で後ろを切り、切ったことと全部の置き場（実行の Summary）を書く。
// 全部の本文は GITHUB_STEP_SUMMARY（1MB まで）に写す。
// 使い方: node scripts/fit-body.mjs <本文のファイル> [上限のバイト数]   （ファイルをその場で書き換える）
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

// GitHub の上限は 65,536 字。字かバイトかの数え方がはっきりしないので、きびしい方（UTF-8 のバイト数）で数え、
// 後ろに足す1行の分を残す（日本語は1字3バイトなので、およそ2万字）
export const LIMIT = 60000;
const size = (s) => Buffer.byteLength(s, 'utf8');

export function fit(text, limit = LIMIT, where = '') {
  if (size(text) <= limit) return { text, cut: 0 };
  const note = (n) => `\n\n✂ 長すぎるので、ここから下の ${n} 行を省きました（GitHub の Issue は 65,536 字まで）。${where}\n`;
  const lines = text.split('\n');
  let keep = lines.length;
  let len = size(text);
  // 後ろから1行ずつ外し、注記を足しても上限に入るところで止める
  while (keep > 0 && len + size(note(lines.length - keep + 1)) > limit) {
    keep -= 1;
    len -= size(lines[keep]) + 1;
  }
  const head = lines.slice(0, keep).join('\n');
  return { text: head + note(lines.length - keep), cut: lines.length - keep };
}

function selfTest() {
  const big = Array.from({ length: 5000 }, (_, i) => `| リポジトリ${i} | QA | push | 1 | 1分 | 1分 | 1.0 | — |`).join('\n');
  const a = fit(big, 1000, '全部は実行の Summary。');
  const b = fit('短い本文\n', 1000);
  const t = [
    [size(a.text) <= 1000, '上限（UTF-8 のバイト数）に収める'],
    [a.cut > 0 && a.text.includes(`${a.cut} 行を省きました`), '切った行の数を書く'],
    [a.text.split('\n').filter((l) => l.startsWith('| ')).every((l) => l.endsWith('|')), '行の途中で切らない'],
    [b.text === '短い本文\n' && b.cut === 0, '短い本文はそのまま'],
  ];
  return t.filter(([ok]) => !ok).map(([, n]) => `見分けの試しが通らない: ${n}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const errs = selfTest();
  if (errs.length) { for (const e of errs) console.error(`✗ ${e}`); process.exit(1); }
  const [file, max] = process.argv.slice(2);
  if (!file) { console.log('✓ fit-body の見分けの試しが通った'); process.exit(0); }
  const text = readFileSync(file, 'utf8');
  const { GITHUB_SERVER_URL: s, GITHUB_REPOSITORY: r, GITHUB_RUN_ID: id, GITHUB_STEP_SUMMARY: summary } = process.env;
  const where = s && r && id ? `全部は[実行の Summary](${s}/${r}/actions/runs/${id})にあります。` : '';
  const out = fit(text, Number(max) || LIMIT, where);
  if (out.cut) {
    writeFileSync(file, out.text);
    if (summary) appendFileSync(summary, text);
    console.log(`::warning::本文が ${size(text)} バイトで長すぎるので、後ろの ${out.cut} 行を省いた（全部は Summary）`);
  }
}
