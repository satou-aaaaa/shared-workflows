#!/usr/bin/env node
// まだ知らない不具合を探す道具（Claude は使わない。どの AI でも人でも、CI でも動く）。
// ゲームを乱数の種つきで「でたらめに」遊び、壊れた所を見つけたら、手順を短くして再現ファイルに残す。
// 同じ種と手順なら同じ動きになる（Math.random と時計を種から作る）ので、見つけた不具合はそのまま CI の検査になる。
//
// 使い方:
//   node scripts/game-explore.mjs <ゲームのフォルダ> [--runs 12] [--steps 50] [--seed 1] [--out <フォルダ>]
//       探す。見つけたら <out>（既定 <ゲーム>/qa-report/explore）に repro-<印>.json を書き、1 で終わる
//   node scripts/game-explore.mjs <ゲームのフォルダ> --replay <repro.json か、それを入れたフォルダ>
//       再現ファイルの手順をもう一度動かす。まだ壊れていれば 1 で終わる（直したら 0）。
//       直した不具合の再現ファイルを <ゲーム>/qa/repro/ に置くと、ゲームの QA（game-qa.yml）が毎回これで確かめる
//   ブラウザ: クラウドの会話では CHROMIUM_PATH=<Chromium の場所>（ゲームの playwright の版とちがうとき）
//
// 1回のでたらめ遊び（シナリオ）は種から決める:
//   画面の大きさ（320×568・390×844・820×1180・1280×800）・見やすさの設定（入れる・入れない）・
//   壊した記録で始める（型ちがい・配列・大きすぎる数・constructor などの鍵）・時計（今日・翌日・30日後・日本時間の0時の10秒前）・
//   途中で保存できなくする（localStorage.setItem が投げる）・途中で読み直す・2つ目のタブで同じ記録を書く
// 毎回の操作のあとに見ること（どれか1つでも外れたら不具合）:
//   画面のエラー（pageerror・console.error）・横へのはみ出し・画面の字に undefined / NaN / [object Object]・
//   画面が空・押せる所が1つも無い（行き止まり）・ゲームの記録が JSON として読めない・外への通信（字の Google Fonts は除く）
// 調べたこと: gremlins.js（marmelab。種で再現できるでたらめ操作と、見張り役 mogwai）、
//   fast-check「Model based testing」（操作の列を作り、落ちたら短くして再現する）、
//   Criteo Labs「Detecting the unexpected in (Web) UI」（UI の fuzzing で見つけた不具合を回帰テストにする）。
// きっかけ: 2026-11-21 satou さん「未知の不具合を探索したい」「既知の不具合であれば、CIに載せられるような形にしたい」
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!dir) { console.error("使い方: node scripts/game-explore.mjs <ゲームのフォルダ> [--runs N] [--steps N] [--seed N] [--out フォルダ] | --replay <repro.json|フォルダ>"); process.exit(2); }
const root = path.resolve(dir);
let chromium;
// playwright はゲームのもの（<ゲーム> か <ゲーム>/qa）を使う。無ければ PW_DIR（playwright を入れたフォルダ）から
for (const d of [root, path.join(root, "qa"), process.env.PW_DIR].filter(Boolean)) { try { ({ chromium } = createRequire(path.resolve(d) + "/")("playwright")); break; } catch { /* 次へ */ } }
if (!chromium) { console.error("playwright が見つからない（ゲームで npm ci するか、PW_DIR に playwright を入れたフォルダを渡す）"); process.exit(2); }

// ---- 種から作る乱数（mulberry32）----
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

