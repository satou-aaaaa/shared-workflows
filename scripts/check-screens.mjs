// 画面の切り替え（単体の template/screens/screens.js と、game-core の Core.screens）を、本物のブラウザで確かめる（Selftest から呼ぶ。Claude は使わない）。
//   使い方: node scripts/check-screens.mjs   （Playwright か playwright-core と Chromium が要る。CHROME_PATH があればそれを使う）
// 見ること（routines/ui-rules.md U10〜U12。2026-11-23 satou さん「ペライチに全部入れて見づらい」）:
//   最初はホームだけ・# の入口で画面が替わる・題と見出しのフォーカス・ブラウザの「戻る」・# で直に開く・知らない # はホーム・
//   "core:screen" の知らせ・Screens.go・data-screen の無いページでは何もしない
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
for (const m of ['playwright-core', 'playwright']) { try { pw = require(m); break; } catch { /* 次 */ } }
if (!pw) { console.error('✗ playwright か playwright-core が要る'); process.exit(2); }
const core = readFileSync('template/core/core.js', 'utf8');
const one = readFileSync('template/screens/screens.js', 'utf8');
const screens = readFileSync('scripts/fixtures/ui/screens.html', 'utf8');
const plain = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>ふつう</title><script src="/template/core/core.js"></script></head><body><h1>ふつう</h1><section id="a"><h2>a</h2></section><section id="b"><h2>b</h2></section></body></html>';
const ORIGIN = 'https://screens.test';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || process.env.CHROMIUM_PATH || undefined });
const errors = [];
const ok = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) errors.push(name); };
async function open(path) {
  const ctx = await browser.newContext();
  await ctx.route(`${ORIGIN}/**`, (r) => {
    const u = new URL(r.request().url());
    // ?one のときは game-core の代わりに単体の部品 screens.js を読ませる（ほかのプロジェクトの形）
    const html = u.searchParams.has('one') ? screens.replace('/template/core/core.js', '/template/screens/screens.js') : screens;
    const body = u.pathname === '/template/core/core.js' ? core : u.pathname === '/template/screens/screens.js' ? one : u.pathname === '/plain.html' ? plain : html;
    return r.fulfill({ contentType: u.pathname.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', body });
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  await page.goto(`${ORIGIN}${path}`);
  await page.waitForTimeout(100);
  return { ctx, page, errs };
}
const shown = (page) => page.evaluate(() => [...document.querySelectorAll('[data-screen]')].filter((e) => !e.hidden && e.getClientRects().length).map((e) => e.dataset.screen).join(','));
try {
  for (const [label, q] of [['game-core', ''], ['単体の screens.js', '?one']]) {
    console.log(`— ${label}`);
    const { ctx, page, errs } = await open(`/screens.html${q}`);
    await page.evaluate(() => { window.seen = []; document.addEventListener('core:screen', (e) => window.seen.push(e.detail.id)); });
    ok('最初はホームだけが見える', (await shown(page)) === 'home');
    await page.click('a[href="#kiroku"]');
    await page.waitForTimeout(100);
    ok('# の入口を押すと、その画面だけが見える', (await shown(page)) === 'kiroku');
    ok('題に画面の名前が付く', (await page.title()) === '記録｜画面を分けた見本');
    ok('画面の見出しにフォーカスが移る（読み上げのため）', await page.evaluate(() => document.activeElement && document.activeElement.textContent === '記録'));
    await page.goBack();
    await page.waitForTimeout(100);
    ok('ブラウザの「戻る」でホームへ戻り、題も戻る', (await shown(page)) === 'home' && (await page.title()) === '画面を分けた見本');
    await page.evaluate(() => Screens.go('about'));
    await page.waitForTimeout(100);
    ok('Screens.go で画面が替わり、now() が合う', (await shown(page)) === 'about' && (await page.evaluate(() => Screens.now())) === 'about');
    ok('"core:screen" で替わった画面を知らせる', JSON.stringify(await page.evaluate(() => window.seen)) === JSON.stringify(['kiroku', 'home', 'about']));
    await page.evaluate(() => Screens.go('home'));
    await page.waitForTimeout(100);
    ok('ホームへ戻るときは # を付けない（共有した URL がホームになる）', (await shown(page)) === 'home' && !/#./.test(page.url()));
    ok('エラーが出ない', errs.length === 0);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/screens.html?one#chou');
    ok('# 付きで直に開くと、その画面が出る', (await shown(page)) === 'chou');
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/screens.html#nai');
    ok('知らない # で開くとホームが出る', (await shown(page)) === 'home');
    await ctx.close();
  }
  {
    const { ctx, page, errs } = await open('/plain.html#b');
    const r = await page.evaluate(() => ({ hidden: document.querySelectorAll('[hidden]').length, style: [...document.querySelectorAll('style')].some((s) => s.textContent.includes('data-screen')), now: Screens.now() }));
    ok('data-screen の無いページでは何もしない（隠さない・CSS を足さない）', r.hidden === 0 && !r.style && r.now === '' && errs.length === 0);
    // 両方を読んだページでも、つなぐのは1回（"core:screen" が2回出ない）
    await page.addScriptTag({ url: `${ORIGIN}/template/screens/screens.js` });
    ok('game-core と screens.js の両方を読んでも同じ物を使う', await page.evaluate(() => window.Screens === Core.screens));
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (errors.length) { console.error(`\n✗ 画面の切り替え（screens.js・Core.screens）: ${errors.length} 件`); process.exit(1); }
console.log('\n✓ 画面の切り替え（screens.js・Core.screens）');
