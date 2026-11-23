// 画面の切り替え screens.js（1つの HTML を URL の # で画面に分ける）。ひな形: satou-aaaaa/shared-workflows の template/screens/screens.js。
// ゲーム・アプリ・紹介ページ・Artifact のどれでも使える単体の部品（外へ通信しない・ほかの部品が要らない）。ゲームは game-core の Core.screens に同じ中身がある。
// 決まり: routines/ui-rules.md U10〜U12（1画面に目的1つ・見出し5まで・スマホ3画面分まで・行き先5まで・畳みは1段）。
// 部品の版: 1（2026-11-23 satou さん「AI が作るページはペライチが多く見づらい」「他のプロジェクトでも使えるよう標準化」）
// 使い方:
//   1. このファイルを script タグの src="screens.js" で読むか、script タグの中に貼る（Artifact など1ファイルのとき）。
//   2. <section data-screen="home">…</section><section data-screen="kiroku" data-title="記録" hidden>…</section> と並べる（最初がホーム）。
//   3. 入口は <a href="#kiroku">記録</a>、各画面に <a href="#">ホームへ</a>。ブラウザの「戻る」でも戻る。
//   4. 画面が替わったときの描き直しは document.addEventListener("core:screen", (e) => … e.detail.id …)。
//   5. JS から: Screens.go("kiroku")・Screens.now()・Screens.list()
//   6. 画面を JS で描き替えるアプリ（app.innerHTML など）は、描く関数の最初で Screens.mark("dex")（ホームは mark("")）、起動時に Screens.route({ dex: book }, home)。
//      「戻る」でアプリから出ずにホームへ戻る。
// 動きの検査: scripts/check-screens.mjs（Selftest）。ページの分け方の検査: scripts/ui-check.mjs（U10〜U12）。
(function () {
  "use strict";
  if (window.Screens) return;
  const doc = document;
  window.Screens = (function () {
    // screens:begin（template/core/core.js と同じ中身。check-core が比べる。直すときは両方を同じに）
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
})();