// ---- ゲームの記録のキー（transfer.js の data-keys）----
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const keys = ((html.match(/data-keys="([^"]+)"/) || [])[1] || "").split(",").map((s) => s.trim()).filter(Boolean);

// ---- シナリオ ----
const SIZES = [[320, 568], [390, 844], [820, 1180], [1280, 800]];
const CLOCKS = [{ name: "今日", days: 0 }, { name: "翌日", days: 1 }, { name: "30日後", days: 30 }, { name: "0時の10秒前", midnight: true }];
export function scenario(seed) {
  const r = rng(seed * 7919 + 13);
  return {
    seed,
    size: pick(r, SIZES),
    a11y: r() < 0.3 ? { read: true, cvd: r() < 0.5, calm: r() < 0.5, say: false, ruby: r() < 0.5 } : null,
    corrupt: r() < 0.3 ? Math.floor(r() * 1e9) : 0,
    clock: pick(r, CLOCKS),
    quotaAt: r() < 0.25 ? 3 + Math.floor(r() * 20) : -1,
    reloadAt: r() < 0.3 ? 3 + Math.floor(r() * 20) : -1,
    tabAt: r() < 0.2 ? 3 + Math.floor(r() * 20) : -1,
  };
}

// 記録を壊す（型ちがい・配列・大きすぎる数・null・プロトタイプの鍵）。元の形は残す（ゲームが自分で直せるかを見る）
export function corruptValue(text, seed) {
  let v; try { v = JSON.parse(text); } catch { return text; }
  const r = rng(seed);
  const bad = [null, [], [5], {}, "x", -1, 1e308, true, "", { constructor: 1 }, "<b>x</b>"];
  const walk = (o, depth) => {
    if (!o || typeof o !== "object" || depth > 4) return;
    for (const k of Object.keys(o)) {
      if (r() < 0.15) o[k] = pick(r, bad);
      else walk(o[k], depth + 1);
    }
    if (!Array.isArray(o) && r() < 0.1) o.constructor = 1;
    if (!Array.isArray(o) && r() < 0.1) o.__proto__x = { y: 1 };
  };
  walk(v, 0);
  return JSON.stringify(v);
}

// ---- 小さな配信（このフォルダだけ）----
function serve() {
  return new Promise((ok) => {
    const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".json": "application/json", ".webmanifest": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
    const srv = http.createServer((q, res) => {
      let f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
      if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
      if (f.endsWith("/")) f += "index.html";
      fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": (types[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" }); res.end(d); });
    }).listen(0, "127.0.0.1", () => ok(srv));
  });
}

