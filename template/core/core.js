// ゲームの共通部品 game-core。ひな形: satou-aaaaa/shared-workflows の template/core/core.js。
// ゲームでは直さない。index.html の core:begin〜core:end の印のあいだに node scripts/sync-template.mjs <ゲームのフォルダ> で写す
// （ファイルを足さないので sw.js の SHELL は変えない）。ゲームからは window.Core で使う。
// 共通部品の版: 8
//   1: 2026-11-21 ゲームごとに手で写していた小さな関数を1か所に集めた。40本で同じ役目の関数が何通りにも分かれ
//      （お知らせの帯 11通り・振動 10通り・文字を安全にする esc 4通り・数の読み込み num 2通り）、
//      「動きを減らす」でも振動する・お知らせが読み上げられない・num の直し（#410）が22本に届かない・esc が " を変えない、が起きていた
//      （incidents/2026-11-21-hand-copied-helpers-drift.md）。
//      あわせて、はじめて遊ぶ人への案内（吹き出し Core.coach）を足した。長い「遊び方」の窓の代わりに、練習の1問を遊びながら
//      その場で一言ずつ教える（NN/g「Mobile Instructional Overlays」・Andersen ほか CHI 2012「The Impact of Tutorials on Games of Varying Complexity」）。
//   3: 2026-11-22 吹き出しを出しているあいだ 0.4 秒ごとに場所を測り直す（古い場所に残って押す所を隠すことがあった）。ボタンの字を「案内を閉じる」に。
//      段の wait（その所が出るまで待つ）を足した。全ゲームの「はじめての練習」を sync-template の migrateFirstPlay が足すため
//   2: 2026-11-22 感想フォームのゲーム名を、渡さなければ題（<title>）から入れる。sync-template が全ゲームを game-core に切り替える（migrateCore）ため
//   4: 2026-11-23 画面の切り替え（Core.screens）を足した。1ページに全部を縦に積んで見づらくなるのを、単体の HTML のまま
//      URL の #（例 #kiroku）で画面を分けて止める（routines/ui-rules.md U10〜U12。NN/g「Progressive Disclosure」・Android「Layouts and navigation patterns」）。
//      <section data-screen="home">〜 を置いたページだけで動く（置いていないゲームでは何もしない）
//      JS で描き替えるゲームは、画面の関数の最初で Core.screens.mark("dex")、起動時に Core.screens.route({...}, home) で「戻る」がホームへ戻る
//   5: 2026-11-27 全ゲームで同じ場所（ページのいちばん上の右）に「？ 遊び方」を置く（Core.help）。止まるような不具合が起きたら
//      ページの上に帯を出し、本人が「知らせる」を押したときだけ感想フォームが開く（Core.errBar）。エラーの文は保存も自動送信もしない
//      （satou さん 2026-11-27「個人データ・個人情報をとらない」。外のサーバーへ自動で送ると IP がいつも届くため、自動の通知と集計は作らない）。
//      MDN「Window: error event」「unhandledrejection event」・NN/g「Error-Message Guidelines」（何が起きたか・どうすればよいかを書く）
//   7: 2026-11-27 Ko-fi 応援の一文（Core.kofi）と応援先（Core.KOFI）を足した。201本が同じ一文を手で写し、文言が4通り以上に分かれていた
//      （incidents/2026-11-27-kofi-line-hand-copied.md）。出す条件（初めて・まちがい0・練習でない日だけ）はゲームの記録しだいなので、ゲームに残す
//   8: 2026-11-27 SNS への共有（Core.share）を足した。結果のシェア（X・LINE・端末の共有・コピー）は約200本に同じ5行を手で写していたのを1か所に集め、
//      フッターの「共有」（data-share）からゲームそのものも共有できるようにした（satou さん「全ゲームに SNS 共有」「共通化も」）。
//      X は公式の Web Intent（docs.x.com「Web Intent」: https://x.com/intent/tweet?text=）、LINE は LINE URL スキーム
//      （developers.line.biz「LINE URLスキームでLINEの機能を使う」: https://line.me/R/share?text=）、端末の共有は Web Share API
//      （MDN「Navigator: share()」: 押したその場でだけ呼ぶ・やめたら AbortError）。共有する文は公開の URL（? と # を外す）とゲームの名前・結果だけ
//      （遊ぶ人の名前・引き継ぎの #hk=・記録の中身は入れない）。どれも押した人が自分で選んで進むリンクで、外へ勝手に送らない
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

  // ---- Ko-fi の応援（任意。押すまで外へは通信しない）----
  // 結果の画面に出す一文。lead は「楽しめたら」「役に立ったら」など、what は「新しいゲームづくり」など（ゲームの中身に合わせて渡す）
  const KOFI = "https://ko-fi.com/satouaaaaa";
  function kofi(lead, what) {
    return `<p class="note kofi">${esc(lead || "楽しめたら")}、<a href="${KOFI}" target="_blank" rel="noopener">Ko-fi でコーヒー1杯の応援</a>をもらえると、${esc(what || "新しいゲームづくり")}の励みになります（任意・遊ぶのはずっと無料）。</p>`;
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

  // ---- 画面の切り替え（1つの HTML を # で画面に分ける。routines/ui-rules.md U10〜U12）----
  // 書き方: <section data-screen="home" data-title="ホーム">…</section><section data-screen="kiroku" data-title="記録" hidden>…</section>
  //         入口は <a href="#kiroku">記録</a>。戻るボタン・ブラウザの「戻る」で前の画面へ戻る。最初の data-screen がホーム。
  // 画面が変わると、その画面の最初の見出しへフォーカスを移し（読み上げのため）、上までもどし、"core:screen" を知らせる（detail.id）。
  // ゲームから: Core.screens.go("kiroku")・Core.screens.now()・Core.screens.list()
  // screens.js（単体の部品）を先に読んだページでは、それを使う（2回つながない）
  const screens = window.Screens || (function () {
    // screens:begin（template/screens/screens.js と同じ中身。check-core が比べる。直すときは両方を同じに）
    const all = () => (doc.querySelectorAll ? [...doc.querySelectorAll("[data-screen]")] : []);
    const ids = () => all().map((e) => e.getAttribute("data-screen"));
    let cur = "";
    let baseTitle = "";
    function want() {
      let h = "";
      try { h = decodeURIComponent((location.hash || "").slice(1)); } catch (e) { h = ""; }
      const list = ids();
      return list.includes(h) ? h : list[0] || "";
    }
    function show(id, first) {
      const list = all();
      if (!list.length) return;
      const el = list.find((e) => e.getAttribute("data-screen") === id) || list[0];
      id = el.getAttribute("data-screen");
      for (const e of list) e.hidden = e !== el;
      const t = el.getAttribute("data-title");
      if (!baseTitle) baseTitle = doc.title;
      doc.title = t && id !== list[0].getAttribute("data-screen") ? `${t}｜${baseTitle}` : baseTitle;
      const changed = cur !== id;
      cur = id;
      if (!changed || first) { if (changed) fire(id); return; }
      try { scrollTo(0, 0); } catch (e) { /* 古いブラウザ */ }
      const h = el.querySelector("h1,h2,[data-screen-focus]");
      if (h) { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { /* 無視 */ } }
      fire(id);
    }
    function fire(id) { try { doc.dispatchEvent(new CustomEvent("core:screen", { detail: { id } })); } catch (e) { /* 古いブラウザ */ } }
    function go(id) {
      if (!ids().includes(id)) return;
      if (want() === id) return show(id);
      location.hash = id === ids()[0] ? "" : id; // ホームは # を付けない（共有したURLがホームになる）
    }
    function init() {
      if (!all().length) return;
      // ゲームの CSS が section に display を書いていても、隠した画面は出さない
      const st = doc.createElement("style");
      st.textContent = "[data-screen][hidden]{display:none!important}";
      doc.head.appendChild(st);
      addEventListener("hashchange", () => show(want()));
      show(want(), true);
    }
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
    // ---- JS で描き替える画面（ゲームの帳・カレンダー・実績など）を # と「戻る」につなぐ ----
    // ゲームは画面を app.innerHTML で描き替えるので、そのままでは「戻る」でゲームから出てしまう。
    // 使い方: 画面を描く関数の最初で Core.screens.mark("dex")（ホームは mark("")）。起動時に一度
    //         Core.screens.route({ dex: book, cal: () => cal(), ach: achView }, home)。
    // 履歴はいつも [ホーム] か [ホーム, #画面] の2つまで（画面から画面へは置き換え、ホームへは戻す）。開き直すとホームから。
    const views = new Map(); // Map にする（# から来た名前で Object の関数を呼ばない。CodeQL js/unvalidated-dynamic-method-call）
    let homeFn = null, pushed = false, skipPop = 0, quiet = false;
    const hashName = () => { try { return decodeURIComponent((location.hash || "").slice(1)); } catch (e) { return ""; } };
    const bare = () => location.pathname + location.search;
    // # が画面の名前でないとき（引き継ぎの #hk=… など、ほかの部品の印）は触らない
    const foreign = () => { const h = hashName(); return !!h && !/^[A-Za-z][\w-]*$/.test(h); };
    function mark(name) {
      if (quiet || all().length || !homeFn) return; // data-screen のページ・route の前・戻るで描いている最中は何もしない
      name = name || "";
      if (foreign()) return;
      const now = hashName();
      if (now === name) return;
      try {
        if (!name) {
          if (pushed) { pushed = false; skipPop++; history.back(); } else history.replaceState(null, "", bare());
        } else if (!now) { history.pushState(null, "", "#" + encodeURIComponent(name)); pushed = true; }
        else history.replaceState(null, "", "#" + encodeURIComponent(name));
      } catch (e) { /* 使えない */ }
      fire(name || "home");
    }
    function onPop() {
      if (skipPop) { skipPop--; return; }
      if (foreign()) return;
      const h = hashName();
      const own = !!h && views.has(h);
      if (!own) pushed = false;
      // CodeQL js/unvalidated-dynamic-method-call：# から選んだものは has で確かめ、関数かどうかも見てから呼ぶ
      const fn = own ? views.get(h) : homeFn;
      quiet = true;
      try { if (typeof fn === "function") fn(); } finally { quiet = false; }
    }
    function route(map, home) {
      if (all().length) return;
      for (const k of Object.keys(map || {})) if (typeof map[k] === "function") views.set(k, map[k]);
      // 何度呼んでもよい（ゲームの home() の最初で呼ぶ）。# を消すのは最初の1回だけ（開き直したらホームから。途中の回は続きから出る）
      if (!homeFn) { addEventListener("popstate", onPop); if (hashName() && !foreign()) try { history.replaceState(null, "", bare()); } catch (e) { /* 使えない */ } }
      homeFn = home;
    }
    return { go, now: () => cur, list: ids, show: (id) => show(id), mark, route };
    // screens:end
  })();
  window.Screens = screens;

  // ---- SNS への共有（X・LINE・端末の共有・コピー）----
  // 結果の画面: <div class="shares"><a id="toX" …>Xで投稿</a><a id="toLine" …>LINEで送る</a><button id="copy">コピー</button></div> と
  //            <button id="share">結果をシェア</button> を描いたあとで Core.share.wire(文)。文には SITE（公開の URL）を含める（ハッシュタグは Core が足す）
  // ゲームそのもの: フッターなどに <a href="#" data-share>共有</a>。押すと共有の窓（端末の共有・X・LINE・リンクをコピー）が開く
  // ゲームから: Core.share.links(文) → { x, line }・Core.share.copy(文)・Core.share.send(文)・Core.share.open(文)・Core.share.url()
  const TITLE0 = doc.title || "";
  const share = (() => {
    const X = "https://x.com/intent/tweet?text=", LINE = "https://line.me/R/share?text=";
    // 公開の URL だけ（? と # は外す。引き継ぎの #hk=・画面の名前・記録を外へ出さない）
    const url = () => {
      const m = doc.querySelector ? doc.querySelector('meta[property="og:url"]') : null;
      if (m && /^https:\/\//.test(m.content || "")) return m.content; // 公開の URL（OGP に書いたもの）
      try { return location.origin + location.pathname.replace(/index\.html$/, ""); } catch (e) { return ""; }
    };
    // ゲームの名前：og:title、無ければ開いたときの題（画面の切り替えで「記録｜…」になる前のもの）
    const name = () => { const m = doc.querySelector ? doc.querySelector('meta[property="og:title"]') : null; return String((m && m.content) || TITLE0 || doc.title || "").trim(); };
    const gameText = () => `「${name()}」無料・登録なしで遊べます\n${url()}`;
    // ハッシュタグ：ゲームの名前＋全ゲーム共通の「学べる無料ゲーム」の2つ。
    // X のヘルプ「How to use hashtags」は1つの投稿に2つまでをすすめる。タグに使えない字（空白・？・・ など）は外す（× は「バツ」）。
    // satou さん 2026-11-27「ハッシュタグもつけて、検索しやすいように」
    // ゲーム一覧ページの題「学べる無料ゲーム一覧」から。ゲームにはサークル名を出さない（satou さん 2026-11-24。check-core が見る）
    const TAG_ALL = "学べる無料ゲーム";
    const tagOf = (s) => String(s || "").split(/[：:｜|]/)[0].replace(/×/g, "バツ").replace(/[^\p{L}\p{N}\p{M}_ー]/gu, "").slice(0, 30);
    function tags() {
      const g = tagOf(name());
      return [g && !/^\d+$/.test(g) && g !== TAG_ALL ? g : "", TAG_ALL].filter(Boolean).map((x) => "#" + x).join(" ");
    }
    // 文の最後にタグを1行足す（もう付いていれば足さない）
    const tagged = (t) => { t = String(t); return t.includes("#" + TAG_ALL) ? t : `${t.replace(/\s+$/, "")}\n${tags()}`; };
    const links = (t) => { t = tagged(t); return { x: X + encodeURIComponent(t), line: LINE + encodeURIComponent(t) }; };
    function copy(t) {
      t = tagged(t);
      const done = () => toast("コピーしました"), fail = () => toast("コピーできませんでした");
      try { if (navigator.clipboard && navigator.clipboard.writeText) return void navigator.clipboard.writeText(String(t)).then(done, fail); } catch (e) { /* 使えない */ }
      fail();
    }
    // 端末の共有メニュー（スマホ）。無い・使えないときはコピー。やめた（AbortError）ときは何もしない
    function send(t) {
      t = tagged(t);
      if (!navigator.share) return copy(t);
      try { navigator.share({ text: String(t) }).catch((e) => { if (!e || e.name !== "AbortError") copy(t); }); } catch (e) { copy(t); }
    }
    // 結果の画面のボタン（#toX・#toLine・#copy・#share）をつなぐ。無いボタンは飛ばす
    function wire(t, root) {
      const r = root || doc, q = (id) => (r.querySelector ? r.querySelector("#" + id) : null), l = links(t);
      const x = q("toX"), ln = q("toLine"), c = q("copy"), s = q("share");
      if (x) { x.href = l.x; x.target = "_blank"; x.rel = "noopener"; }
      if (ln) { ln.href = l.line; ln.target = "_blank"; ln.rel = "noopener"; }
      if (c) c.onclick = () => copy(t);
      if (s) s.onclick = () => send(t);
    }
    function css() {
      if (doc.getElementById("core-share-css")) return;
      const s = doc.createElement("style");
      s.id = "core-share-css";
      s.textContent = "#core-share{box-sizing:border-box;width:min(360px,calc(100vw - 32px));padding:16px;border:0;border-radius:16px;background:#1d2320;color:#fff;font:600 16px/1.55 system-ui,sans-serif;box-shadow:0 8px 24px #0006}"
        + "#core-share::backdrop{background:#0008}#core-share h2{margin:0 0 4px;font-size:18px}#core-share p{margin:0 0 12px;font-size:14px;font-weight:400;white-space:pre-wrap;word-break:break-all;opacity:.9}"
        + "#core-share .core-share-row{display:grid;gap:8px}"
        + "#core-share a,#core-share button{box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border-radius:10px;border:2px solid #fff;background:#fff;color:#1d2320;font:700 15px/1.2 system-ui,sans-serif;text-decoration:none;cursor:pointer}"
        + "#core-share .core-share-close{background:transparent;color:#fff}";
      (doc.head || doc.documentElement).appendChild(s);
    }
    // 共有の窓。t を渡さなければ、ゲームそのもの（名前と URL）を共有する
    function open(t) {
      t = tagged(t == null ? gameText() : String(t));
      css();
      let d = doc.getElementById("core-share");
      if (d) d.remove();
      d = doc.createElement("dialog");
      d.id = "core-share"; d.setAttribute("aria-labelledby", "core-share-h");
      const l = links(t);
      d.innerHTML = `<h2 id="core-share-h">共有する</h2><p>${esc(t)}</p><div class="core-share-row">`
        + (navigator.share ? '<button type="button" class="core-share-send">スマホの共有メニュー</button>' : "")
        + `<a class="core-share-x" href="${esc(l.x)}" target="_blank" rel="noopener">Xで投稿</a>`
        + `<a class="core-share-line" href="${esc(l.line)}" target="_blank" rel="noopener">LINEで送る</a>`
        + '<button type="button" class="core-share-copy">文とリンクをコピー</button>'
        + '<button type="button" class="core-share-close">閉じる</button></div>';
      (doc.body || doc.documentElement).appendChild(d);
      const b = (c) => d.querySelector("." + c);
      if (b("core-share-send")) b("core-share-send").onclick = () => send(t);
      b("core-share-copy").onclick = () => copy(t);
      b("core-share-close").onclick = () => d.close();
      d.addEventListener("close", () => d.remove());
      try { d.showModal(); } catch (e) { d.setAttribute("open", ""); }
    }
    // data-share を付けた所を押したら共有の窓を開く（data-share に文があればその文、無ければゲームそのもの）
    if (doc.addEventListener) doc.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("[data-share]") : null;
      if (!a) return;
      e.preventDefault();
      open(a.getAttribute("data-share") || null);
    });
    // 「共有」は2字なので、フッターの字が大きいと幅が 44px に足りない（2026-11-27 古いゲームの QA で見つけた）。押す所は 44px 以上（WCAG 2.5.8・ui-rules U1）
    if (doc.head && doc.createElement) {
      const st = doc.createElement("style");
      st.id = "core-share-min";
      st.textContent = "[data-share]{min-width:44px;justify-content:center;text-align:center}";
      doc.head.appendChild(st);
    }
    return { url, name, tags, tagged, links, copy, send, wire, open };
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
  let fbBound = false;
  function bindFeedback(o) {
    fbBound = true;
    doc.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[data-feedback]") : null;
      if (!a) return;
      const x = Object.assign({}, typeof o === "function" ? o() : o, { kind: a.getAttribute("data-feedback") || "fun" });
      a.href = feedbackUrl(x); a.target = "_blank"; a.rel = "noopener";
    }, true);
  }

  // ---- 遊び方の「？」（全ゲームで同じ場所：ページのいちばん上の右。NN/g「Help and Documentation」：いつでも同じ所から開ける）----
  // ページの上に 52px の場所を空けて置く（浮かせないので、押せる所を隠さない。routines/ui-rules.md U1）。
  // 押すと、ゲームの openHow()（無ければフッターの #f-how、それも無ければ dialog#howto）を開く。遊び方の無いページには出さない。
  function helpOpen() {
    try {
      if (typeof window.openHow === "function") { window.openHow(); return true; }
      const d = doc.getElementById("howto");
      if (d && d.tagName === "DIALOG") { if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); } return true; }
      const f = doc.getElementById("f-how");
      if (f) { f.click(); return true; }
    } catch (e) { setTimeout(() => { throw e; }); }
    return false;
  }
  const helpHas = () => typeof window.openHow === "function" || !!doc.getElementById("howto") || !!doc.getElementById("f-how");
  function help() {
    if (doc.getElementById("core-help") || !doc.body || !helpHas()) return;
    if (!doc.getElementById("core-help-css")) {
      const s = doc.createElement("style");
      s.id = "core-help-css";
      s.textContent = "html.core-helpon{padding-top:52px}"
        + "#core-help{position:absolute;top:4px;right:max(8px,env(safe-area-inset-right,0px));z-index:50;display:inline-flex;align-items:center;gap:4px;min-height:44px;min-width:44px;padding:0 12px;border-radius:22px;border:2px solid #1d2320;background:#fff;color:#1d2320;font:700 15px/1 system-ui,sans-serif;cursor:pointer}"
        + "#core-help b{font-size:18px}"
        + "html.a11y-dark #core-help{background:#22282a;color:#eceae4;border-color:#eceae4}"
        + "#core-err{margin:0;padding:8px 12px;background:#fff3cd;color:#000;border-bottom:2px solid #8a6d00;font:500 15px/1.5 system-ui,sans-serif}"
        + "#core-err p{margin:0 0 6px}#core-err .core-err-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}"
        + "#core-err a,#core-err button{display:inline-flex;align-items:center;min-height:44px;min-width:44px;padding:0 14px;border-radius:10px;border:2px solid #000;background:#fff;color:#000;font:700 15px/1 system-ui,sans-serif;text-decoration:none;cursor:pointer}";
      (doc.head || doc.documentElement).appendChild(s);
    }
    const b = doc.createElement("button");
    b.type = "button"; b.id = "core-help"; b.setAttribute("aria-label", "遊び方");
    b.innerHTML = "<b aria-hidden=\"true\">？</b><span aria-hidden=\"true\">遊び方</span>";
    b.addEventListener("click", helpOpen);
    doc.body.appendChild(b);
    doc.documentElement.classList.add("core-helpon");
  }

  // ---- 止まるような不具合の帯（本人が押したときだけ知らせる）----
  // このページの script のエラーだけを拾う（拡張機能・別のサイトの script の「Script error.」は数えない）。1回開くごとに1度だけ出す。
  // 帯は流れの中に置く（浮かせない）。「知らせる」で感想フォーム（不具合）を開く。付属情報は送る前に本人が見て消せる。何も自動では送らない
  let errShown = false;
  function mine(e) {
    if (!e) return false;
    if (e.type === "unhandledrejection") return true;
    if (!e.message || /^Script error\.?$/i.test(e.message)) return false;
    if (/ResizeObserver loop/i.test(e.message)) return false; // 画面の描き直しの知らせで、動きは止まらない
    const f = e.filename || "";
    try { return !f || new URL(f, location.href).origin === location.origin; } catch (x) { return false; }
  }
  function errBar() {
    if (errShown || !doc.body) return;
    errShown = true;
    const d = doc.createElement("div");
    d.id = "core-err"; d.setAttribute("role", "alert");
    d.innerHTML = "<p>うまく動かない所がありました。ページを開き直すと直ることがあります。</p>"
      + "<div class=\"core-err-row\"><a data-feedback=\"bug\" target=\"_blank\" rel=\"noopener\">不具合を知らせる</a><button type=\"button\">閉じる</button></div>";
    const a = d.querySelector("a");
    a.href = feedbackUrl({ kind: "bug" });
    a.addEventListener("click", () => { a.href = feedbackUrl({ kind: "bug" }); });
    d.querySelector("button").addEventListener("click", () => d.remove());
    doc.body.prepend(d);
  }
  try {
    addEventListener("error", (e) => { if (e instanceof ErrorEvent && mine(e)) setTimeout(errBar, 0); });
    addEventListener("unhandledrejection", (e) => { if (mine(e)) setTimeout(errBar, 0); });
  } catch (e) { /* 古いブラウザ */ }
  // ゲームが遊び方の窓を後から作ることがあるので、読み終えてから置く
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", () => setTimeout(help, 0)); else setTimeout(help, 0);

  // bindFeedback を呼ばないゲーム（形のちがうゲームに sync-template が「感想・質問を送る」を足した所）でも、data-feedback を押せばフォームへ。
  // a でないもの（button）は新しいタブに出す
  if (doc.addEventListener) doc.addEventListener("click", (e) => {
    const a = e.target && e.target.closest ? e.target.closest("[data-feedback]") : null;
    if (!a || (fbBound && a.tagName === "A")) return; // a は bindFeedback が作る（ゲームの付属情報が入る）
    const u = feedbackUrl({ kind: a.getAttribute("data-feedback") || "fun" });
    if (a.tagName === "A") { a.href = u; a.target = "_blank"; a.rel = "noopener"; return; }
    e.preventDefault();
    try { window.open(u, "_blank", "noopener"); } catch (err) { /* 開けない */ }
  }, true);

  window.Core = { v: 8, calm, esc, num, jstNow, today, addDays, prevDay, nextDay, md, dayNo, ymOf, ymAdd, untilNext, streak, say, toast, buzz, saveWarn, coach, feedbackUrl, feedbackInfo, bindFeedback, screens, help: helpOpen, errBar, kofi, KOFI, share };
})();
