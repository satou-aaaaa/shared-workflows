// 画面の使いやすさを数えて、基準より悪くなっていないかを見る（ui-check.yml から呼ぶ。Claude は使わない）。
// どのアプリでも同じ物差しで見るための共通の検査。ボードの詳細画面でボタンが増えすぎたのを見逃した件
// （incidents/2026-10-22-board-buttons-added-unchecked.md）と、メニューが隠れた件（2026-10-20）のように、
// 「表示」の問題が別々のアプリで繰り返したので、各アプリの検査とは別に共通の数え方を置く。
//
// 使い方: node ui-check.mjs <設定ファイル> [--update-baseline]
//         node ui-check.mjs --default   設定ファイルが無いとき。ホーム（index.html。はじめての案内を閉じたあと）を 390・1366 の幅で、下の「決まり」だけ見る
//   設定ファイル（呼ぶ側のリポジトリ。例 qa/ui-check.json）:
//   {
//     "root": ".",                       // 配るフォルダ（設定ファイルからの相対でなく、リポジトリの一番上から）
//     "widths": [390, 1366],             // 画面の幅（高さは 390→844、それ以外→768）
//     "screens": [                       // 測る画面。click を順に押してから測る（詳細やメニューを開くため）
//       { "name": "top", "path": "index.html" },
//       { "name": "detail", "path": "index.html", "click": ["#card-1"], "scope": "dialog[open]" }
//     ],
//     "baseline": "qa/ui-baseline.json"  // 基準（無ければ数えて表に出すだけで落とさない）
//   }
// 見ること（画面×幅ごと）:
//   - 名前の無い記号だけのボタン ……………… 0 でなければ落とす（WCAG 4.1.2）
//   - 横にはみ出す（横スクロールが出る）…… 落とす（WCAG 1.4.10）
//   - 開いてすぐ見える押せる部品の数 ……… 基準 +1 まで（多すぎると選べない。Hick の法則）
//   - 24px より小さい押す所 ……………………… 基準より増えたら落とす（WCAG 2.2 の 2.5.8）
//   - 12px より小さい字 ……………………………… 基準より増えたら落とす
// 決まり（基準が無くても落とす。routines/ui-rules.md の U1〜U4。2026-11-23 satou さん「ホーム画面がごちゃごちゃ」）:
//   - 押せる所が、固定の部品（position: fixed・sticky）の下に隠れている ……… 落とす（WCAG 2.4.11。incidents/2026-11-23-a11y-float-over-home.md）
//   - 同じ働きの入口が1つの画面に2つ以上見えている（見やすさ・引き継ぎ・感想・応援）… 落とす（WCAG 3.2.4）
//   - ホームで開いてすぐ見える押せる部品が、スマホの幅で HOME_MAX（18）を超える ………… 落とす（Hick の法則・段階的に見せる。超えるなら details に畳むか別の画面へ）
//   - 横にはみ出す・名前の無いボタン ………………………………………………… 落とす
//   - 遊び方があるのに、共通の「？ 遊び方」（#core-help）が無い …………………… 落とす（U13。2026-11-27）
// ページの分け方（routines/ui-rules.md U10〜U12。2026-11-23 satou さん「ペライチに全部入れて見づらい」）:
//   - 1つの画面の見出し（h2）が PAGE_H2（5）を超える …………………………… U10
//   - 1つの画面の長さがスマホの幅で画面 PAGE_TALL（3）つ分を超える ………… U11（ホームは最初の案内を閉じたあと）
//   - 畳んだ中にさらに畳む（details の入れ子）・画面（data-screen）がホームのほかに PAGE_DEST（5）を超える … U12
//   ページが画面の切り替え（Core.screens の data-screen）を使っているか、設定ファイルに "pages": "fail" があれば落とす。
//   それ以外（前からあるペライチ）は ::warning:: で知らせるだけ。
//   data-screen があれば、# を順に開いて画面ごとに測る（表の行は「画面#id@幅」）。
//   rule は page-h2・page-tall・page-nest・page-dest も使える。
//   許すときは設定ファイルの "allow": [{ "rule": "home-max", "screen": "home@390", "reason": "…" }]（理由の無い許しは置かない）
// ブラウザは playwright-core と、ランナーに入っている Chrome（CHROME_PATH）を使う。
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, extname, normalize, sep } from 'node:path';