// ---- 1回分を動かす（探すときも、再現のときも同じ道）----
// actions: [{ t: "click", sel, text } | { t: "key", key } | { t: "reload" }]。探すときは actions を作りながら進む
async function runOnce(browser, url, sc, { actions = null, steps = 50 } = {}) {
  const r = rng(sc.seed);
  const ctx = await browser.newContext({ viewport: { width: sc.size[0], height: sc.size[1] }, serviceWorkers: "block" });
  const base = new URL(url);
  const outside = new Set();
  // 外への通信は、遊んでいるページ自身が出したものだけを見る。人が押して開く新しいタブ（感想フォーム・出典のリンク）は閉じる
  ctx.on("page", (pg) => { pg.opener().then((o) => { if (o) pg.close().catch(() => {}); }, () => {}); });
  const guard = (route) => {
    const u = new URL(route.request().url());
    if (u.host === base.host) return route.continue();
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return route.abort();
    outside.add(u.hostname); return route.abort();
  };
  // 時計と Math.random を種から作る（同じ種なら同じ問題・同じ動き）
  const jst = Date.parse("2026-11-21T03:00:00Z");
  const start = sc.clock.midnight ? Date.parse("2026-11-21T14:59:50Z") : jst + (sc.clock.days || 0) * 864e5;
  await ctx.addInitScript(({ seed, start, a11y }) => {
    let a = seed >>> 0;
    Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const real = Date.now.bind(Date), t0 = real(), off = start - t0;
    const D = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends D { constructor(...x) { if (x.length) super(...x); else super(real() + off); } static now() { return real() + off; } };
    if (a11y) { try { localStorage.setItem("a11y-v1", JSON.stringify(a11y)); } catch { /* 無い */ } }
  }, { seed: sc.seed, start, a11y: sc.a11y });
  const p = await ctx.newPage();
  await p.route("**/*", guard);
  const errs = [];
  p.on("pageerror", (e) => errs.push("エラー: " + String(e.message).split("\n")[0]));
  p.on("console", (m) => { if (m.type() === "error" && !/net::|ERR_|Failed to load resource/.test(m.text())) errs.push("console: " + m.text().split("\n")[0]); });
  await p.goto(url); await p.waitForTimeout(300);
  if (sc.corrupt) {
    await p.evaluate(({ keys, vals }) => { keys.forEach((k, i) => { if (vals[i] != null) localStorage.setItem(k, vals[i]); }); }, { keys, vals: await p.evaluate((keys) => keys.map((k) => localStorage.getItem(k)), keys).then((v) => v.map((x, i) => (x ? corruptValue(x, sc.corrupt + i) : null))) });
    await p.reload(); await p.waitForTimeout(300);
  }
  const log = [];
  let fail = null;
  const look = async (step) => {
    if (errs.length) return { kind: "エラー", detail: errs[0], step };
    if (outside.size) return { kind: "外への通信", detail: [...outside].join(","), step };
    const st = await p.evaluate((keys) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden],[inert],[aria-hidden=true]"); };
      const txt = document.body ? document.body.innerText : "";
      const bad = (txt.match(/\bundefined\b|\bNaN\b|\[object Object\]/) || [])[0] || "";
      const wide = document.documentElement.scrollWidth > innerWidth + 1;
      const store = keys.filter((k) => { const v = localStorage.getItem(k); if (v == null || !/^[[{]/.test(v)) return false; try { JSON.parse(v); return false; } catch { return true; } });
      const n = [...document.querySelectorAll("button,a[href],[role=button],input,select,summary")].filter((e) => !e.disabled && vis(e)).length;
      return { bad, wide, store, empty: txt.trim().length === 0, n, sw: document.documentElement.scrollWidth, iw: innerWidth };
    }, keys).catch((e) => ({ gone: String(e.message).split("\n")[0] }));
    if (st.gone) return null; // 読み直しの途中など。次の回で見る
    if (st.bad) return { kind: "画面の字", detail: `「${st.bad}」が出た`, step };
    if (st.wide) return { kind: "横にはみ出す", detail: `${st.sw}px > ${st.iw}px`, step };
    if (st.store.length) return { kind: "記録が壊れた", detail: st.store.join(","), step };
    if (st.empty) return { kind: "画面が空", detail: "body に字が無い", step };
    if (st.n === 0) return { kind: "行き止まり", detail: "押せる所が無い", step };
    return null;
  };
  // 押してよい所（外へ出るリンク・ダウンロード・感想のリンク・印刷は押さない）
  const candidates = () => p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden],[inert],[aria-hidden=true]") && r.bottom > -2000; };
    const css = (e) => { if (e.id) return "#" + CSS.escape(e.id); const parts = []; for (let x = e; x && x !== document.body; x = x.parentElement) { if (x.id) { parts.unshift("#" + CSS.escape(x.id)); break; } const sib = [...x.parentElement.children].filter((y) => y.tagName === x.tagName); parts.unshift(x.tagName.toLowerCase() + (sib.length > 1 ? `:nth-of-type(${sib.indexOf(x) + 1})` : "")); } return parts.join(" > "); };
    return [...document.querySelectorAll("button,a[href],[role=button],summary,input[type=checkbox],input[type=radio]")]
      .filter((e) => !e.disabled && vis(e))
      .filter((e) => !(e.tagName === "A" && (e.target === "_blank" || e.hasAttribute("download") || e.hasAttribute("data-feedback") || (/^https?:/.test(e.getAttribute("href") || "") && new URL(e.href).host !== location.host))))
      .filter((e) => !/印刷|print/i.test(e.textContent || ""))
      .map((e) => ({ sel: css(e), text: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 20) }));
  }).catch(() => []);
  const total = actions ? actions.length : steps;
  for (let i = 0; i < total && !fail; i++) {
    if (i === sc.quotaAt) await p.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException("full", "QuotaExceededError"); }; }).catch(() => {});
    if (i === sc.tabAt) {
      const q = await ctx.newPage(); await q.route("**/*", (route) => (new URL(route.request().url()).host === base.host ? route.continue() : route.abort())); await q.goto(url); await q.waitForTimeout(200);
      const c = await q.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => !x.disabled && x.offsetParent); if (b) b.click(); return !!b; }).catch(() => false);
      await q.waitForTimeout(150); await q.close(); void c;
    }
    let a;
    if (actions) a = actions[i];
    else {
      const roll = r();
      if (i === sc.reloadAt || roll < 0.03) a = { t: "reload" };
      else if (roll < 0.1) a = { t: "key", key: pick(r, ["Escape", "Tab", "Enter", "Space"]) };
      else { const c = await candidates(); if (!c.length) { fail = await look(i) || { kind: "行き止まり", detail: "押せる所が無い", step: i }; break; } a = { t: "click", ...pick(r, c) }; }
    }
    log.push(a);
    try {
      if (a.t === "reload") { await p.reload(); await p.waitForTimeout(250); }
      else if (a.t === "key") { await p.keyboard.press(a.key); await p.waitForTimeout(120); }
      else { const el = p.locator(a.sel).first(); if (await el.count()) { await el.click({ timeout: 1500, force: false }).catch(() => el.dispatchEvent("click").catch(() => {})); await p.waitForTimeout(150); } }
    } catch { /* 押せなかった操作は飛ばす（再現でも同じ） */ }
    fail = await look(i);
  }
  await ctx.close();
  return { fail, log };
}

