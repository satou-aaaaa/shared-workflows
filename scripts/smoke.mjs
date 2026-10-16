// 公開されたページをブラウザで開き、壊れていないかを見る（post-deploy.yml から呼ぶ。Claude は使わない）。
// 使い方: node smoke.mjs <公開URL> <版を表す文字列> [相対パス...]
// 結果を1行の JSON で出す: {"result":"ok"|"broken"|"unreachable","pages":[...]}
// - broken: ページが 404 などで返らない、または開いたときに JavaScript のエラー（pageerror）が出た。差し戻しの対象
// - unreachable: 5xx・つながらない。GitHub Pages 側の障害のことが多いので差し戻さない
// ブラウザは playwright-core と、ランナーに入っている Chrome（CHROME_PATH）を使う。
import { chromium } from 'playwright-core';

const [base, ver, ...rest] = process.argv.slice(2);
if (!base) {
  console.error('使い方: node smoke.mjs <公開URL> <版> [相対パス...]');
  process.exit(2);
}
const paths = ['', ...rest.filter((p) => /\.html?$/.test(p))];
// SMOKE_PROXY は手元で試すときだけ（プロキシの内側から開く）。CI では使わない
const proxy = process.env.SMOKE_PROXY;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  proxy: proxy ? { server: proxy } : undefined,
});
const pages = [];
try {
  for (const p of paths) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: Boolean(proxy) });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 300)));
    // CDN の古い控えを避けるため、版をクエリに付ける
    const url = new URL(p, base);
    url.searchParams.set('v', ver || String(Date.now()));
    let status = 0;
    try {
      const res = await page.goto(url.href, { waitUntil: 'load', timeout: 45000 });
      status = res ? res.status() : 0;
      await page.waitForTimeout(3000); // 読み込み直後に走る処理のエラーも拾う
    } catch (e) {
      errors.push(`開けません: ${String(e.message || e).split('\n')[0]}`);
    }
    pages.push({ path: p || '（トップ）', status, errors });
    await ctx.close();
  }
} finally {
  await browser.close();
}
const down = pages.some((x) => x.status === 0 || x.status >= 500);
const broken = pages.some((x) => (x.status >= 400 && x.status < 500) || (x.status === 200 && x.errors.length > 0));
const result = broken ? 'broken' : down ? 'unreachable' : 'ok';
console.log(JSON.stringify({ result, pages }));
