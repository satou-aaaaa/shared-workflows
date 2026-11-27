// ひな形 template/a11y/a11y.html（見やすさの設定）の動きを、作り物の画面で確かめる（Selftest から呼ぶ。Claude は使わない）。
//   使い方: node scripts/check-a11y-block.mjs   （Playwright か playwright-core と Chromium が要る。CHROME_PATH があればそれを使う）
// 見ること（2026-11-17 hatsuden-kurabe #1・nenkin-shikumi #1 の CodeRabbit。incidents/2026-11-17-template-review-gaps-again.md）:
//   1. 開いたあとに端末の「視差効果を減らす」を変えても効く（自分で決めていないときだけ）
//   2. 保存できないあいだに変えた設定を、次の変更で読み直した古い値で消さない・保存できたらまとめて書く
//   3. v9 選ぶ行（2026-11-26）：文字の大きさ（小・中・大）で html の文字が 0.9・1.2 倍になる・ゲームが html.a11y-fs1〜3 を書いていればそれを使う・
//      前のゲームごとの大きさを引き継ぐ・音のないページに「音」の行を出さない・音の「なし」で Web Audio の音量が 0 になる
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
  {
    const { ctx, page } = await open();
    const fsz = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const base = await fsz();
    await page.click('[data-a11y-open]');
    ok('3. 音のないページには「音」の行を出さない', await page.evaluate(() => document.querySelector('fieldset[data-c="vol"]').hidden));
    ok('3. 文字の大きさは「中」が選ばれている', await page.isChecked('fieldset[data-c="fs"] input[value="2"]'));
    await page.click('fieldset[data-c="fs"] label:has-text("大")');
    const big = await fsz();
    await page.click('fieldset[data-c="fs"] label:has-text("小")');
    const small = await fsz();
    ok('3. 文字の大きさ「大」「小」で html の文字が 1.2 倍・0.9 倍になる', Math.abs(big - base * 1.2) < 0.2 && Math.abs(small - base * 0.9) < 0.2);
    await page.reload();
    ok('3. 選んだ文字の大きさは開き直しても残る', Math.abs((await fsz()) - base * 0.9) < 0.2);
    await ctx.close();
  }
  {
    const { ctx, page } = await open();
    const r = await page.evaluate(() => {
      const st = document.createElement('style'); st.textContent = 'html.a11y-fs1{font-size:17px}html.a11y-fs2{font-size:19px}html.a11y-fs3{font-size:23px}'; document.head.prepend(st);
      localStorage.setItem('g-fs', '3');
      const v = A11y.fsFrom('g-fs', 1);
      const a = getComputedStyle(document.documentElement).fontSize;
      localStorage.removeItem('g-fs');
      const d = A11y.fsFrom('g-fs', 1);
      return { v, a, d, b: getComputedStyle(document.documentElement).fontSize };
    });
    ok('3. 前のゲームごとの大きさ（3）を引き継ぎ、ゲームの html.a11y-fs3 の大きさを使う', r.v === 3 && r.a === '23px');
    ok('3. 前の大きさが無ければゲームの既定の値を使う', r.d === 1 && r.b === '17px');
    const r2 = await page.evaluate(() => { localStorage.setItem('g-fs', '2.5'); return A11y.fsFrom('g-fs', 2); });
    ok('3. 前の大きさが 1・2・3 以外（2.5 など）なら既定の値を使う（v11。kusuri-yomi）', r2 === 2);
    await ctx.close();
  }
  {
    const { ctx, page } = await open();
    const r = await page.evaluate(() => {
      const c = new AudioContext(); const d = c.destination; const g = [d.gain.value];
      A11y.set('vol', 0); g.push(d.gain.value); A11y.set('vol', 1); g.push(d.gain.value); A11y.set('vol', 2); g.push(d.gain.value);
      const off = new OfflineAudioContext(1, 1, 8000);
      return { g, same: c.destination === d, off: off.destination.constructor.name };
    });
    ok('3. 音の「なし・小・ふつう」で Web Audio の音量が 0・0.35・1 になる（ゲームは何もしなくてよい）', r.g.join(',') === '1,0,0.3499999940395355,1' || r.g.join(',') === '1,0,0.35,1');
    ok('3. 同じ AudioContext の出口はいつも同じ・書き出し用の OfflineAudioContext は変えない', r.same && r.off === 'AudioDestinationNode');
    await page.click('[data-a11y-open]');
    ok('3. Web Audio を使ったページには「音」の行を出す', await page.evaluate(() => !document.querySelector('fieldset[data-c="vol"]').hidden));
    await ctx.close();
  }
  {
    // 4. 暗い画面（v10）：ゲームらしい色（:root の変数・決め打ちの白い地・あざやかな字・薄くした字）の作り物で見る
    const game = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>t</title><style>:root{--bg:#eceff3;--paper:#fff;--ink:#1b2433;--shu:#b23a24;--mo:#1f4a7a;color-scheme:light}
body{background:var(--bg);color:var(--ink);font-size:16px}.card{background:var(--paper);padding:8px}.w{background:#fff;color:#333}.red{color:var(--shu)}.btn{background:var(--mo);color:#fff}.dim{opacity:.6}</style>${block}</head>
<body><h1>見本</h1><div class="card"><p class="red">あざやかな字</p><p class="dim">うすくした字</p></div><div class="w"><p>白い地</p></div><button class="btn" data-a11y-open>設定</button><p data-a11y-keepcolor style="color:#777">そのまま</p></body></html>`;
    const U = 'https://a11y-dark.test/';
    const ctx = await browser.newContext({ colorScheme: 'light' });
    await ctx.route(U, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: game }));
    const page = await ctx.newPage();
    const pe = []; page.on('pageerror', (e) => pe.push(e.message));
    await page.goto(U); await page.waitForTimeout(150);
    const look = () => page.evaluate(() => {
      const parse = (c) => c.match(/[\d.]+/g).map(Number);
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const back = (el) => { for (let n = el; n; n = n.parentElement) { const b = parse(getComputedStyle(n).backgroundColor); if (b.length < 4 || b[3] > 0.9) return b; } return [255, 255, 255]; };
      const ratio = (el) => { let f = parse(getComputedStyle(el).color), b = back(el), o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; f = f.slice(0, 3).map((v, i) => v * o + b[i] * (1 - o)); const x = lum(f), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const q = (s) => document.querySelector(s);
      return { dark: document.documentElement.classList.contains('a11y-dark'), body: lum(parse(getComputedStyle(document.body).backgroundColor)), white: lum(back(q('.w p'))),
        red: ratio(q('.red')), dim: ratio(q('.dim')), w: ratio(q('.w p')), btn: ratio(q('.btn')), keep: getComputedStyle(q('[data-a11y-keepcolor]')).color };
    });
    const a = await look();
    ok('4. 「自動」で端末が明るいときは暗くしない', !a.dark && a.body > 0.7);
    await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(700);
    const d = await look();
    ok('4. 「自動」で端末をダークモードにすると暗くなる（地も決め打ちの白い地も暗い）', d.dark && d.body < 0.05 && d.white < 0.05);
    ok('4. 暗い画面で、あざやかな字・薄くした字・白い地だった所の字・ボタンが 4.5:1 以上', [d.red, d.dim, d.w, d.btn].every((x) => x >= 4.5), JSON.stringify(d));
    ok('4. data-a11y-keepcolor の所は色を変えない', d.keep === 'rgb(119, 119, 119)');
    await page.evaluate(() => window.A11y.set('theme', 1)); await page.waitForTimeout(300);
    const l = await look();
    ok('4. 「明るい」を選ぶと、端末がダークモードでも元の色に戻る', !l.dark && Math.abs(l.body - a.body) < 0.01 && Math.abs(l.red - a.red) < 0.05 && Math.abs(l.white - a.white) < 0.01);
    await page.evaluate(() => window.A11y.set('theme', 2)); await page.emulateMedia({ colorScheme: 'light' }); await page.waitForTimeout(500);
    ok('4. 「暗い」を選ぶと、端末が明るくても暗い', (await look()).dark && await page.evaluate(() => window.A11y.dark()));
    await page.evaluate(() => { const p = document.createElement('p'); p.className = 'red late'; p.textContent = 'あとから足した字'; document.querySelector('.card').appendChild(p); });
    await page.waitForTimeout(500);
    ok('4. 暗い画面のあいだに描き足した字も読める濃さにする', (await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.late')).color.match(/\d+/g).map(Number); return c[0] > 200; })));
    await page.click('[data-a11y-open]');
    ok('4. 設定の画面に「画面の明るさ」の行があり、今の値（暗い）が選ばれている', await page.isChecked('fieldset[data-c="theme"] input[value="2"]'));
    ok('4. 暗い画面でエラーが出ない', pe.length === 0, pe.join(' / '));
    await ctx.close();
  }
} finally { await browser.close(); }
if (errors.length) { console.error(`✗ 見やすさの設定のひな形の検査が ${errors.length} 件落ちた`); process.exit(1); }
console.log('✓ 見やすさの設定のひな形の検査が通った');