// 手順を短くする（delta debugging の簡単な形：かたまりを外しても同じ種類で落ちるなら外す）
async function shrink(browser, url, sc, actions, fail) {
  let cur = actions.slice(0, fail.step + 1);
  const same = (f) => f && f.kind === fail.kind;
  let n = 2;
  while (cur.length >= 2 && n <= cur.length) {
    const size = Math.ceil(cur.length / n);
    let cut = false;
    for (let i = 0; i < cur.length; i += size) {
      const tryActs = cur.slice(0, i).concat(cur.slice(i + size));
      const { fail: f } = await runOnce(browser, url, { ...sc, quotaAt: shift(sc.quotaAt, i, size), reloadAt: -1, tabAt: shift(sc.tabAt, i, size) }, { actions: tryActs });
      if (same(f)) { cur = tryActs.slice(0, f.step + 1); sc = { ...sc, quotaAt: shift(sc.quotaAt, i, size), reloadAt: -1, tabAt: shift(sc.tabAt, i, size) }; n = Math.max(n - 1, 2); cut = true; break; }
    }
    if (!cut) { if (n >= cur.length) break; n = Math.min(cur.length, n * 2); }
  }
  return { sc, actions: cur };
}
const shift = (at, i, size) => (at < 0 ? at : at >= i + size ? at - size : at >= i ? i : at);

const sigOf = (f) => crypto.createHash("sha1").update(f.kind + "|" + f.detail.replace(/\d+/g, "N").slice(0, 80)).digest("hex").slice(0, 8);

