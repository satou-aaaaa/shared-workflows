// ゲームの共通部品 game-core。ひな形: satou-aaaaa/shared-workflows の template/core/core.js。
// ゲームでは直さない。index.html の core:begin〜core:end の印のあいだに node scripts/sync-template.mjs <ゲームのフォルダ> で写す
// （ファイルを足さないので sw.js の SHELL は変えない）。ゲームからは window.Core で使う。
// 共通部品の版: 3
//   1: 2026-11-21 ゲームごとに手で写していた小さな関数を1か所に集めた。40本で同じ役目の関数が何通りにも分かれ
//      （お知らせの帯 11通り・振動 10通り・文字を安全にする esc 4通り・数の読み込み num 2通り）、
//      「動きを減らす」でも振動する・お知らせが読み上げられない・num の直し（#410）が22本に届かない・esc が " を変えない、が起きていた
//      （incidents/2026-11-21-hand-copied-helpers-drift.md）。
//      あわせて、はじめて遊ぶ人への案内（吹き出し Core.coach）を足した。長い「遊び方」の窓の代わりに、練習の1問を遊びながら
//      その場で一言ずつ教える（NN/g「Mobile Instructional Overlays」・Andersen ほか CHI 2012「The Impact of Tutorials on Games of Varying Complexity」）。
//   3: 2026-11-22 吹き出しを出しているあいだ 0.4 秒ごとに場所を測り直す（古い場所に残って押す所を隠すことがあった）。ボタンの字を「案内を閉じる」に。
//      段の wait（その所が出るまで待つ）を足した。全ゲームの「はじめての練習」を sync-template の migrateFirstPlay が足すため
//   2: 2026-11-22 感想フォームのゲーム名を、渡さなければ題（<title>）から入れる。sync-template が全ゲームを game-core に切り替える（migrateCore）ため
// 決まり: 外へ通信しない。ゲームの関数の名前（toast・buzz など）は上書きしない（Core.toast などで呼ぶ）。
(function () {
  "use strict";
  if (window.Core && window.Core.v) return;
  const J = 9 * 3600e3, DAY = 864e5;
  const doc = document;

  // ---- 設定 ----
  // 「動きを減らす」（見やすさの設定 a11y-calm・端末の設定）を選んでいるか
  function calm() {
    try {
      if (window.A11y && typeof A11y.on === "function" && A11y.on("calm")) return true;
      if (doc.documentElement.classList.contains("a11y-calm")) return true;
      return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  // ---- 文字と数 ----
  // HTML の文にも属性（"…"・'…'）にも入れてよい形にする
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ESC[c]);
  // 記録から読んだ数：0 以上の整数だけ。配列・true・オブジェクトは 0（+[5] が 5 になるのを防ぐ。#410）
  const num = (v) => ((typeof v === "number" || typeof v === "string") && v !== "" && Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);

  // ---- 日付（日本時間。"YYYY-MM-DD" の文字で持つ）----
  const jstNow = () => new Date(Date.now() + J);
  const today = () => jstNow().toISOString().slice(0, 10);
  const addDays = (k, n) => new Date(Date.parse(k) + n * DAY).toISOString().slice(0, 10);
  const prevDay = (k) => addDays(k, -1);
  const nextDay = (k) => addDays(k, 1);
  const md = (k) => `${+k.slice(5, 7)}/${+k.slice(8, 10)}`;
  const dayNo = (k, epoch) => Math.round((Date.parse(k) - Date.parse(epoch)) / DAY) + 1;
  const ymOf = (k) => k.slice(0, 7);
  const ymAdd = (ym, n) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
  // 次の日（日本時間の0時）まで
  function untilNext() { const ms = DAY - (jstNow().getTime() % DAY), m = Math.ceil(ms / 6e4); return `${Math.floor(m / 60)}時間${m % 60}分`; }
  // 続けて遊んだ日数（今日まだ遊んでいなければ昨日から数える。責めない数え方）
  function streak(days) { if (!days || typeof days !== "object") return 0; let k = today(), n = 0; if (!days[k]) k = prevDay(k); while (Object.prototype.hasOwnProperty.call(days, k) && days[k]) { n++; k = prevDay(k); } return n; }

  // ---- 読み上げ・お知らせ・振動 ----
  let live = null;
  function liveEl() {
    if (live && live.isConnected) return live;
    live = doc.createElement("div");
    live.id = "core-live"; live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0";
    (doc.body || doc.documentElement).appendChild(live);
    return live;
  }
  // 読み上げソフトに伝える（画面には出さない）。同じ文でももう一度読むよう、いったん空にしてから入れる
  function say(t) { const l = liveEl(); l.textContent = ""; setTimeout(() => { l.textContent = String(t); }, 30); }
  // 画面の下に短く出すお知らせ。読み上げにも届ける（WCAG 4.1.3）。長い文ほど長く出す（読み終える前に消さない）
  let toastT = 0;
  function toast(t, ms) {
    doc.querySelectorAll(".toast.core-toast").forEach((x) => x.remove());
    const d = doc.createElement("div");
    d.className = "toast core-toast"; d.setAttribute("aria-hidden", "true"); d.textContent = String(t);
    (doc.body || doc.documentElement).appendChild(d);
    say(t);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), ms || Math.min(6000, Math.max(2000, String(t).length * 120)));
  }
  // 振動（「動きを減らす」のときは震わせない）
  function buzz(n) { if (calm()) return; try { if (navigator.vibrate) navigator.vibrate(n == null ? 12 : n); } catch (e) { /* 震えない端末 */ } }

  // ---- 保存できないときの帯 ----
  // 保存に失敗しているあいだ、画面のいちばん上に消えない帯を出す（ボタンに重ならないよう sticky で場所を取る）。保存できたら消す
  const SAVE_W = "この端末に記録を保存できませんでした。ページを開き直すと、いまの記録が消えます";
  function saveWarn(on) {
    let b = doc.getElementById("savewarn");
    if (!on) { if (b) b.remove(); return; }
    if (b) return;
    b = doc.createElement("div");
    b.id = "savewarn"; b.setAttribute("role", "alert"); b.textContent = SAVE_W;
    b.style.cssText = "position:sticky;top:0;z-index:9999;padding:8px 12px;background:#fff3cd;color:#000;font-size:15px;line-height:1.5;text-align:center;pointer-events:none;border-bottom:2px solid #8a6d00";
    (doc.body || doc.documentElement).prepend(b);
  }

  // ---- はじめての案内（吹き出し）----
  // Core.coach.start(steps, { onEnd(done), home }) で、1つずつ吹き出しを出す。home はホームを描く関数（Core.coach.leave() が使う）。steps の1つは
  //   { sel: "#choices", text: "…", until: "#after .ok", button: "つぎへ" } の形（オブジェクト）
  //   sel   …… 吹き出しを付ける所。まだ画面に無いあいだは待つ（ゲームが画面を作り直しても付け直す）
  //   until …… その所が画面に出たら次へ進む（答えた・正解した など）。無ければ sel を押したら次へ
  //   button …… 押すと次へ進むボタンの字（読むだけの吹き出し）
  //   wait  …… その所が画面に出るまで、この吹き出しは出さずに待つ（答えたあとにだけ「次へ」を指す など）
  //   pos   …… "below"（既定）か "above"。その側に場所が無ければ、ページを少し動かして場所を空ける（読む所を隠さないため）
  // 吹き出しは押す所を隠さない（上か下の空いたほうに出す）。「案内を閉じる」と Esc でいつでもやめられる。
  const coach = (() => {
    let steps = null, i = 0, opt = {}, box = null, tgt = null, mo = null, raf = 0, shown = -1, tick = 0;
    function css() {
      if (doc.getElementById("core-coach-css")) return;
      const s = doc.createElement("style");
      s.id = "core-coach-css";
      s.textContent = "#core-coach{position:fixed;z-index:9998;box-sizing:border-box;width:min(340px,calc(100vw - 32px));padding:10px 12px;border-radius:14px;background:#1d2320;color:#fff;font:600 16px/1.55 system-ui,sans-serif;box-shadow:0 8px 24px #0006}"
        + "#core-coach p{margin:0 0 6px}#core-coach .core-coach-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}"
        + "#core-coach button{min-height:44px;min-width:44px;padding:0 14px;border-radius:10px;border:2px solid #fff;background:#fff;color:#1d2320;font:700 15px/1 system-ui,sans-serif;cursor:pointer}"
        + "#core-coach button.core-coach-skip{background:transparent;color:#fff}"
        + "#core-coach .core-coach-n{font-size:13px;opacity:.85;margin-right:auto;align-self:center}"
        + ".core-coach-on{outline:3px dashed #e0a000!important;outline-offset:3px!important}";
      (doc.head || doc.documentElement).appendChild(s);
    }
    const visible = (el) => !!(el && el.isConnected && el.getClientRects().length);
    const find = (sel) => { if (!sel) return null; const all = doc.querySelectorAll(sel); for (const el of all) if (visible(el)) return el; return null; };
    function mark(el) { if (tgt === el) return; if (tgt) tgt.classList.remove("core-coach-on"); tgt = el; if (tgt) tgt.classList.add("core-coach-on"); }
    function build() {
      box = doc.createElement("div");
      box.id = "core-coach"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "false"); box.setAttribute("aria-label", "はじめての案内");
      box.innerHTML = '<p id="core-coach-t"></p><div class="core-coach-row"><span class="core-coach-n" aria-hidden="true"></span><button type="button" class="core-coach-skip">案内を閉じる</button><button type="button" class="core-coach-go" hidden></button></div>';
      box.querySelector(".core-coach-skip").onclick = () => stop(false);
      box.querySelector(".core-coach-go").onclick = () => advance();
      (doc.body || doc.documentElement).appendChild(box);
    }
    function place() {
      raf = 0;
      if (!steps) return;
      // 先へ進む所がもう出ていたら、その段は飛ばす（正解したら2段目の無い問題など）
      while (steps && i < steps.length && steps[i].until && find(steps[i].until)) i++;
      if (!steps) return;
      if (i >= steps.length) return stop(true);
      const st = steps[i], el = st.wait && !find(st.wait) ? null : find(st.sel);
      if (!el) { box.hidden = true; mark(null); return; }
      box.hidden = false; mark(el);
      const fresh = shown !== i;
      if (fresh) {
        shown = i;
        box.querySelector("#core-coach-t").textContent = st.text;
        box.querySelector(".core-coach-n").textContent = steps.length > 1 ? `${i + 1}/${steps.length}` : "";
        const go = box.querySelector(".core-coach-go");
        go.hidden = !st.button; go.textContent = st.button || "";
        say(st.text);
        // ゲームがあとからページを動かす（正解のあとに「次へ」を見せる など）ことがあるので、少しのあいだ測り直す
        for (const ms of [120, 350, 800]) setTimeout(sched, ms);
        const r0 = el.getBoundingClientRect();
        if (r0.top < 0 || r0.bottom > innerHeight) el.scrollIntoView({ block: "center" }); // すぐ動かす（なめらかに動かすと、場所を測る前に動き続ける）
      }
      // 画面の下の端は、見やすさの設定のボタン（左下）に重ならないよう BOTTOM だけ空ける
      const w = box.offsetWidth, h = box.offsetHeight, vw = doc.documentElement.clientWidth || innerWidth, vh = innerHeight, gap = 12, BOTTOM = 60, want = st.pos === "above" ? "above" : "below";
      let r = el.getBoundingClientRect();
      if (fresh) {
        // はじめて出すときだけ、決めた側に場所が無ければページを動かして空ける（押す所は画面に残す）
        const need = want === "below" ? r.bottom + gap + h + BOTTOM - vh : gap + h + 8 - r.top;
        if (need > 0) {
          const dy = want === "below" ? Math.min(need, Math.max(0, r.top - 8)) : -need;
          if (dy) { scrollBy(0, dy); r = el.getBoundingClientRect(); }
        }
      }
      const below = vh - BOTTOM - r.bottom - gap, above = r.top - gap - 8;
      const fitB = below >= h, fitA = above >= h;
      let top = want === "below" ? (fitB ? r.bottom + gap : fitA ? r.top - gap - h : null) : (fitA ? r.top - gap - h : fitB ? r.bottom + gap : null);
      if (top === null) top = below >= above ? vh - h - BOTTOM : 8;
      top = Math.max(8, Math.min(top, vh - h - 8));
      const left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, vw - w - 16));
      box.style.top = Math.round(top) + "px"; box.style.left = Math.round(left) + "px";
    }
    const sched = () => { if (!raf) raf = requestAnimationFrame(place); };
    function advance() { if (!steps) return; i++; shown = -1; sched(); }
    function onClick(e) {
      if (!steps || (box && box.contains(e.target))) return;
      const st = steps[i];
      if (!st || st.until || st.button) return;
      if (st.sel && e.target.closest && e.target.closest(st.sel)) setTimeout(advance, 0); // ゲームが押した所を描き直してから次へ
    }
    function onKey(e) { if (steps && e.key === "Escape" && !doc.querySelector("dialog[open]")) stop(false); }
    function start(list, o) {
      stop(null);
      steps = (list || []).filter((x) => x && x.text); i = 0; shown = -1; opt = o || {};
      if (!steps.length) { steps = null; return; }
      css(); build();
      mo = new MutationObserver(sched); mo.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
      addEventListener("resize", sched); addEventListener("scroll", sched, true);
      // 見た目だけの変化（開く動き・字の読み込み・あとから出る絵）は上の知らせが来ないことがあるので、出ているあいだは少しずつ測り直す。
      // 吹き出しが古い場所に残って押す所を隠し、押せなくなっていた（2026-11-22 練習の1問の QA が GitHub の上でだけ止まった）
      tick = setInterval(sched, 400);
      doc.addEventListener("click", onClick, true); doc.addEventListener("keydown", onKey, true);
      sched();
    }
    // done: true（最後まで進んだ）・false（とじた）・null（ほかの案内に替えた。onEnd は呼ばない）
    function stop(done) {
      if (!steps) return;
      const o = opt;
      steps = null; opt = {};
      if (mo) mo.disconnect(); mo = null;
      removeEventListener("resize", sched); removeEventListener("scroll", sched, true);
      clearInterval(tick); tick = 0;
      doc.removeEventListener("click", onClick, true); doc.removeEventListener("keydown", onKey, true);
      if (raf) cancelAnimationFrame(raf); raf = 0;
      mark(null);
      if (box) box.remove(); box = null;
      if (done !== null && typeof o.onEnd === "function") { try { o.onEnd(done); } catch (e) { setTimeout(() => { throw e; }); } }
    }
    // 案内をやめてホームへもどる（QA の共通部品が、はじめての練習を飛ばしてホームから測るのに使う）
    function leave() { const h = opt.home; stop(false); if (typeof h === "function") h(); }
    return { start, stop, leave, active: () => !!steps, step: () => (steps ? i : -1) };
  })();

  // ---- 感想・不具合のフォーム（全ゲームで1つの Googleフォーム。事前入力のリンクでゲーム名と付属情報を入れる）----
  // 送る人が入力するのは「内容」の1か所だけ（必須はそれだけ）。名前・メール・遊んだ記録の中身は入れない。
  // 付属情報はフォームに見える形で入り、送る前に本人が消せる。フォームの entry 番号は Googleフォームの「事前入力した URL を取得」で確かめたもの
  // （Google ドキュメント エディタ ヘルプ「回答をあらかじめ入力したフォームを送信する」）
  const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSftS0o3joZDdMLIBL_czoEonBo2tu9_ilndrUc89b2Waktmvw/viewform";
  // 番号は数の足し算で書く（ゲームの QA が短い番号を写し元の言葉として探すことがある。incidents/2026-11-22-core-text-tripped-game-qa.md）
  const ENTRY = { kind: `entry.${241861100 + 88}`, game: "entry.443796210", info: "entry.1094269478" };
  const KINDS = { fun: "感想", bug: "不具合（動かない・表示がおかしい）", data: "問題・答え・出典のまちがい", wish: "要望" };
  // 最後に出たエラー（付属情報に短く入れる。ファイル名と行だけ。URL の残りは入れない）
  let lastErr = "";
  const short = (t) => String(t || "").replace(/https?:\/\/[^\s)]*\/([^/\s)?#]+)/g, "$1").replace(/\s+/g, " ").slice(0, 200);
  try {
    addEventListener("error", (e) => { lastErr = short(`${e.message || "エラー"}${e.filename ? ` (${e.filename}:${e.lineno || 0})` : ""}`); });
    addEventListener("unhandledrejection", (e) => { lastErr = short(`Promise: ${e.reason && e.reason.message ? e.reason.message : e.reason}`); });
  } catch (e) { /* 古いブラウザ */ }
  // ゲームの版：sw.js の保存箱の名前（例 game-v12）。ゲームごとに版の数を書かなくてよいように、ここで読む
  let cacheVer = "";
  try { if (window.caches && caches.keys) caches.keys().then((k) => { cacheVer = k.filter((x) => /-v\d+$/.test(x)).sort().pop() || ""; }, () => {}); } catch (e) { /* 使えない */ }
  // ブラウザと OS の名前だけ（細かい版や機種名は入れない）
  function envName() {
    const u = (navigator.userAgent || "");
    const os = /iPhone|iPad|iPod/.test(u) ? "iOS" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "Mac" : /CrOS/.test(u) ? "ChromeOS" : /Linux/.test(u) ? "Linux" : "その他";
    const br = /Edg\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "その他";
    return `${br} / ${os}`;
  }
  // 付属情報の文（1行ずつ）。o には game・ver・screen・q を入れる
  function feedbackInfo(o) {
    o = o || {};
    const a11y = [...doc.documentElement.classList].filter((c) => /^a11y-/.test(c)).map((c) => c.slice(5)).join(",");
    return [
      `ゲーム: ${o.game || (doc.title || "").slice(0, 40)}`,
      `版: ${o.ver || cacheVer || "?"} / 共通部品 core ${Core.v}`,
      o.screen ? `画面: ${o.screen}` : "",
      o.q ? `問題: ${o.q}` : "",
      `画面の大きさ: ${innerWidth}x${innerHeight}`,
      `ブラウザ: ${envName()}`,
      `日付: ${today()}`,
      a11y ? `見やすさ: ${a11y}` : "",
      lastErr ? `最後のエラー: ${lastErr}` : "",
    ].filter(Boolean).join("\n");
  }
  // 感想フォームのリンク。kind は fun（感想）・bug（不具合）・data（問題のまちがい）・wish（要望）
  function feedbackUrl(o) {
    o = o || {};
    const p = new URLSearchParams();
    p.set("usp", "pp_url");
    p.set(ENTRY.kind, KINDS[o.kind] || KINDS.fun);
    p.set(ENTRY.game, String(o.game || doc.title || "").slice(0, 80)); // 渡さなければ題（<title>）をゲーム名にする
    p.set(ENTRY.info, feedbackInfo(o));
    return `${FORM}?${p.toString()}`;
  }
  // href を押したその時の情報で作り直す（data-feedback="fun|bug|data|wish" を付けた a）。開く前に作るので、画面の大きさ・最後のエラーが新しい
  function bindFeedback(o) {
    doc.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[data-feedback]") : null;
      if (!a) return;
      const x = Object.assign({}, typeof o === "function" ? o() : o, { kind: a.getAttribute("data-feedback") || "fun" });
      a.href = feedbackUrl(x); a.target = "_blank"; a.rel = "noopener";
    }, true);
  }

  window.Core = { v: 3, calm, esc, num, jstNow, today, addDays, prevDay, nextDay, md, dayNo, ymOf, ymAdd, untilNext, streak, say, toast, buzz, saveWarn, coach, feedbackUrl, feedbackInfo, bindFeedback };
})();