const [configPath, ...flags] = process.argv.slice(2);
if (!configPath) {
  console.error('使い方: node ui-check.mjs <設定ファイル> [--update-baseline] ／ node ui-check.mjs --default');
  process.exit(2);
}
const update = flags.includes('--update-baseline');
const HOME_MAX = 18;
const PAGE_H2 = 5, PAGE_TALL = 3, PAGE_DEST = 5;
const DEFAULT = { root: '.', widths: [390, 1366], screens: [{ name: 'home', path: 'index.html', home: true }] };
const cfg = configPath === '--default' ? DEFAULT : JSON.parse(readFileSync(configPath, 'utf8'));
const allow = cfg.allow || [];
for (const a of allow) if (!a.reason || !a.rule) { console.error('設定ファイルの allow に rule か reason の無い行がある（理由の無い許しは置かない）'); process.exit(2); }
const allowed = (rule, key) => allow.some((a) => a.rule === rule && (!a.screen || a.screen === key));
const root = existsSync(resolve(cfg.root || '.')) ? realpathSync(resolve(cfg.root || '.')) : resolve(cfg.root || '.');
// 配る範囲はリポジトリの中だけ（PR の設定で root を / などにして、ランナーのファイルを画面から読ませない）
const cwd = realpathSync(process.cwd());
if (root !== cwd && !root.startsWith(cwd + sep)) { console.error(`root はリポジトリの中にしてください: ${cfg.root}`); process.exit(2); }
const widths = cfg.widths || [390, 1366];
const screens = cfg.screens || [{ name: 'top', path: 'index.html' }];
const basePath = cfg.baseline ? resolve(cfg.baseline) : '';
const baseline = basePath && existsSync(basePath) ? JSON.parse(readFileSync(basePath, 'utf8')) : null;
// 壊れた基準（null・数の欠け）で「基準が無い」扱いや比べられないまま通らないように止める
if (basePath && existsSync(basePath) && !update) {
  const ok = baseline && typeof baseline === 'object' && !Array.isArray(baseline)
    && Object.values(baseline).every((v) => v && ['first', 'tiny', 'small'].every((k) => Number.isFinite(v[k])));
  if (!ok) { console.error(`基準ファイルの形が正しくありません: ${cfg.baseline}`); process.exit(2); }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(resolve(root, '.' + p));
  if (!f.startsWith(root + sep) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  // シンボリックリンクでリポジトリの外を指すものは配らない（実際の置き場で比べる）
  const real = realpathSync(f);
  if (!real.startsWith(root + sep)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(real));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}/`;

// ページの中で数える（scope があればその中だけ、無ければ閉じたダイアログの外）
function measure(scopeSel) {
  const scope = scopeSel ? document.querySelector(scopeSel) : document.body;
  if (!scope) throw new Error(`scope が見つからない（開く操作が効いていない）: ${scopeSel}`);
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('dialog:not([open])') && !(e.closest('details:not([open])') && !e.closest('summary'));
  const ctrls = [...scope.querySelectorAll('button,summary,select,input:not([type=hidden]),textarea,a[href],[role=button]')].filter(vis);
  const named = (e) => e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length) || e.closest('label') || e.querySelector('img[alt]:not([alt=""]):not([aria-hidden="true"])');
  const unnamed = ctrls.filter((e) => /^(BUTTON|SUMMARY)$/.test(e.tagName) || e.getAttribute('role') === 'button')
    .filter((e) => !/[\p{L}\p{N}]/u.test(e.textContent || '') && !named(e))
    .map((e) => e.outerHTML.slice(0, 60));
  // 文の中のリンクは 2.5.8 の例外なので数えない
  const inline = (e) => e.tagName === 'A' && e.parentElement && /[\p{L}\p{N}]/u.test((e.parentElement.textContent || '').replace(e.textContent || '', ''));
  const tiny = ctrls.filter((e) => !inline(e) && !(e.tagName === 'INPUT' && /checkbox|radio/.test(e.type) && e.closest('label')))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; })
    .map((e) => `${(e.getAttribute('aria-label') || e.textContent || e.id || e.tagName).trim().slice(0, 16)}(${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)})`);
  const first = ctrls.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }).length;
  let small = 0;
  const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const e = n.parentElement;
    if (!n.textContent.trim() || !e || /SCRIPT|STYLE|NOSCRIPT/.test(e.tagName) || !vis(e)) continue;
    if (parseFloat(getComputedStyle(e).fontSize) < 12) small++;
  }
  const overflow = document.documentElement.scrollWidth > innerWidth + 1;
  // U1 固定の部品の下に隠れた押せる所（真ん中の点の上にいちばん上で来ているのが、固定・sticky の別の部品）
  // 共通の「？ 遊び方」（#core-help。ページの上に置く absolute の部品）も浮いた部品と同じに見る（U13）
  const pinned = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky' || x.id === 'core-help') return x; } return null; };
  const passing = (x) => x.closest('dialog,[role=dialog],[role=alertdialog],[role=status],[aria-live],#core-coach,.toast');
  const covered = [];
  for (const c of ctrls) {
    const r = c.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
    const top = document.elementFromPoint(cx, cy);
    if (!top || c.contains(top) || top.contains(c)) continue;
    const pin = pinned(top);
    if (!pin || pin.contains(c) || passing(top)) continue;
    // 画面の大半をおおう層（別の画面を上に重ねる作り）は「浮いた部品」でないので数えない。浮いたボタン・帯だけを見る
    const pr = pin.getBoundingClientRect();
    if (pr.width * pr.height > innerWidth * innerHeight * 0.4) continue;
    covered.push(`${(c.getAttribute('aria-label') || c.textContent || c.tagName).trim().replace(/\s+/g, ' ').slice(0, 14)}←${(pin.getAttribute('aria-label') || pin.textContent || pin.className || pin.tagName).trim().replace(/\s+/g, ' ').slice(0, 12)}`);
  }
  // U2 同じ働きの入口が二重（見えているものだけ）
  const GROUPS = [['見やすさ', '[data-a11y-open]'], ['引き継ぎ', '[data-hk]'], ['共有', '[data-share]'], ['感想', 'a[data-feedback],a[href*="docs.google.com/forms"]'], ['応援', 'a[href*="ko-fi.com"]']];
  const dup = GROUPS.map(([n, sel]) => [n, [...scope.querySelectorAll(sel)].filter(vis).length]).filter(([, k]) => k > 1).map(([n, k]) => `${n}×${k}`);
  // U10〜U12 ページの分け方（見えている見出し・長さ・畳みの入れ子・画面の数）
  const h2 = [...scope.querySelectorAll('h2')].filter(vis).length;
  const tall = scopeSel ? 0 : Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10;
  const nest = [...scope.querySelectorAll('details details')].filter((e) => e.getClientRects().length).length;
  const dest = Math.max(0, document.querySelectorAll('[data-screen]').length - 1);
  // U13 遊び方のあるゲームは、ページの上の右に共通の「？ 遊び方」（game-core 版5から）
  const howto = typeof window.openHow === 'function' || !!document.getElementById('howto');
  const helpMiss = !!(window.Core && window.Core.v >= 5 && howto && !document.getElementById('core-help'));
  return { helpMiss, first, tiny, unnamed, small, overflow, covered, dup, h2, tall, nest, dest, split: dest > 0 };
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = {};
const errors = [];
try {
  for (const s of screens) {
    for (const w of widths) {
      const key = `${s.name}@${w}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: w <= 500 ? 844 : 768 }, serviceWorkers: 'block' });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${key}: ${String(e.message || e).slice(0, 200)}`));
      const res = await page.goto(new URL(s.path, origin).href, { waitUntil: 'load' });
      // 404 の空の画面は数が 0 になり「悪くなっていない」で通ってしまうので止める
      if (!res || !res.ok()) throw new Error(`${key}: ${s.path} が ${res ? res.status() : '応答なし'}`);
      await page.waitForTimeout(300);
      // ホーム：はじめての案内（吹き出し・練習の1問）を閉じて、ふだんのホームで数える
      if (s.home) {
        for (const loc of [page.locator('#core-coach button.core-coach-skip'), page.getByRole('button', { name: '案内を閉じる', exact: true }), page.getByRole('button', { name: '←', exact: true })]) {
          const l = loc.first();
          if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); }
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(200);
      }
      for (const sel of s.click || []) {
        await page.click(sel, { timeout: 5000 });
        await page.waitForTimeout(300);
      }
      results[key] = await page.evaluate(measure, s.scope || '');
      // 画面の切り替え（data-screen）があれば、ホームのほかの画面も # で開いて測る
      if (!s.click && !s.scope) {
        const ids = await page.evaluate(() => [...document.querySelectorAll('[data-screen]')].map((e) => e.getAttribute('data-screen')).slice(1));
        for (const id of ids) {
          await page.evaluate((h) => { location.hash = h; }, id);
          await page.waitForTimeout(250);
          const shown = await page.evaluate((h) => { const e = document.querySelector(`[data-screen="${CSS.escape(h)}"]`); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
          if (!shown) throw new Error(`${s.name}#${id}@${w}: # で開いても画面が出ない（Core.screens を読み込んでいるか）`);
          results[`${s.name}#${id}@${w}`] = await page.evaluate(measure, '');
        }
      }
      await ctx.close();
    }
  }
} catch (e) {
  // 検査そのものが動かなかったときは 2（基準違反の 1 と分ける）
  console.error(`::error::検査を最後まで動かせませんでした: ${String(e.message || e).slice(0, 300)}`);
  process.exitCode = 2;
} finally {
  await browser.close();
  server.close();
}
if (process.exitCode === 2) process.exit(2);

