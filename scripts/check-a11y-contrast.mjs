// ひな形 template/qa/a11y.mjs のコントラストの測り方（contrastFn）を、作り物の画面で確かめる（Selftest から呼ぶ。Claude は使わない）。
//   使い方: node scripts/check-a11y-contrast.mjs   （Playwright か playwright-core と Chromium が要る。CHROME_PATH があればそれを使う）
// きっかけ: 2026-11-07 CodeRabbit。不透明な背景より上の親の opacity を見ず、薄い字を 21:1 と測っていた
// （incidents/2026-11-07-game-template-review-gaps.md）。測り方を直すたびに、ここで「甘く測らない・厳しすぎない」を見る。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
for (const m of ['playwright-core', 'playwright']) { try { pw = require(m); break; } catch { /* 次 */ } }
if (!pw) { console.error('✗ playwright か playwright-core が要る'); process.exit(2); }
const src = readFileSync('template/qa/a11y.mjs', 'utf8');
const m = src.match(/const contrastFn = (\(skip\) => \{[\s\S]*?\n\});\n/);
if (!m) { console.error('✗ template/qa/a11y.mjs に contrastFn が見つからない（この検査を直す）'); process.exit(1); }

// [名前, 画面の HTML, 低いと数えるはずか]
const cases = [
  ['ふつうの黒い字', '<p>くろいもじ</p>', false],
  ['opacity .1 の親の中の白いカードの黒い字（約1.25:1）', '<div style="opacity:.1"><div style="background:#fff"><p style="color:#000">うすいもじ</p></div></div>', true],
  ['opacity .1 の親が黒い地の上：白いカードの黒い字', '<div style="background:#000"><div style="opacity:.1"><div style="background:#fff"><p style="color:#000">うすいもじ</p></div></div></div>', true],
  ['字だけ opacity .3', '<p style="opacity:.3">うすいもじ</p>', true],
  ['opacity .9 の親の中の黒い字（まだ読める）', '<div style="opacity:.9"><div style="background:#fff"><p style="color:#000">こいもじ</p></div></div>', false],
  ['薄い灰色の字（#aaa）', '<p style="color:#aaa">はいいろ</p>', true],
  ['黒い地の白い字', '<div style="background:#000"><p style="color:#fff">しろいもじ</p></div>', false],
];
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
let bad = 0;
for (const [name, html, low] of cases) {
  await page.setContent(`<!doctype html><html lang="ja"><body style="margin:0;background:#fff;font-size:16px">${html}</body></html>`);
  const r = await page.evaluate(`(${m[1]})(null)`);
  const got = r.bad.length > 0;
  if (r.measured < 1 || got !== low) { console.error(`✗ ${name}: ${low ? '低いと数えるはず' : '通るはず'}なのに ${JSON.stringify(r)}`); bad++; }
  else console.log(`✓ ${name}`);
}
await browser.close();
if (bad) { console.error('✗ template/qa/a11y.mjs のコントラストの測り方が合っていない'); process.exit(1); }
console.log('✓ コントラストの測り方の検査が通った');
