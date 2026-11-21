// ひな形（template/）の共通部品を、ゲームのフォルダへ写す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/sync-template.mjs <ゲームのフォルダ> [...]          写す（ゲームごとの所は残す）
//         node scripts/sync-template.mjs --check <ゲームのフォルダ> [...]  写さずに、ひな形とちがう所を出す（ちがえば 1 で終わる）
//         node scripts/sync-template.mjs --check --only=transfer.js,sw.js <ゲームのフォルダ>  そのファイルだけを見る
// 写すもの（ゲームにすでにあるものだけ。無いものは足さない。足すのは routines/game-dev.md の手順で）:
//   transfer.js・depth.js・qa/a11y.mjs・qa/transfer-check.mjs・qa/sw-check.mjs・qa/depth-check.mjs …… そのまま写す（depth.js は 2026-11-11 から。入れたゲームだけ）
//   index.html の <!-- a11y:begin -->〜<!-- a11y:end --> …… その間だけ写す
//   index.html の <!-- store:begin -->〜<!-- store:end --> …… template/store/store.js を <script> に包んで写す（保存の読み直しの共通部品。2026-11-17 から）
//   index.html の <!-- core:begin -->〜<!-- core:end --> …… template/core/core.js を <script> に包んで写す（小さな関数と、はじめての案内の吹き出し。2026-11-21 から）
//   sw.js …… ひな形を写し、// game:begin〜// game:end の間（CACHE・SHELL）はゲームのものを残す。
//            まだ枠の無い古い sw.js からは const CACHE と const SHELL の行を拾って枠に入れる
//   scripts/setup.sh …… ひな形を写し、npm_dir= と next= の行はゲームのものを残す
//   qa/run.mjs …… 押せる所の高さ・幅を丸めずに 44 とくらべる所だけを Math.round(…) < 44 に書きかえる（ほかは変えない。2026-11-17 から。
//            動きの途中で 43.98px と測れてときどき落ちる。incidents/2026-11-17-qa-44px-subpixel.md）
//   .github/workflows/{qa,setup-check,link-check,ci-failure-issue}.yml …… jobs: から下（呼び出しと設定値）がひな形と同じときだけ写す
//            （きっかけ・権限・concurrency だけを直す。設定値を変えているゲームは手で。.github/ を変える PR は自動マージされないので手でマージ）
// 写す前に、手元の shared-workflows のひな形が origin/main より古くないかを見る（古ければ止める。2026-11-17 二重に配るおそれ。
//   incidents/2026-11-17-template-sync-from-stale-copy.md）。--check では見ない。見られない（git・ネットが無い）ときは知らせて続ける。
//   わざと古いひな形で写すときだけ SYNC_ALLOW_STALE=1。
// きっかけ: 2026-11-07 sw.js が28本で28通りになり、同じ直しを1本ずつ手で入れていた（incidents/2026-11-07-template-copies-drift.md）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roundSizes } from './game-patterns.mjs';
import { LEGACY_LOADS } from './store-legacy.mjs';

const T = join(dirname(fileURLToPath(import.meta.url)), '..', 'template');
const tpl = (p) => readFileSync(join(T, p), 'utf8');

const REGION = /\/\/ game:begin\n[\s\S]*?\/\/ game:end\n/;
const A11Y = /<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/;
export const STORE = /<!-- store:begin[\s\S]*?<!-- store:end -->/;
// index.html に写す保存の共通部品のかたまり（ファイルを足さないので、sw.js の SHELL も電波の無いときの動きも変わらない）
export const storeBlock = () => `<!-- store:begin（template/store/store.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す） -->\n<script id="game-store">\n${tpl('store/store.js')}</script>\n<!-- store:end -->`;

export const CORE = /<!-- core:begin[\s\S]*?<!-- core:end -->/;
// index.html に写す game-core のかたまり（window.Core。ゲームの script より前、<head> の中に置く）
export const coreBlock = () => `<!-- core:begin（template/core/core.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す） -->\n<script id="game-core">\n${tpl('core/core.js')}</script>\n<!-- core:end -->`;

