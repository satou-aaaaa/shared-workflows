// 画面の使いやすさを数えて、基準より悪くなっていないかを見る（ui-check.yml から呼ぶ。Claude は使わない）。
// どのアプリでも同じ物差しで見るための共通の検査。ボードの詳細画面でボタンが増えすぎたのを見逃した件
// （incidents/2026-10-22-board-buttons-added-unchecked.md）と、メニューが隠れた件（2026-10-20）のように、
// 「表示」の問題が別々のアプリで繰り返したので、各アプリの検査とは別に共通の数え方を置く。
//
// 使い方: node ui-check.mjs <設定ファイル> [--update-baseline]
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
// ブラウザは playwright-core と、ランナーに入っている Chrome（CHROME_PATH）を使う。
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, normalize, sep } from 'node:path';

const [configPath, ...flags] = process.argv.slice(2);
if (!configPath) {
  console.error('使い方: node ui-check.mjs <設定ファイル> [--update-baseline]');
  process.exit(2);
}
const update = flags.includes('--update-baseline');
const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
const root = resolve(cfg.root || '.');
// 配る範囲はリポジトリの中だけ（PR の設定で root を / などにして、ランナーのファイルを画面から読ませない）
if (root !== process.cwd() && !root.startsWith(process.cwd() + sep)) { console.error(`root はリポジトリの中にしてください: ${cfg.root}`); process.exit(2); }
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
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}/`;

// ページの中で数える（scope があればその中だけ、無ければ閉じたダイアログの外）
function measure(scopeSel) {
  const scope = scopeSel ? document.querySelector(scopeSel) : document.body;
  if (!scope) throw new Error(`scope が見つからない（開く操作が効いていない）: ${scopeSel}`);
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('dialog:not([open])') && !(e.closest('details:not([open])') && !e.closest('summary'));
  const ctrls = [...scope.querySelectorAll('button,summary,select,input:not([type=hidden]),textarea,a[href],[role=button]')].filter(vis);
  const named = (e) => e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length) || e.closest('label') || e.querySelector('img[alt]:not([alt=""])');
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
  return { first, tiny, unnamed, small, overflow };
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
      for (const sel of s.click || []) {
        await page.click(sel, { timeout: 5000 });
        await page.waitForTimeout(300);
      }
      results[key] = await page.evaluate(measure, s.scope || '');
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
const rows = [];
for (const [key, r] of Object.entries(results)) {
  const b = baseline?.[key];
  const bad = [];
  if (baseline) {
    if (r.unnamed.length) bad.push(`名前の無いボタン ${r.unnamed.length}（${r.unnamed.join(' / ')}）`);
    if (r.overflow) bad.push('横にはみ出している');
    if (b) {
      if (r.first > b.first + 1) bad.push(`押せる部品 ${b.first}→${r.first}（基準 +1 まで。足すなら同じ画面で別のものを減らすか畳む）`);
      if (r.tiny.length > b.tiny) bad.push(`24px 未満の押す所 ${b.tiny}→${r.tiny.length}（${r.tiny.join(' / ')}）`);
      if (r.small > b.small) bad.push(`12px 未満の字 ${b.small}→${r.small}`);
    } else bad.push('基準に無い画面（--update-baseline で足す）');
  }
  if (bad.length) fails.push(`${key}: ${bad.join('、')}`);
  rows.push(`| ${key} | ${r.first}${b ? `（基準 ${b.first}）` : ''} | ${r.tiny.length} | ${r.small} | ${r.unnamed.length} | ${r.overflow ? 'はみ出し' : '—'} | ${bad.length ? '❌' : '✓'} |`);
}

const table = ['| 画面@幅 | 押せる部品（開いてすぐ） | 24px 未満 | 12px 未満の字 | 名前の無いボタン | 横 | 判定 |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
console.log(table);
if (errors.length) console.log(`\nJavaScript のエラー（落とさない。公開後の確認が見る）:\n${errors.join('\n')}`);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## 画面の使いやすさ（ui-check）\n\n${table}\n\n`, { flag: 'a' });

if (update) {
  if (!basePath) { console.error('設定に baseline が無いので書けません'); process.exit(2); }
  const out = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { first: r.first, tiny: r.tiny.length, small: r.small }]));
  writeFileSync(basePath, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n基準を書きました: ${cfg.baseline}（上げた理由を PR 本文に書く）`);
} else if (!baseline) {
  console.log('\n基準がまだ無いので、数えただけです（落としません）。決めたら --update-baseline で基準を作る。');
} else if (fails.length) {
  console.error(`\n${fails.map((f) => `::error::${f}`).join('\n')}`);
  process.exit(1);
} else console.log('\n✓ 基準より悪くなっていません');
