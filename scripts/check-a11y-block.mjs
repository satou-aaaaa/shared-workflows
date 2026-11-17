// ひな形 template/a11y/a11y.html（見やすさの設定）の動きを、作り物の画面で確かめる（Selftest から呼ぶ。Claude は使わない）。
//   使い方: node scripts/check-a11y-block.mjs   （Playwright か playwright-core と Chromium が要る。CHROME_PATH があればそれを使う）
// 見ること（2026-11-17 hatsuden-kurabe #1・nenkin-shikumi #1 の CodeRabbit。incidents/2026-11-17-template-review-gaps-again.md）:
//   1. 開いたあとに端末の「視差効果を減らす」を変えても効く（自分で決めていないときだけ）
//   2. 保存できないあいだに変えた設定を、次の変更で読み直した古い値で消さない・保存できたらまとめて書く
// 各ゲームの qa/a11y.mjs も同じことをゲームの画面で見る。ここはひな形そのものを、ゲーム無しで見る。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
for (const m of ['playwright-core', 'playwright']) { try { pw = require(m); break; } catch { /* 次 */ } }
if (!pw) { console.error('✗ playwright か playwright-core が要る'); process.exit(2); }
const block = readFileSync('template/a11y/a11y.html', 'utf8');
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>t</title>${block}</head><body><h1>見本</h1><button data-a11y-open>設定</button></body></html>`;
const URL_ = 'https://a11y.test/';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || process.env.CHROMIUM_PATH || undefined });
const errors = [];
const ok = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) errors.push(name); };
async function open(saved) {
  const ctx = await browser.newContext({ reducedMotion: 'no-preference' });
  await ctx.route(URL_, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  if (saved) await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('a11y-v1', s); } }, JSON.stringify(saved));
  const page = await ctx.newPage();
  await page.goto(URL_);
  return { ctx, page };
}
const calm = (page) => page.evaluate(() => document.documentElement.classList.contains('a11y-calm'));
try {
  {
    const { ctx, page } = await open();
    const b = await calm(page);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
    const a = await calm(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(100);
    const c = await calm(page);
    ok('1. 開いたあとに端末の「視差効果を減らす」を入れる・切ると、動きを減らす設定も入る・切れる', !b && a && !c);
    // 設定の画面を開いたまま変えても、チェックが合い、1回押せば外せる
    await page.click('[data-a11y-open]');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
    const checked = await page.isChecked('dialog.a11y-dlg input[data-k="calm"]');
    await page.click('dialog.a11y-dlg input[data-k="calm"]');
    ok('1. 設定の画面を開いたまま端末の設定を変えても、チェックが合い、1回押せば外せる', checked && !(await calm(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ calm: false });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
    ok('1. 自分で「動きを減らす」を切っていたら、端末の設定を変えても入れない', !(await calm(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ read: false, cvd: false });
    const r = await page.evaluate(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'a11y-v1') throw new Error('QuotaExceededError'); return real.call(this, k, v); };
      try { window.A11y.set('read', true); window.A11y.set('cvd', true); } finally { Storage.prototype.setItem = real; }
      const both = window.A11y.on('read') && window.A11y.on('cvd');
      window.A11y.set('ruby', false);
      const t = JSON.parse(localStorage.getItem('a11y-v1') || '{}');
      return { both, saved: t.read === true && t.cvd === true && t.ruby === false };
    });
    ok('2. 保存できないあいだに続けて変えた設定（読みやすい文字・色の見分け）が両方残る', r.both);
    ok('2. 保存できるようになったら、残っていた変更もまとめて書く', r.saved);
    await ctx.close();
  }
} finally { await browser.close(); }
if (errors.length) { console.error(`✗ 見やすさの設定のひな形の検査が ${errors.length} 件落ちた`); process.exit(1); }
console.log('✓ 見やすさの設定のひな形の検査が通った');