// game-core に切り替える（2026-11-22。何度かけても同じ）。どのゲームでも同じ形の所だけを、決まった文字どおりに替える（形のちがう所は触らない）:
//   - <head> の終わりに game-core のかたまりを足す（ゲームの script より前に window.Core ができる）
//   - 手で写した小さな関数の、不具合のある古い形（incidents/2026-11-21-hand-copied-helpers-drift.md。scripts/game-patterns.mjs の core:*）を Core.* にする
//   - 「感想を送る」（FEEDBACK のリンク・遊び方の窓の fb2）を、全ゲームで1つの Googleフォームの事前入力リンクにする（data-feedback。押したその時に作る）
// はじめての案内（練習1問の吹き出し）はゲームごとに問題の作り方がちがうので、ここでは入れない（ゲームごとの PR で。routines/game-dev-detail.md）
export const CORE_SWAPS = [
  ['const num = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);', 'const num = Core.num; // 共通部品 game-core（配列・true を数にしない #410）'],
  ['const buzz = (n = 12) => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };', 'const buzz = Core.buzz; // 共通部品 game-core（「動きを減らす」では震わせない）'],
  ['const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");', 'const esc = Core.esc; // 共通部品 game-core（" と \' も変える。属性の中でも切れない）'],
  ['function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }', 'function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("aria-hidden", "true"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); Core.say(t); } // 読み上げにも届ける（共通部品 game-core）'],
  // 日付の小さな関数（どのゲームでも同じ文字。ひとつにまとめて直す所を1か所にする。2026-11-22 satou さん「画面の共通部品」）
  ['const ymOf = (k) => k.slice(0, 7);', 'const ymOf = Core.ymOf;'],
  ['const ymAdd = (ym, n) => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };', 'const ymAdd = Core.ymAdd;'],
  ['const ymAdd = (ym, n) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);', 'const ymAdd = Core.ymAdd;'],
  ['const prevDay = (k) => new Date(Date.parse(k) - 864e5).toISOString().slice(0, 10);', 'const prevDay = Core.prevDay;'],
  ['const md = (k) => `${+k.slice(5, 7)}/${+k.slice(8, 10)}`;', 'const md = Core.md;'],
  ['const dayNo = (k) => Math.round((Date.parse(k) - Date.parse(EPOCH)) / 864e5) + 1;', 'const dayNo = (k) => Core.dayNo(k, EPOCH);'],
  ['function streak(days) { let k = todayKey(), n = 0; if (!days[k]) k = prevDay(k); while (days[k]) { n++; k = prevDay(k); } return n; }', 'function streak(days) { return Core.streak(days); } // 続けて遊んだ日数（共通部品 game-core。壊れた記録・constructor などの名前を日に数えない）'],
];
export function migrateCore(html) {
  if (!/<\/head>/i.test(html) || !/<script/i.test(html)) return html;
  let next = html;
  // 置き場所：見やすさの設定・保存の共通部品のすぐあと（transfer.js・depth.js・</head> の並びを見る QA を崩さない）。無ければ </head> の前
  if (!CORE.test(next)) {
    const ends = ['<!-- store:end -->', '<!-- a11y:end -->'].map((m) => [m, next.indexOf(m)]).filter(([, i]) => i >= 0 && i < next.search(/<\/head>/i));
    if (ends.length) { const [m, i] = ends.sort((x, y) => y[1] - x[1])[0]; next = `${next.slice(0, i + m.length)}\n${coreBlock()}${next.slice(i + m.length)}`; }
    else next = next.replace(/<\/head>/i, () => `${coreBlock()}\n</head>`);
  }
  // 替えるのはゲームの文字だけ（共通部品のかたまりの中には同じ形の関数があるので触らない）
  const parts = next.split(/(<!-- (?:core|store|a11y):begin[\s\S]*?<!-- (?:core|store|a11y):end -->)/);
  next = parts.map((x, i) => (i % 2 ? x : CORE_SWAPS.reduce((t, [a, b]) => t.split(a).join(b), x))).join('');
  next = next.split('href="${FEEDBACK}" target="_blank" rel="noopener"').join('href="${FEEDBACK}" data-feedback="fun" target="_blank" rel="noopener"');
  next = next.split('<a id="fb2" target="_blank" rel="noopener">').join('<a id="fb2" target="_blank" rel="noopener" data-feedback="fun">');
  if (!/Core\.bindFeedback\(/.test(next.replace(CORE, ''))) {
    next = next.replace(/^(\s*)(const FEEDBACK\s*=\s*["'][^"'\n]*["'];)[^\n]*$/m, (m, sp) => `${m}\n${sp}if (window.Core) Core.bindFeedback({}); // 「感想を送る」は全ゲームで1つの Googleフォームへ（ゲーム名・版などを事前入力。GitHub のアカウントが無くても送れる）`);
  }
  return next;
}

// 古い load()（保存の写しを手で合わせる形）を共通部品 GameStore に切り替える（2026-11-22。表は scripts/store-legacy.mjs。文字が1つでもちがえば替えない）
// 切り替えたら store:begin〜end の印を game-core のすぐあとに置く（中身は下で storeBlock を写す）
export function migrateStore(html) {
  if (STORE.test(html)) return html;
  for (const L of LEGACY_LOADS) {
    if (!html.includes(`\n${L.old}\n`)) continue;
    const call = `function load() {\n  return GameStore.load(KEY, mem, { v: 1, fresh, tidy, bank, doneOf, bookOf${L.opts ? `, ${L.opts}` : ''} }); // 2つの写しの合わせ方は共通部品 GameStore（store:begin〜end）\n}`;
    let next = html.split(`\n${L.old}\n`).join(`\n${call}\n`);
    const at = next.indexOf('<!-- core:end -->');
    next = at >= 0 ? `${next.slice(0, at + 17)}\n<!-- store:begin -->\n<!-- store:end -->${next.slice(at + 17)}` : next.replace(/<\/head>/i, () => '<!-- store:begin -->\n<!-- store:end -->\n</head>');
    return next;
  }
  return html;
}

// sw.js のゲームの枠を取り出す（無ければ古い形から CACHE と SHELL の行を拾う）
export function swRegion(old) {
  const m = old.match(REGION);
  if (m) return m[0];
  const cache = old.match(/^const CACHE\s*=.*$/m);
  const shell = old.match(/^const SHELL\s*=[\s\S]*?\];.*$/m);
  if (!cache || !shell) return null;
  // SHELL が文字の並びだけでないとき（...ASSETS など別の定数を使う）は、写すとその定数が消えるので写さない（#252 の CodeRabbit）
  const items = shell[0].replace(/\/\/.*$/, '').replace(/^const SHELL\s*=\s*\[/, '').replace(/\];\s*$/, '');
  if (!/^\s*(?:"[^"]*"|'[^']*')(?:\s*,\s*(?:"[^"]*"|'[^']*'))*\s*,?\s*$/.test(items)) return null;
  if (!/^const CACHE\s*=\s*["'][\w-]+-v\d+["'];/.test(cache[0])) return null;
  // 枠の無い古い sw.js に CACHE・SHELL のほかの定数や関数（国旗を入れる FLAGS、文字の FONT_CACHE など）があるときは写さない。
  // 写すと CACHE と SHELL だけが残り、その働きが黙って消える（2026-11-17 kokki-shuto の国旗・batsu-doko の文字。incidents/2026-11-17-sw-migration-drops-extras.md）
  const extra = [...old.matchAll(/^(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm)].map((x) => x[1]).filter((n) => n !== 'CACHE' && n !== 'SHELL');
  if (extra.length) return null;
  return `// game:begin\n${cache[0]}\n${shell[0]}\n// game:end\n`;
}

// ひな形の sw.js に、ゲームの枠を入れたもの
export function makeSw(old) {
  const region = swRegion(old);
  if (!region) return null;
  return tpl('sw.js').replace(REGION, () => region);
}

// sw.js の SHELL に transfer-qr.js を足す（transfer.js のすぐあと。電波の無いときも引き継ぎの QR を出せるように）。何度かけても同じ
export function withQrShell(sw) {
  return sw.replace(/^(const SHELL\s*=\s*\[[^\]]*?)(["'])\.\/transfer\.js\2/m, (m, head, q) => (/transfer-qr\.js/.test(sw) ? m : `${head}${q}./transfer.js${q}, ${q}./transfer-qr.js${q}`));
}

// ひな形の setup.sh に、ゲームの npm_dir= と next= を入れたもの
export function makeSetup(old) {
  let out = tpl('scripts/setup.sh');
  for (const key of ['npm_dir', 'next']) {
    const line = old.match(new RegExp(`^${key}=.*$`, 'm'));
    if (line) out = out.replace(new RegExp(`^${key}=.*$`, 'm'), () => line[0]);
  }
  return out;
}

// ワークフローの jobs: から下（コメントを除く）。ここが同じなら、上（きっかけ・権限）をひな形にそろえてよい
const jobsPart = (t) => (t.split(/^jobs:\s*$/m)[1] || '').split('\n').filter((l) => !/^\s*#/.test(l) && l.trim()).join('\n');
export const CALLERS = ['qa', 'setup-check', 'link-check', 'ci-failure-issue'].map((n) => `.github/workflows/${n}.yml`);

// 1つのゲームについて、写したあとの中身を返す（ちがう所だけ）
export function plan(dir) {
  const has = (p) => existsSync(join(dir, p));
  const read = (p) => readFileSync(join(dir, p), 'utf8');
  const out = [];
  const want = (p, next, note) => { if (next !== null && read(p) !== next) out.push({ path: p, next, note }); };
  const want2 = (p, next, note) => { if (!has(p) || read(p) !== next) out.push({ path: p, next, note }); }; // 無いファイルも足す
  if (has('qa/run.mjs') && has('sw.js') && !read('qa/run.mjs').includes('checkSwStall')) out.push({ path: 'qa/run.mjs', next: null, note: 'checkSwStall を呼んでいない（import { checkSwStall } from "./sw-check.mjs" と、sw.js の中身で check を1行足す）' });
  if (has('qa/run.mjs')) want('qa/run.mjs', roundSizes(read('qa/run.mjs')), '押せる所の 44px を丸めてくらべる');
  // sw.js を写せない（独自の働きがある）ゲームには、ひな形の sw.js を前にした sw の検査も写さない。写すと QA が「FLAGS が無い」などで落ちる
  // （2026-11-17 kokki-shuto。incidents/2026-11-17-sw-migration-drops-extras.md）
  const swStuck = has('sw.js') && makeSw(read('sw.js')) === null;
  // 版14：transfer.js の QR の部品は transfer-qr.js に分けた。transfer.js のあるゲームには無くても足す（sw.js の SHELL にも下で足す）
  if (has('transfer.js')) want2('transfer-qr.js', tpl('transfer-qr.js'), has('transfer-qr.js') ? '' : '足した（引き継ぎの QR の部品。箱を開いたときにだけ読む）');
  for (const p of ['transfer.js', 'depth.js', 'qa/a11y.mjs', 'qa/transfer-check.mjs', 'qa/sw-check.mjs', 'qa/depth-check.mjs', 'qa/core-check.mjs']) if (has(p) && !(swStuck && p === 'qa/sw-check.mjs')) want(p, tpl(p));
  if (has('index.html') && CORE.test(read('index.html')) && has('qa/run.mjs') && /core-check/.test(read('qa/run.mjs')) && !has('qa/core-check.mjs')) out.push({ path: 'qa/core-check.mjs', next: tpl('qa/core-check.mjs'), note: '足した。qa/run.mjs から checkCore を呼ぶ' });
  if (has('depth.js') && has('qa') && !has('qa/depth-check.mjs')) out.push({ path: 'qa/depth-check.mjs', next: tpl('qa/depth-check.mjs'), note: '足した。qa/run.mjs から checkDepth を呼ぶ' });
  // sw.js があるのに sw の検査が無いゲームには足す（qa/run.mjs から呼ぶのは手で。下で知らせる）
  if (has('sw.js') && !swStuck && has('qa') && !has('qa/sw-check.mjs')) out.push({ path: 'qa/sw-check.mjs', next: tpl('qa/sw-check.mjs'), note: '足した。qa/run.mjs から checkSwStall を呼ぶ' });
  if (has('index.html')) {
    const html = read('index.html');
    const block = tpl('a11y/a11y.html').match(A11Y)[0];
    let next = A11Y.test(html) ? html.replace(A11Y, () => block) : html;
    if (CORE.test(next)) next = next.replace(CORE, () => coreBlock());
    if (A11Y.test(html)) next = migrateStore(migrateCore(next)); // 見やすさの設定のあるゲーム（ひな形からできたゲーム）だけ game-core・GameStore に切り替える
    if (STORE.test(next)) next = next.replace(STORE, () => storeBlock());
    if (A11Y.test(html) || STORE.test(html) || CORE.test(html)) want('index.html', next, '見やすさの設定・保存の共通部品・game-core');
  }
  if (has('sw.js')) {
    let next = makeSw(read('sw.js'));
    if (next !== null && has('transfer.js')) next = withQrShell(next);
    const stuckNote = '枠が無く、CACHE・SHELL を拾えないか、ほかの定数・関数（FLAGS・FONT_CACHE など）がある。写すと消えるので写さない（手で game:begin〜game:end の枠を作り、その働きを枠に入れる）';
    // 写せない sw.js でも、SHELL に transfer-qr.js だけは足す（足さないと電波の無いとき引き継ぎの QR が出ない。2026-11-22 batsu-doko）
    const qr = next === null && has('transfer.js') ? withQrShell(read('sw.js')) : null;
    if (qr !== null && qr !== read('sw.js')) want('sw.js', qr, `SHELL に transfer-qr.js だけ足した。ほかは${stuckNote}`);
    else if (next === null) out.push({ path: 'sw.js', next: null, note: stuckNote });
    else want('sw.js', next);
  }
  if (has('scripts/setup.sh')) want('scripts/setup.sh', makeSetup(read('scripts/setup.sh')));
  for (const p of CALLERS) {
    if (!has(p)) continue;
    const t = tpl(p);
    if (jobsPart(read(p)) === jobsPart(t)) want(p, t);
    else if (read(p) !== t) out.push({ path: p, next: null, note: '呼び出しの設定値がひな形とちがうので写さない（きっかけ・権限は手でひな形にそろえる）' });
  }
  return out;
}

// 手元のひな形が origin/main より古ければ、足りないコミットの数を返す（見られなければ null）
export function staleCount(root = join(T, '..')) {
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }).trim();
  try {
    git('fetch', '-q', '--depth=50', 'origin', 'main');
    return Number(git('rev-list', '--count', 'HEAD..FETCH_HEAD', '--', 'template', 'scripts/sync-template.mjs'));
  } catch { return null; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let args = process.argv.slice(2);
  const check = args[0] === '--check';
  if (check) args = args.slice(1);
  // --only=<ファイル,...>：そのファイルだけを見る（共通部品 game-qa が、PR で足した・直した写しだけを見るのに使う）
  const only = args[0] && args[0].startsWith('--only=') ? args.shift().slice(7).split(',').filter(Boolean) : null;
  const dirs = args;
  if (!dirs.length) { console.error('使い方: node scripts/sync-template.mjs [--check] [--only=<ファイル,...>] <ゲームのフォルダ> [...]'); process.exit(2); }
  if (!check && process.env.SYNC_ALLOW_STALE !== '1') {
    const n = staleCount();
    if (n === null) console.log('⚠ 手元のひな形が最新か確かめられなかった（git かネットが無い）。写す前に shared-workflows で git pull しておく');
    else if (n > 0) {
      console.error(`✗ 手元の shared-workflows のひな形が origin/main より ${n} コミット古い。古いひな形で写すと、新しい直しを消してしまう。shared-workflows で git pull してからもう一度（わざとなら SYNC_ALLOW_STALE=1）`);
      process.exit(3);
    }
  }
  let diff = 0;
  for (const dir of dirs) {
    const todo = plan(dir).filter((t) => !only || only.includes(t.path));
    if (!todo.length) { console.log(`✓ ${dir}: ひな形どおり`); continue; }
    for (const t of todo) {
      // 呼び出しの設定値（時間切れなど）を変えたゲームはあるので、--only のときは知らせるだけにする
      if (only && t.next === null && CALLERS.includes(t.path)) { console.log(`⚠ ${dir}/${t.path}: ${t.note}`); continue; }
      diff++;
      if (t.next === null) { console.log(`✗ ${dir}/${t.path}: ${t.note}`); continue; }
      if (check) console.log(`✗ ${dir}/${t.path}: ひな形とちがう${t.note ? `（${t.note}）` : ''}`);
      else { writeFileSync(join(dir, t.path), t.next); console.log(`→ ${dir}/${t.path} を写した${t.note ? `（${t.note}）` : ''}`); }
    }
  }
  if (check && diff) process.exit(1);
  if (!check && diff) console.log('写したあとは、ゲームで node qa/run.mjs を回す。sw.js の動きを大きく変えたときは CACHE の版を上げる');
}