async function main() {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let bad = 0;
  try {
    const rp = opt("--replay");
    if (rp) {
      const files = fs.existsSync(rp) && fs.statSync(rp).isDirectory() ? fs.readdirSync(rp).filter((f) => f.endsWith(".json")).map((f) => path.join(rp, f)) : [rp];
      for (const f of files) {
        const rec = JSON.parse(fs.readFileSync(f, "utf8"));
        const { fail } = await runOnce(browser, url, rec.scenario, { actions: rec.actions });
        if (fail && fail.kind === rec.fail.kind) { bad++; console.log(`✗ まだ起きる: ${path.basename(f)}（${fail.kind}：${fail.detail}）`); }
        else console.log(`✓ 起きない: ${path.basename(f)}（${rec.fail.kind}：${rec.note || rec.fail.detail}）`);
      }
    } else {
      const runs = +opt("--runs", 12), steps = +opt("--steps", 50), seed0 = +opt("--seed", 1);
      const out = path.resolve(opt("--out", path.join(root, "qa-report", "explore")));
      const seen = new Set();
      // はじめて開いた人に、長い「遊び方」の窓を出していないか（練習の1問と吹き出しにする。2026-11-22 satou さん「すべて対応」。incidents/2026-11-22-first-howto-left.md）
      {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
        const p = await ctx.newPage();
        await p.route("**/*", (route) => (new URL(route.request().url()).host === new URL(url).host ? route.continue() : route.abort()));
        await p.goto(url); await p.waitForTimeout(800);
        const how = await p.evaluate(() => [...document.querySelectorAll("dialog[open]")].map((d) => d.id || "dialog").join(","));
        const hid = await p.evaluate(() => !!document.querySelector("#core-coach[hidden]"));
        await ctx.close();
        // 吹き出しを作ったのに、付ける所が無くて隠れたまま（練習が始まらずホームに戻った など。2026-11-22 地図記号よみ・お札のひみつ）
        if (hid) { bad++; console.log("✗ はじめての吹き出しが隠れたまま（付ける所が画面に無い。first-play の sel・練習の始め方を見る）"); }
        if (how) { bad++; console.log(`✗ はじめて開くと遊び方の窓（${how}）が出る（練習の1問と吹き出しにする。node scripts/sync-template.mjs で写すか、形がちがえば firstPlay を手で）`); }
        else console.log("✓ はじめて開いても、遊び方の窓は出ない");
      }
      for (let k = 0; k < runs; k++) {
        const sc = scenario(seed0 + k);
        const { fail, log } = await runOnce(browser, url, sc, { steps });
        if (!fail) { console.log(`✓ 種 ${sc.seed}：${steps}回の操作で見つからない（${sc.size.join("x")}・${sc.clock.name}${sc.corrupt ? "・壊した記録" : ""}${sc.quotaAt >= 0 ? "・保存失敗" : ""}${sc.tabAt >= 0 ? "・2つ目のタブ" : ""}）`); continue; }
        const sig = sigOf(fail);
        if (seen.has(sig)) { console.log(`・ 種 ${sc.seed}：同じ不具合（${sig}）`); continue; }
        seen.add(sig); bad++;
        let small = await shrink(browser, url, sc, log, fail);
        let check = await runOnce(browser, url, small.sc, { actions: small.actions });
        if (!check.fail || check.fail.kind !== fail.kind) { small = { sc, actions: log }; check = await runOnce(browser, url, sc, { actions: log }); } // 短くすると起きないときは元の手順で残す
        const rec = { game: path.basename(root), sig, found: new Date().toISOString().slice(0, 10), fail: check.fail || fail, scenario: small.sc, actions: small.actions, how: `node scripts/game-explore.mjs <ゲーム> --replay repro-${sig}.json` };
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, `repro-${sig}.json`), JSON.stringify(rec, null, 1) + "\n");
        console.log(`✗ 種 ${sc.seed}：${rec.fail.kind}：${rec.fail.detail}（手順 ${log.length}→${small.actions.length}）→ ${path.relative(process.cwd(), path.join(out, `repro-${sig}.json`))}${check.fail ? "" : "（手順を動かし直しても起きなかった。ときどきだけ起きる不具合かもしれない）"}`);
      }
    }
  } finally { await browser.close(); srv.close(); }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