const fails = [];
const warns = [];
const rows = [];
const s0 = (key) => screens.find((x) => `${x.name}@` === key.slice(0, x.name.length + 1)) || {};
for (const [key, r] of Object.entries(results)) {
  const b = baseline?.[key];
  const bad = [];
  // 決まり（基準が無くても見る）
  if (r.covered.length && !allowed('covered', key)) bad.push(`固定の部品の下に隠れた押せる所 ${r.covered.length}（${r.covered.join(' / ')}。U1）`);
  if (r.helpMiss && !allowed('help', key)) bad.push('遊び方があるのに、ページの上の右の「？ 遊び方」が無い（game-core を node scripts/sync-template.mjs で写す。U13）');
  if (r.dup.length && !allowed('dup', key)) bad.push(`同じ働きの入口が二重（${r.dup.join('・')}。U2）`);
  if (s0(key).home && Number(key.split('@')[1]) <= 500 && r.first > HOME_MAX && !allowed('home-max', key)) bad.push(`ホームで開いてすぐ見える押せる部品 ${r.first}（${HOME_MAX} まで。畳むか別の画面へ。U3）`);
  if (r.unnamed.length && !allowed('unnamed', key)) bad.push(`名前の無いボタン ${r.unnamed.length}（${r.unnamed.join(' / ')}）`);
  if (r.overflow && !allowed('overflow', key)) bad.push('横にはみ出している（U4）');
  // U10〜U12：画面を分けたページ・"pages": "fail" は落とす。前からあるペライチは知らせるだけ
  const pg = [];
  const mobile = Number(key.split('@')[1]) <= 500;
  if (r.h2 > PAGE_H2 && !allowed('page-h2', key)) pg.push(`見出し ${r.h2}（${PAGE_H2} まで。画面を分ける。U10）`);
  if (mobile && r.tall > PAGE_TALL && !allowed('page-tall', key)) pg.push(`長さ 画面 ${r.tall} 個分（${PAGE_TALL} まで。画面を分けるか、拾い読みの所だけ畳む。U11）`);
  if (r.nest && !allowed('page-nest', key)) pg.push(`畳んだ中にさらに畳む ${r.nest}（1段まで。U12）`);
  if (r.dest > PAGE_DEST && !allowed('page-dest', key)) pg.push(`ホームのほかの画面 ${r.dest}（${PAGE_DEST} まで。U12）`);
  const strict = r.split || cfg.pages === 'fail';
  if (pg.length) { if (strict) bad.push(...pg); else warns.push(`${key}: ${pg.join('、')}`); }
  if (baseline) {
    if (b) {
      if (r.first > b.first + 1) bad.push(`押せる部品 ${b.first}→${r.first}（基準 +1 まで。足すなら同じ画面で別のものを減らすか畳む）`);
      if (r.tiny.length > b.tiny) bad.push(`24px 未満の押す所 ${b.tiny}→${r.tiny.length}（${r.tiny.join(' / ')}）`);
      if (r.small > b.small) bad.push(`12px 未満の字 ${b.small}→${r.small}`);
    } else bad.push('基準に無い画面（--update-baseline で足す）');
  }
  if (bad.length) fails.push(`${key}: ${bad.join('、')}`);
  rows.push(`| ${key} | ${r.first}${b ? `（基準 ${b.first}）` : ''} | ${r.tiny.length} | ${r.small} | ${r.unnamed.length} | ${r.overflow ? 'はみ出し' : '—'} | ${r.covered.length + r.dup.length || '—'} | ${r.h2} | ${r.tall || '—'} | ${bad.length ? '❌' : pg.length ? '⚠' : '✓'} |`);
}

