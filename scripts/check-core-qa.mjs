// ひな形の画面の検査 template/qa/core-check.mjs を、作り物のゲームの画面で回す（Selftest から呼ぶ。Claude は使わない）。
//   使い方: node scripts/check-core-qa.mjs   （Playwright か playwright-core と Chromium が要る。CHROME_PATH があればそれを使う）
// 見ること: game-core（template/core/core.js）を入れた正しい作り物の画面で、core-check の検査が全部通ること（検査の書きまちがいで、
//          全ゲームの QA を落とさない）。わざと壊した画面（「？」が無い・帯が出ない）では、その検査が落ちること（甘くない）。
// きっかけ: 2026-11-27 版5で足した「不具合を知らせる」の検査が、URL の空白（+）を戻さずに比べ、checkCore を呼ぶゲームで必ず落ちた。
//          手元で試した4本は checkCore を呼んでいなかったので、検査そのものが一度も動いていなかった（incidents/2026-11-27-core-check-never-ran.md）。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
for (const m of ['playwright-core', 'playwright']) { try { pw = require(m); break; } catch { /* 次 */ } }
if (!pw) { console.error('✗ playwright か playwright-core が要る'); process.exit(2); }
const { checkCore } = await import('../template/qa/core-check.mjs');
const core = readFileSync('template/core/core.js', 'utf8');
const page = (extra = '') => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>作り物のゲーム</title><script>${core}</script>${extra}</head><body>
<h1>作り物のゲーム</h1><p>はじめの画面</p><button type="button" id="go">今日の5問</button>
<dialog id="howto" aria-labelledby="howto-t"><h2 id="howto-t">遊び方</h2><p>説明</p><button type="button" id="howto-ok">わかった</button></dialog>
<footer><a href="#" id="f-how">遊び方</a><a href="#" data-feedback="fun" target="_blank" rel="noopener">感想を送る</a></footer>
<script>function openHow() { document.getElementById("howto").showModal(); } document.getElementById("howto-ok").onclick = () => document.getElementById("howto").close(); Core.bindFeedback({});</script>
</body></html>`;
const CASES = [
  ['正しい画面', page(), []],
  ['「？ 遊び方」が無い（消した）', page('<style>#core-help{display:none!important}</style>'), ['「？ 遊び方」がページの上の右にある']],
  ['不具合の帯が出ない（消した）', page('<style>#core-err{display:none!important}</style><script>document.addEventListener("DOMContentLoaded",()=>new MutationObserver(()=>{const d=document.getElementById("core-err");if(d)d.remove();}).observe(document.body,{childList:true}))</script>'), ['このページのエラーで不具合の帯が出る']],
];
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || process.env.CHROMIUM_PATH || undefined });
const errors = [];
try {
  for (const [name, html, mustFail] of CASES) {
    const url = 'https://core-qa.test/';
    const results = [];
    const check = (n, ok, d = '') => results.push({ n, ok: !!ok, d });
    const b = { newContext: async (o) => { const c = await browser.newContext(o); await c.route(url, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html })); return c; } };
    try { await checkCore({ browser: b, url, check, first: false }); } catch (e) { results.push({ n: `止まった: ${e.message}`, ok: false }); }
    const failed = results.filter((r) => !r.ok).map((r) => r.n);
    const good = mustFail.length ? mustFail.every((m) => failed.some((f) => f.startsWith(m))) : failed.length === 0;
    console.log(`${good ? '✓' : '✗'} ${name}：${results.length}項目${failed.length ? `・落ちた ${failed.join(' / ')}` : '・全部通った'}`);
    if (!good) errors.push(name);
    if (!mustFail.length && results.length < 10) { console.log(`✗ ${name}：検査の数が少ない（${results.length}。版5の検査が動いていない）`); errors.push(name); }
  }
  // 「？」が1画面目に入っている押せる所を画面の外へ押し出さない（2026-11-27 版8 はいつも 52px 空け、部首たしざんなど4本の QA が落ちた。
  // incidents/2026-11-27-help-button-pushed-content.md）。右上に押せる所があり、1画面目の下ぎりぎりにボタンがあるホーム
  {
    const tight = page().replace('<h1>作り物のゲーム</h1>', '<button type="button" id="gear" style="position:absolute;top:6px;right:6px;width:44px;height:44px">⚙</button><h1>作り物のゲーム</h1>')
      .replace('<button type="button" id="go">今日の5問</button>', '<button type="button" id="go" style="margin-top:430px">今日の5問</button>');
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    await ctx.route('https://core-qa.test/', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: tight }));
    const pg = await ctx.newPage(); await pg.goto('https://core-qa.test/'); await pg.waitForTimeout(400);
    const t = await pg.evaluate(() => { const g = document.getElementById('go').getBoundingClientRect(), b = document.getElementById('core-help'); const hb = b.getBoundingClientRect(), gr = document.getElementById('gear').getBoundingClientRect();
      const off = b.classList.contains('core-help-off'); const over = !(hb.right <= gr.left || hb.left >= gr.right || hb.bottom <= gr.top || hb.top >= gr.bottom);
      return { goIn: g.bottom <= innerHeight, off, over }; });
    const good = t.goIn && (t.off || !t.over);
    console.log(`${good ? '✓' : '✗'} 「？」が1画面目のボタンを外へ押し出さず、右上の押せる所にも重ならない：${JSON.stringify(t)}`);
    if (!good) errors.push('「？」の置き方');
    await ctx.close();
  }
} finally { await browser.close(); }
if (errors.length) { console.error(`✗ template/qa/core-check.mjs の検査がおかしい: ${errors.join('・')}`); process.exit(1); }
console.log('✓ template/qa/core-check.mjs は、正しい画面で通り、壊した画面で落ちる');
