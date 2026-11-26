// ひな形（template/）の共通部品を、ゲームのフォルダへ写す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/sync-template.mjs <ゲームのフォルダ> [...]          写す（ゲームごとの所は残す）
//         node scripts/sync-template.mjs --check <ゲームのフォルダ> [...]  写さずに、ひな形とちがう所を出す（ちがえば 1 で終わる）
//         node scripts/sync-template.mjs --check --only=transfer.js,sw.js <ゲームのフォルダ>  そのファイルだけを見る
// 写すもの（ゲームにすでにあるものだけ。無いものは足さない。足すのは routines/game-dev.md の手順で）:
//   transfer.js・depth.js・qa/a11y.mjs・qa/transfer-check.mjs・qa/sw-check.mjs・qa/depth-check.mjs …… そのまま写す（depth.js は 2026-11-11 から。入れたゲームだけ）
//   index.html の <!-- a11y:begin -->〜<!-- a11y:end --> …… その間だけ写す
//   index.html の <!-- store:begin -->〜<!-- store:end --> …… template/store/store.js を <script> に包んで写す（保存の読み直しの共通部品。2026-11-17 から）
//   index.html の <!-- core:begin -->〜<!-- core:end --> …… template/core/core.js を <script> に包んで写す（小さな関数と、はじめての案内の吹き出し。2026-11-21 から）
//   index.html の画面を描く関数 …… 「戻る」でホームへ戻る Core.screens.mark を足す（migrateBack。2026-11-23 から）
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
// 2026-11-27 Core にあるのに、ゲームが手で写したまま持っていた小部品を Core.* にする（satou さん「共通化されていないパーツ」。
//   210本を数えると、Core.toast・Core.untilNext を使うゲームは0本、buzz は13通り・esc は7通り・num は16通りに分かれていた）。
//   決まった形（行のあとの // の説明は形が多いので、あってもなくてもよい）の行だけを1行ごと替える。形のちがう行（長さ・読み上げのちがう toast など）は触らない
const tailNote = '(?: *//[^\\n]*)?';
const lineOf = (code) => new RegExp(`^([ \\t]*)${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${tailNote}$`, 'gm');
const NUM_OLD = [
  'const num = (v) => { if (typeof v !== "number" && typeof v !== "string") return 0; const n = +v; return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0; };',
  'const num = (v) => ((typeof v === "number" || typeof v === "string") && Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);',
  'const num = (v) => { const x = typeof v === "number" || typeof v === "string" ? +v : NaN; return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0; };',
  'const num = (v) => (typeof v === "number" || typeof v === "string") && Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0;',
];
const ESC_OLD = [
  'const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");',
  'const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");',
  'const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");',
];
const BUZZ_OLD = [
  'const buzz = (n = 12) => { try { if (!(window.A11y && A11y.on("calm"))) navigator.vibrate && navigator.vibrate(n); } catch (e) {} };',
  'const buzz = (n = 12) => { try { if (!document.documentElement.classList.contains("a11y-calm")) navigator.vibrate && navigator.vibrate(n); } catch (e) {} };',
  'const buzz = (n = 12) => { try { if (!(window.A11y && A11y.on && A11y.on("calm")) && navigator.vibrate) navigator.vibrate(n); } catch (e) {} };',
  'const buzz = (n = 12) => { if (calm()) return; try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };',
  'const buzz = (n = 12) => { try { navigator.vibrate && !document.documentElement.classList.contains("a11y-calm") && navigator.vibrate(n); } catch (e) {} };',
  'const buzz = () => { if (calm()) return; try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };',
];
const TOAST_OLD = [
  'function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2000); }',
  'function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }',
  'function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("aria-hidden", "true"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); Core.say(t); }',
];
const UNTIL_OLD = [
  'function untilNext() { const n = jstNow(), ms = 864e5 - (n.getTime() % 864e5); return `${Math.floor(ms / 36e5)}時間${Math.floor((ms % 36e5) / 6e4)}分`; }',
  'function untilNext() { const n = jstNow(), ms = 864e5 - (n.getTime() % 864e5); const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4); return `${h}時間${m}分`; }',
];
export const CORE_LINES = [
  ...NUM_OLD.map((c) => [c, 'const num = Core.num; // 共通部品 game-core（配列・true を数にしない #410）']),
  ...ESC_OLD.map((c) => [c, 'const esc = Core.esc; // 共通部品 game-core（" と \' も変える。属性の中でも切れない）']),
  ...BUZZ_OLD.map((c) => [c, 'const buzz = Core.buzz; // 共通部品 game-core（「動きを減らす」では震わせない）']),
  ...TOAST_OLD.map((c) => [c, 'function toast(t) { Core.toast(t); } // 知らせの帯（共通部品 game-core。読み上げにも届け、重ねて出さない）']),
  ...UNTIL_OLD.map((c) => [c, 'function untilNext() { return Core.untilNext(); } // 次の回までの時間（共通部品 game-core）']),
];
// 2026-11-27 Ko-fi 応援の一文を Core.kofi に、フッターの応援先を Core.KOFI にする（201本が手で写し、文言が分かれていた。incidents/2026-11-27-kofi-line-hand-copied.md）
const KOFI_LINE = /\$\{showKofi \? `<p class="note(?: kofi)?">([^、<`]{1,12})、<a href="https:\/\/ko-fi\.com\/satouaaaaa" target="_blank" rel="noopener">Ko-fi でコーヒー1杯の応援<\/a>をもらえると、([^<`"]{1,30}?)の励みになります（任意・遊ぶのはずっと無料）。<\/p>` : ""\}/g;
const KOFI_FOOT = '<a href="https://ko-fi.com/satouaaaaa" target="_blank" rel="noopener">Ko-fi で応援</a></footer>`';
const swapKofi = (t) => t.replace(KOFI_LINE, (m, lead, what) => `\${showKofi ? Core.kofi(${JSON.stringify(lead)}, ${JSON.stringify(what)}) : ""}`).split(KOFI_FOOT).join('<a href="${Core.KOFI}" target="_blank" rel="noopener">Ko-fi で応援</a></footer>`');
const swapLines = (t) => CORE_LINES.reduce((x, [a, b]) => x.replace(lineOf(a), (m, sp) => sp + b), t);
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
  next = parts.map((x, i) => (i % 2 ? x : swapKofi(swapLines(CORE_SWAPS.reduce((t, [a, b]) => t.split(a).join(b), x))))).join('');
  next = next.split('href="${FEEDBACK}" target="_blank" rel="noopener"').join('href="${FEEDBACK}" data-feedback="fun" target="_blank" rel="noopener"');
  next = next.split('<a id="fb2" target="_blank" rel="noopener">').join('<a id="fb2" target="_blank" rel="noopener" data-feedback="fun">');
  if (!/Core\.bindFeedback\(/.test(next.replace(CORE, ''))) {
    next = next.replace(/^(\s*)(const FEEDBACK\s*=\s*["'][^"'\n]*["'];)[^\n]*$/m, (m, sp) => `${m}\n${sp}if (window.Core) Core.bindFeedback({}); // 「感想を送る」は全ゲームで1つの Googleフォームへ（ゲーム名・版などを事前入力。GitHub のアカウントが無くても送れる）`);
  }
  return next;
}

// はじめての人に、長い「遊び方」の窓でなく、点数に入らない練習の1問と吹き出し（Core.coach）を出す（2026-11-22 satou さん「全ゲームで」）。
// ひな形からできたゲームの形（home() の `if (!s.tut) openHow();`・startRun(mode, opt)・play()・.verdict・#next）にだけ足す。形がちがうゲームは手で。
// 足すのは first-play:begin〜end の印のあいだだけ。2回かけても同じ（印があれば中身を今のひな形に替える）
export const FIRST_PLAY = /\/\/ first-play:begin[\s\S]*?\/\/ first-play:end\n?/;
const FIRST_AREAS = ['choices', 'chs', 'cards', 'board', 'tiles', 'tray', 'hand', 'pick', 'slots', 'map', 'chart', 'card', 'cands', 'inp', 'ans', 'q'];
// 練習の入り口：practiceMenu() の中で startRun("p", …) を呼ぶボタンの選び方（いちばん上＝いちばんやさしい段を押す）
export const firstPick = (html) => { const i = html.indexOf('\nfunction practiceMenu('); const b = i >= 0 && html.slice(i, i + 4000).match(/querySelectorAll\("([^"]+)"\)\.forEach\(\(b\) => \(b\.onclick = \(\) => startRun\("p"/); return b ? b[1] : null; };
export function firstPlayBlock(html) {
  const pick = firstPick(html);
  const area = FIRST_AREAS.find((id) => new RegExp(`id=\\\\?["']${id}\\\\?["']`).test(html));
  // 付ける所は、はじめの問題の画面で「見えている」ものを、問題の所・題・画面の上の順に選ぶ（問題の所があとから描かれる・題の無い画面もある。2026-11-22 地図記号よみ・お札のひみつ・部首たし算）
  const sels = [...(area ? [`#${area}`] : []), '#app h1', '#app header', '#app'];
  const playArg = /\nfunction play\(key\)/.test(html) ? '"p"' : ''; // play(key) の形は、練習の回の名前を渡す（暑さ指数よみ など）
  return `// first-play:begin（shared-workflows の scripts/sync-template.mjs が足した。直すときはひな形を直す）
// はじめての人：長い「遊び方」の窓を出さず、点数に入らない練習の1問を遊びながら、吹き出しで一言ずつ教える（game-core の Core.coach）。
// 「見た」は始めたその場で残す（途中でやめても、次からはふつうに始まる。くわしい遊び方はいつでもいちばん下の「遊び方」から）
const FIRST_STEPS = [
  { sel: ${JSON.stringify(sels[0])}, button: "やってみる", text: "はじめての方へ：まずは点数に入らない練習の1問です。くわしい遊び方は、いちばん下の「遊び方」にあります。" },
  { sel: "#next", wait: ".verdict", text: "できました。わけを読んだら、ここを押して進みます。" },
];
function firstPlay() {
  save((s) => { s.tut = true; });
  // 練習の入り口を開いて、いちばん上（いちばんやさしい）を押す。無ければ前の形（遊び方の窓）にもどす
  practiceMenu();
  const b = document.querySelector(${JSON.stringify(pick)});
  if (!window.Core || !Core.coach || !b) { home(); return openHow(); }
  b.click();
  // 練習は1問だけにする（数を減らしてから描き直す）。問題の数を決めているゲーム（読み直しで数のちがう回を捨てる）は、元の数のまま
  const keep = JSON.stringify((load().runs || {}).p || null);
  save((s) => { const r = s.runs && s.runs.p; if (r && Array.isArray(r.list)) r.list = r.list.slice(0, 1); });
  if (keep !== "null" && !(load().runs || {}).p) save((s) => { s.runs.p = JSON.parse(keep); });
  play(${playArg});
  const seen = (q) => { const e = document.querySelector(q); return !!e && e.getBoundingClientRect().height > 0; };
  FIRST_STEPS[0].sel = ${JSON.stringify(sels)}.find(seen) || "#app";
  // 案内を閉じた（Esc も）ら、1問の練習の途中経過を残さずにホームのいちばん上へ（ふだんの練習の「続きから」を出さない）
  Core.coach.start(FIRST_STEPS, { home, onEnd: (done) => { if (done === false) { save((s) => { const r = s.runs && s.runs.p; if (r && !(r.res || []).length) delete s.runs.p; }); home(); scrollTo(0, 0); } } });
}
// first-play:end
`;
}
// 練習の入り口が無い・形のちがうゲーム：遊び方の窓は出さず、ホームのはじめに押すボタンへ吹き出しを1つ付ける
// （チュートリアルがあればそこ・今日の問題・ホームの大きいボタンの順）
export function firstTipBlock(html) {
  const id = ['go-tut', 'go-d'].find((x) => new RegExp(`id=\\\\?["']${x}\\\\?["']`).test(html));
  const sel = id ? `#${id}` : '#app button.main';
  return `// first-play:begin（shared-workflows の scripts/sync-template.mjs が足した。直すときはひな形を直す）
// はじめての人：長い「遊び方」の窓を出さず、はじめに押す所へ吹き出しを1つだけ出す（game-core の Core.coach）。
// 「見た」は出したその場で残す（くわしい遊び方はいつでもいちばん下の「遊び方」から）
const FIRST_STEPS = [
  { sel: "${sel}", text: "はじめての方へ：まずはここを押して、遊びながら覚えましょう。くわしい遊び方は、いちばん下の「遊び方」にあります。" },
];
function firstPlay() {
  save((s) => { s.tut = true; });
  if (!window.Core || !Core.coach || !document.querySelector(FIRST_STEPS[0].sel)) return openHow();
  Core.coach.start(FIRST_STEPS, { home });
}
// first-play:end
`;
}
const FIRST_OPEN = /if \(!s\.tut(?: && !\$\("howto"\)\.open)?\) openHow\(\);/;
const playable = (html) => html.includes('\nfunction startRun(mode, opt) {') && firstPick(html) && /if \(!s\.tut\) openHow\(\);/.test(html) && /\nfunction play\(/.test(html) && /class=\\?"verdict/.test(html) && /id=\\?"next/.test(html);
export function migrateFirstPlay(html) {
  if (FIRST_PLAY.test(html)) { const rest = html.replace(FIRST_PLAY, ''); return html.replace(FIRST_PLAY, () => (/const FIRST_STEPS = \[\n  \{ sel: "[^"]*", button:/.test(html.match(FIRST_PLAY)[0]) ? firstPlayBlock(rest) : firstTipBlock(rest))); }
  if (/function firstPlay\(/.test(html)) return html; // 手で作ったはじめての練習がある（震度よみ など）
  if (!FIRST_OPEN.test(html) || !/\nfunction home\(\)/.test(html)) return html;
  if (playable(html)) {
    const at = html.indexOf('\nfunction startRun(mode, opt) {');
    return `${html.slice(0, at + 1)}${firstPlayBlock(html)}${html.slice(at + 1)}`.replace(FIRST_OPEN, 'if (!s.tut) firstPlay();');
  }
  // 吹き出しだけの形は home() の前に足す
  const at = html.indexOf('\nfunction home()');
  return `${html.slice(0, at + 1)}${firstTipBlock(html)}${html.slice(at + 1)}`.replace(FIRST_OPEN, 'if (!s.tut) firstPlay();');
}

// QA の「はじめて開くと遊び方が出る」前提の所を、はじめての練習の形に替える（migrateFirstPlay を足したゲームだけ）
// 「わかった」で閉じていた所は firstClose(p)：遊び方が開いていれば閉じ、吹き出しが出ていれば案内をやめてホームへ戻る（前と同じホームから測る）
// 吹き出しは、描かれる前でも始まっていれば止める。止めたらページの上へ戻す（練習でスクロールした位置のままホームを描くと、下の「遊び方」が見やすさのボタンの下に来て押せなかった。2026-11-22 CI の切符10・詐欺みぬき）
export const FIRST_CLOSE_OLD = 'const firstClose = async (q) => { if (await q.locator("#howto[open]").count()) await q.click("#howto-ok"); if (await q.locator("#core-coach").count()) { await q.evaluate(() => Core.coach.leave()); await q.waitForTimeout(100); } }; // はじめての練習の吹き出しをやめてホームへ（sync-template の migrateFirstQa が足した）';
export const FIRST_CLOSE = 'const firstClose = async (q) => { if (await q.locator("#howto[open]").count()) await q.click("#howto-ok"); if (await q.evaluate(() => !!(window.Core && Core.coach && Core.coach.active()))) { await q.evaluate(() => { Core.coach.leave(); scrollTo(0, 0); }); await q.waitForTimeout(100); } }; // はじめての練習の吹き出しをやめてホームへ（sync-template の migrateFirstQa が足した）';
// 吹き出しは「ある」でなく「見えている」で確かめる（吹き出しの所が無いと、隠れたまま残ってホームに戻る。2026-11-22 地図記号よみ・お札のひみつ）
const COACH_SEEN = '.locator("#core-coach").waitFor({ timeout: 3000 }).then(() => true, () => false)';
export const firstVisible = (qa) => qa
  .split('.locator("#core-coach").count() === 1').join(COACH_SEEN)
  .split('!!document.getElementById("core-coach")').join('!!document.querySelector("#core-coach:not([hidden])")')
  .replace(/([A-Za-z_$][\w$]*)\.isVisible\("#core-coach"\)/g, `$1${COACH_SEEN}`);
// あとから足した書き換え（前に写したゲームの QA にも、次の写しでかける。どれも2回かけても同じ）
function firstLate(qa) {
  const P = '([A-Za-z_$][\\w$]*)';
  return qa
    .split(FIRST_CLOSE_OLD).join(FIRST_CLOSE)
    // 遊び方を開き直す所は、下の「遊び方」を押さずに openHow() で開く（狭い画面でホームが短いと、見やすさのボタンの下に来て押せない。2026-11-22 CI の詐欺みぬき）
    .replace(new RegExp(`await firstClose\\(${P}\\)\\.then\\(\\(\\) => \\1\\.click\\("#f-how"\\)\\);`, 'g'), 'await firstClose($1).then(() => $1.evaluate(() => openHow()));')
    // はじめて開いた日のホームのボタンを数える所（上級ははじめての日から押せる など）：はじめての練習をやめてホームで数える
    .replace(new RegExp(`^(?<!await firstClose\\(\\w+\\);\\n)(\\s*)(check\\([^\\n]*はじめて[^\\n]*?\\(?await ${P}\\.locator\\("#go-)`, 'gm'), (m, sp, rest, v) => `${sp}await firstClose(${v});\n${sp}${rest}`)
    // はじめて開いて遊び方が出ていたかを was に取る所は、吹き出しが出ていたかに替える（Esc で案内をやめても「見た」は残る）
    .replace(new RegExp(`const was = await ${P}\\.locator\\("#howto\\[open\\]"\\)\\.count\\(\\);`, 'g'), 'const was = await $1.locator("#core-coach").count();')
    .replace(new RegExp(`check\\("(?:はじめて|初めて)開くと遊び方が出る([^"]*)", await ${P}\\.evaluate\\(\\(\\) => document\\.getElementById\\("howto"\\)\\.open\\)`, 'g'), (m, tail, v) => `check("はじめて開くと、遊び方の窓でなく吹き出しが出る${tail}", await ${v}.evaluate(() => !document.getElementById("howto").open && !!document.getElementById("core-coach"))`)
    .replace(new RegExp(`check\\("(?:はじめて|初めて)開くと遊び方が出る([^"]*)", await ${P}\\.isVisible\\("#howto"\\)`, 'g'), (m, tail, v) => `check("はじめて開くと、遊び方の窓でなく吹き出しが出る${tail}", !(await ${v}.isVisible("#howto")) && await ${v}.isVisible("#core-coach")`)
    // 「遊び方ははじめてだけ出て…」の形：はじめに測る shown を、窓でなく吹き出しが出ているかに替える
    .replace(new RegExp(`const shown = await ${P}\\.evaluate\\(\\(\\) => document\\.getElementById\\("howto"\\)\\.open\\);`, 'g'), (m, v) => `const shown = await ${v}.evaluate(() => !document.getElementById("howto").open && !!document.getElementById("core-coach"));`)
    // 開いたときの遊び方の窓を測る所（「わかった」が見える など）は、先に吹き出しをやめて遊び方を開く
    .replace(new RegExp(`^(?<!firstClose\\(\\w+\\)\\.then\\(\\(\\) => \\w+\\.evaluate\\(\\(\\) => openHow\\(\\)\\)\\);\n)(\\s*)(check\\([^\\n]*await ${P}\\.evaluate\\(\\(\\) => document\\.activeElement && document\\.activeElement\\.id === "howto-ok")`, 'gm'), (m, sp, rest, v) => `${sp}await firstClose(${v}).then(() => ${v}.evaluate(() => openHow()));\n${sp}${rest}`)
    // はじめて開いて遊び方の窓を待つ所は、吹き出しを待つ（Esc で閉じる・「見た」が残る、はそのまま確かめられる）
    .replace(new RegExp(`${P}\\.waitForSelector\\("#howto\\[open\\]"\\)`, 'g'), '$1.waitForSelector("#core-coach")')
    // 遊び方の窓の Esc（cancel）で「見た」を残す所を、ページの中で確かめる所：はじめての練習で「見た」はもう残っていて窓も閉じているので、先に消して窓を開いてから測る
    // こわれた記録でホームが出るかを見る所：「見た」が無いと、はじめての練習の画面になる。見た印だけ足して、ホームを測る
    .replace(/^(\s*check\("こわれた記録[^\n]*?JSON\.stringify\(\{ )(?!tut: true)/gm, '$1tut: true, ')
    .replace(/(?<!localStorage\.clear\(\); )const d = document\.getElementById\("howto"\); d\.dispatchEvent\(new Event\("cancel"\)\)/g, 'localStorage.clear(); const d = document.getElementById("howto"); if (!d.open) d.showModal(); d.dispatchEvent(new Event("cancel"))');
}
export function migrateFirstQa(qa) {
  if (qa.includes('const firstClose = async')) return firstVisible(firstLate(qa));
  const P = '([A-Za-z_$][\\w$]*)';
  let next = qa
    .replace(new RegExp(`if \\(await ${P}\\.locator\\("#howto\\[open\\]"\\)\\.count\\(\\)\\) await \\1\\.click\\("#howto-ok"(?:, \\{[^}]*\\})?\\)`, 'g'), 'await firstClose($1)')
    .replace(new RegExp(`${P}\\.click\\("#howto-ok"(?:, \\{[^}]*\\})?\\)`, 'g'), 'firstClose($1)')
    .replace(new RegExp(`${P}\\.click\\("#f-how"\\)`, 'g'), 'firstClose($1).then(() => $1.click("#f-how"))')
    // 開いた遊び方の窓を測る所は、先に吹き出しをやめて遊び方を開く
    .replace(new RegExp(`const ([\\w$]+) = await ${P}\\.evaluate\\(\\(\\) => (?=[^;\\n]*?"#howto )`, 'g'), 'await firstClose($2).then(() => $2.evaluate(() => openHow())); const $1 = await $2.evaluate(() => ')
    // 遊び方が開くのを待っていた所（Esc で閉じる検査）は、吹き出しが出るのを待つ（Esc で案内をやめるとホームへ戻る）
    .split('waitForFunction(() => document.getElementById("howto").open)').join('waitForFunction(() => !!document.getElementById("core-coach"))')
    // ほかの「はじめは遊び方が開いている」前提は、吹き出しが出ている前提に替える
    .split('.locator("#howto[open]").count() === 1').join('.locator("#core-coach").count() === 1')
    .split('document.getElementById("howto").open && /').join('!!document.getElementById("core-coach") && /')
    // ページの中で「わかった」を押していた所は、吹き出しが出ていればやめてホームへ戻る
    .replace(/(d\.querySelector\("#howto-ok"\)\.click\(\)|document\.getElementById\("howto-ok"\)\.click\(\)|if \(d\.open\) d\.close\(\));?/g, '$1; if (window.Core && Core.coach && Core.coach.active()) Core.coach.leave();')
    .replace(new RegExp(`check\\("「わかった」を押したその場で「見た」が残る", await ${P}\\.locator\\("#howto-ok"\\)\\.evaluate\\(\\(b\\) => \\{ b\\.click\\(\\); (return [^\\n]*?\\}\\); \\}\\)\\);)`, 'g'), (m, v, body) => `check("はじめての練習が始まったその場で「見た」が残る", await ${v}.evaluate(() => { ${body} await firstClose(${v});`)
    .replace(new RegExp(`check\\("(?:はじめて|初めて)開くと遊び方が出る([^"]*)", await ${P}\\.locator\\("#howto\\[open\\]"\\)\\.count\\(\\) === 1`, 'g'), (m, tail, v) => `check("はじめて開くと、遊び方の窓でなく練習の1問と吹き出しが出る${tail}", await ${v}.locator("#howto[open]").count() === 0 && await ${v}.locator("#core-coach").count() === 1`);
  next = firstLate(next);
  if (next === qa) return qa;
  const m = next.match(/^const check = .*$/m);
  return m ? firstVisible(next.replace(m[0], () => `${m[0]}\n${FIRST_CLOSE}`)) : qa;
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
  // はじめての練習（migrateFirstPlay）を足すゲームは、QA の「はじめて開くと遊び方が出る」前提の所も替える
  const firstOn = has('index.html') && A11Y.test(read('index.html')) && FIRST_PLAY.test(migrateFirstPlay(migrateStore(migrateCore(read('index.html')))));
  if (has('qa/run.mjs')) want('qa/run.mjs', (firstOn ? migrateFirstQa : (x) => x)(roundSizes(read('qa/run.mjs'))), firstOn ? '押せる所の 44px を丸めてくらべる・はじめての練習の形' : '押せる所の 44px を丸めてくらべる');
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
    if (A11Y.test(html)) next = migrateBack(migrateFirstPlay(migrateStore(migrateCore(next)))); // 見やすさの設定のあるゲーム（ひな形からできたゲーム）だけ game-core・GameStore に切り替える
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

// 「戻る」でゲームから出ないように（Core.screens.mark・route。routines/ui-rules.md「ページの分け方」6。2026-11-23 satou さん「#で戻れるように全部直す」）。
// app.innerHTML で画面を描き替えるゲームの、トップレベルの関数（行頭の function 名前(…) { で終わる行）のうち、
//   home      → 最初に Core.screens.route({}, home); Core.screens.mark("");
//   ほかで app.innerHTML = を書く関数 → 最初に Core.screens.mark("<関数の名前>");
// を足す。履歴は [ホーム] か [ホーム, #画面] の2つまでなので、「戻る」はいつもホームへ。何度かけても同じ。形のちがうゲームは触らない。
export function migrateBack(html) {
  const BACK_MARK = '// 「戻る」でホームへ（sync-template の migrateBack）'; // 関数の中に置く（上のほうで呼ばれても使える）
  if (!CORE.test(html) || /Core\.screens\.route\(/.test(html.replace(CORE, ''))) return html;
  const lines = html.split('\n');
  const head = /^(async )?function (\w+)\([^)]*\)\s*\{\s*$/;
  let name = null, start = -1;
  const draws = new Map(); // 関数名 → 宣言の行
  const coreAt = lines.findIndex((l) => /<!-- core:begin/.test(l)), coreEnd = lines.findIndex((l) => /<!-- core:end/.test(l));
  for (let i = 0; i < lines.length; i++) {
    if (i >= coreAt && i <= coreEnd) continue;
    const m = lines[i].match(head);
    if (m) { name = m[2]; start = i; continue; }
    if (/^\S/.test(lines[i])) { name = null; continue; } // 行頭に何かあればトップレベルの関数の外
    if (name && /\bapp\.innerHTML\s*=/.test(lines[i]) && !draws.has(name)) draws.set(name, start);
  }
  if (!draws.has('home') || draws.size < 2) return html;
  const order = [...draws.entries()].sort((a, b) => b[1] - a[1]); // 下から足す（行の番号がずれない）
  for (const [fn, at] of order) {
    const add = fn === 'home' ? '  Core.screens.route({}, home); Core.screens.mark("");' : `  Core.screens.mark("${fn}");`;
    lines.splice(at + 1, 0, `${add} ${BACK_MARK}`);
  }
  return lines.join('\n');
}