const table = ['| 画面@幅 | 押せる部品（開いてすぐ） | 24px 未満 | 12px 未満の字 | 名前の無いボタン | 横 | 隠れ・二重 | 見出し | 長さ（画面の数） | 判定 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
console.log(table);
if (errors.length) console.log(`\nJavaScript のエラー（落とさない。公開後の確認が見る）:\n${errors.join('\n')}`);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## 画面の使いやすさ（ui-check）\n\n${table}\n\n`, { flag: 'a' });

// 前からあるペライチ（U10〜U12）は落とさず知らせる。直し方は routines/ui-rules.md「ページの分け方」
if (warns.length) console.log(`\n${warns.map((x) => `::warning::ページを分けるとよい（U10〜U12）: ${x}`).join('\n')}`);
if (update) {
  if (!basePath) { console.error('設定に baseline が無いので書けません'); process.exit(2); }
  const out = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { first: r.first, tiny: r.tiny.length, small: r.small }]));
  writeFileSync(basePath, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n基準を書きました: ${cfg.baseline}（上げた理由を PR 本文に書く）`);
} else if (fails.length) {
  console.error(`\n${fails.map((f) => `::error::${f}`).join('\n')}`);
  process.exit(1);
} else console.log(baseline ? '\n✓ 決まりを守り、基準より悪くなっていません' : '\n✓ 決まりを守っています（基準はまだ無いので数だけ。決めたら --update-baseline で基準を作る）');
