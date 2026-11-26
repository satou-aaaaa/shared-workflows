// ゲームの共通部品 kiroku（成績のまとめ・更新のお知らせ・長く遊んだら知らせる）。ひな形: satou-aaaaa/shared-workflows の template/kiroku/kiroku.js。
// ゲームでは直さない。index.html の kiroku:begin〜kiroku:end の印のあいだに node scripts/sync-template.mjs <ゲームのフォルダ> で写す。
// ゲームからは window.Kiroku で使う。外へは何も送らない（端末の localStorage だけ。2026-11-26 satou さん「個人データはとらない」）。
// 版: 1（2026-11-26）
//   成績：ホームを描くたびに Kiroku.note(() => ({ s, tally, ach })) で、このゲームの成績のまとめ（遊んだ日・正解・続けた日・自己ベスト・実績）を
//         kiroku-v1 に書く。同じサイト（satou-aaaaa.github.io）の全ゲームで1つを共有するので、フッターの「成績」から全部のゲームの成績が同じ形で見られる。
//   お知らせ：ゲームが新しくなったとき、画面の下に一度だけ「ここが変わりました」を出す（画面のいちばん上に、ほかの物に重ねずに出す。閉じるまで残る。読み上げにも届く。WCAG 4.1.3 Status Messages）。
//         全ゲーム共通の知らせは下の COMMON_NEWS、ゲームだけの知らせは index.html の script 要素（type は application/json、id は game-news）に [{"d":"2026-11-26","t":"…"}] を書く。
//         はじめて遊ぶ人には出さない（見たことにする）。どこまで見たかは news-v1。
//   長く遊んだら知らせる：見やすさの設定「長く遊んだら知らせる」（A11y.get("rest")。既定 60 分・切れる）の時間だけ遊んだら、ホームに戻った区切りで一度だけ知らせる。
//         画面に触った・キーを押したあとの2分間だけを遊んだ時間として数え、画面が隠れているあいだは数えない（LAST TELL の「長く遊んだら、ひと息」と同じ数え方）。
//         時間は保存しない。60 分は厚生労働省「情報機器作業における労働衛生管理のためのガイドライン」（2019）の「一連続作業時間が1時間を超えないように」に合わせた。
(function () {
  "use strict";
  if (window.Kiroku && window.Kiroku.v) return;
  const doc = document;
  const KEY = "kiroku-v1", NEWS = "news-v1";
  // 全ゲーム共通の知らせ（新しいものを上に。日付は日本時間の YYYY-MM-DD）
  const COMMON_NEWS = [
    { d: "2026-11-26", t: "「見やすさ」から、文字の大きさ（小・中・大）と、長く遊んだら知らせる時間を選べるようになりました。どのゲームにも同じ設定が使われます。フッターの「成績」で、遊んだゲームの成績をまとめて見られます。" },
  ];
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const n0 = (v) => (window.Core ? Core.num(v) : Math.max(0, Math.floor(+v) || 0));
  // HTML に入れる文字は必ずここを通す（Core が無いページでも < " などを替える。2026-11-26 CodeQL「DOM text reinterpreted as HTML」）
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ESC[c]);
  const today = () => (window.Core ? Core.today() : new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
  // このゲームの名前（URL の最初の段。手元で開いたときは local）と題
  const id = () => (location.pathname.split("/").filter(Boolean)[0] || "local").replace(/[^\w-]/g, "");
  const title = () => { const h = doc.querySelector("h1"); return ((h && h.textContent) || doc.title || id()).replace(/\s+/g, " ").trim().slice(0, 40); };

  // ---- 成績 ----
  let noted = false;
  function note(fn) {
    let o = {};
    try { o = (typeof fn === "function" ? fn() : fn) || {}; } catch (e) { o = {}; }
    const s = o.s && typeof o.s === "object" ? o.s : {}, t = o.tally && typeof o.tally === "object" ? o.tally : {};
    const days = s.days && typeof s.days === "object" ? s.days : {};
    const r = {
      name: title(),
      played: n0(t.played != null ? t.played : t.days != null ? t.days : Object.keys(days).length),
      solved: t.solved != null ? n0(t.solved) : null,
      streak: window.Core ? Core.streak(days) : 0,
      best: s.ebest != null ? n0(s.ebest) : t.ebest != null ? n0(t.ebest) : null,
      ach: Array.isArray(o.ach) && o.ach.length === 2 ? [n0(o.ach[0]), n0(o.ach[1])] : null,
      last: today(),
    };
    const fresh = r.played === 0 && !r.solved && !r.best;
    if (!fresh) { const all = read(KEY); all[id()] = r; write(KEY, all); }
    if (!noted) { noted = true; news(fresh); }
    atHome();
  }
  function rows() {
    const all = read(KEY), me = id();
    return Object.entries(all).filter(([k, r]) => /^[\w-]+$/.test(k) && r && typeof r === "object")
      .sort(([a, x], [b, y]) => (a === me ? -1 : b === me ? 1 : String(y.last || "").localeCompare(String(x.last || ""))));
  }
  const cell = (v) => (v == null ? "—" : esc(v));
  let dlg = null, lastFocus = null;
  function open() {
    if (!dlg) {
      dlg = doc.createElement("dialog");
      dlg.className = "kiroku-dlg"; dlg.setAttribute("aria-labelledby", "kiroku-h");
      doc.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => { if (e.target.closest("[data-kiroku-close]")) close(); });
      dlg.addEventListener("close", () => { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    }
    const rs = rows(), me = id();
    dlg.innerHTML = `<h2 id="kiroku-h">成績</h2><p>この端末で遊んだゲームの成績です。外へは送りません。</p>` +
      (rs.length ? `<div class="kiroku-wrap"><table><caption class="kiroku-cap">遊んだゲーム ${rs.length}本</caption><thead><tr><th scope="col">ゲーム</th><th scope="col">遊んだ日</th><th scope="col">正解</th><th scope="col">続けた日</th><th scope="col">自己ベスト</th><th scope="col">実績</th><th scope="col">最後</th></tr></thead><tbody>` +
        rs.map(([k, r]) => `<tr${k === me ? ' class="kiroku-me"' : ""}><th scope="row">${k === me || k === "local" ? cell(r.name) : `<a href="../${esc(k)}/">${cell(r.name)}</a>`}</th><td data-l="遊んだ日">${cell(r.played)}</td><td data-l="正解">${cell(r.solved)}</td><td data-l="続けた日">${cell(r.streak)}</td><td data-l="自己ベスト">${cell(r.best)}</td><td data-l="実績">${r.ach ? `${r.ach[0]}/${r.ach[1]}` : "—"}</td><td data-l="最後">${r.last ? esc(String(r.last).slice(5).replace("-", "/")) : "—"}</td></tr>`).join("") +
        `</tbody></table></div>` : `<p>まだ記録がありません。1回遊ぶと、ここに出ます。</p>`) +
      `<div class="kiroku-row"><button type="button" class="kiroku-ok" data-kiroku-close>閉じる</button></div>`;
    lastFocus = doc.activeElement;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    if (window.Core && Core.say) Core.say(`成績。遊んだゲーム ${rs.length}本`);
  }
  function close() { if (!dlg) return; if (dlg.close) dlg.close(); else { dlg.removeAttribute("open"); if (lastFocus && lastFocus.focus) lastFocus.focus(); } }
  // フッターに「成績」を足す（ゲームはフッターを JS で何度も描き直すので、描き直すたびに足す。ゲームの footer() の文字は変えない）
  function addEntry() {
    for (const f of doc.querySelectorAll("footer")) {
      if (f.querySelector("[data-kiroku-open]")) continue;
      const a = doc.createElement("a");
      a.href = "#"; a.setAttribute("data-kiroku-open", ""); a.textContent = "成績";
      const after = f.querySelector("[data-a11y-open]");
      if (after) after.after(a); else f.appendChild(a);
    }
  }

  // ---- 知らせの帯（お知らせ・長く遊んだら）。1つずつ、閉じるまで画面の下に出す ----
  const queue = [];
  let bar = null;
  function show(text, done) {
    queue.push([text, done]);
    if (!bar || !bar.isConnected) next();
  }
  function next() {
    const it = queue.shift();
    if (bar) { bar.remove(); bar = null; }
    if (!it) return;
    bar = doc.createElement("div");
    bar.className = "kiroku-bar"; bar.setAttribute("role", "status");
    const p = doc.createElement("p"), btn = doc.createElement("button");
    p.textContent = it[0]; btn.type = "button"; btn.textContent = "わかった"; // 知らせの文は文字として入れる（HTML として読まない）
    bar.append(p, btn);
    btn.addEventListener("click", () => { try { it[1] && it[1](); } catch (e) { /* 書けない */ } next(); });
    doc.body.prepend(bar); // 画面のいちばん上に、ほかの物に重ねずに出す（押す所を隠さない。WCAG 2.4.11）
  }

  // ---- お知らせ ----
  function gameNews() {
    try { const e = doc.getElementById("game-news"); const v = e ? JSON.parse(e.textContent) : []; return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  const ok = (x) => x && typeof x === "object" && /^\d{4}-\d{2}-\d{2}$/.test(x.d) && typeof x.t === "string" && x.t;
  function news(fresh) {
    const seen = read(NEWS), me = id();
    const cn = COMMON_NEWS.filter(ok), gn = gameNews().filter(ok);
    const newest = (l) => l.reduce((m, x) => (x.d > m ? x.d : m), "");
    const mark = () => { const s = read(NEWS); if (cn.length) s["*"] = newest(cn) > (s["*"] || "") ? newest(cn) : s["*"]; if (gn.length) s[me] = newest(gn) > (s[me] || "") ? newest(gn) : s[me]; write(NEWS, s); };
    if (fresh) return mark(); // はじめて遊ぶ人には出さない
    const list = [...cn.filter((x) => x.d > (seen["*"] || "")), ...gn.filter((x) => x.d > (seen[me] || ""))].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 3);
    if (!list.length) return;
    show(`新しくなりました：${list.map((x) => x.t).join(" ")}`, mark);
  }

  // ---- 長く遊んだら知らせる ----
  let playMs = 0, lastIn = -1e9, restDone = false, homeSeen = 0;
  const limit = () => { try { return window.A11y && A11y.get ? +A11y.get("rest") || 0 : 60; } catch (e) { return 60; } };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => addEventListener(t, () => { lastIn = performance.now(); }, { passive: true, capture: true }));
  function restMsg() { const m = limit(); return m >= 60 && m % 60 === 0 ? `${m / 60}時間` : `${m}分`; }
  function restCheck(force) {
    const m = limit();
    if (restDone || !m || playMs < m * 6e4) return;
    // 区切り（ホームに戻ったとき）で出す。ホームを描かないゲームでは、時間になったら出す。区切りが来なくても10分すぎたら出す
    if (!force && homeSeen && playMs < (m + 10) * 6e4) return;
    restDone = true;
    show(`${restMsg()}遊びました。目を休めて、ひと休みしませんか（「見やすさ」で時間を変えたり、切ったりできます）。`);
  }
  function atHome() { homeSeen++; restCheck(true); }
  setInterval(() => { if (!doc.hidden && performance.now() - lastIn < 120000) playMs += 10000; restCheck(false); }, 10000);

  // ---- 見た目 ----
  const css = doc.createElement("style");
  css.id = "kiroku-css";
  css.textContent = `.kiroku-dlg{max-width:min(640px,calc(100vw - 32px));width:100%;box-sizing:border-box;border:2px solid #1d2320;border-radius:14px;padding:18px 16px 14px;background:#fffdf8;color:#1d2320;font:500 16px/1.6 "BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif}
.kiroku-dlg::backdrop{background:#0008}.kiroku-dlg:not([open]){display:none}
.kiroku-dlg h2{font-size:19px;margin:0 0 4px;line-height:1.4}.kiroku-dlg p{margin:4px 0 10px;font-size:14px;color:#3d4440}
.kiroku-wrap{overflow-x:auto;max-height:60vh}.kiroku-dlg table{border-collapse:collapse;width:100%;font-size:14px}
.kiroku-cap{text-align:left;font-size:13px;color:#3d4440;padding-bottom:4px}
.kiroku-dlg th,.kiroku-dlg td{border-top:1px solid #1d232033;padding:8px 6px;text-align:right;white-space:nowrap}
.kiroku-dlg th[scope=row],.kiroku-dlg thead th:first-child{text-align:left;white-space:normal;min-width:7em}
.kiroku-dlg a{color:#1a4fb0;min-height:44px;display:inline-flex;align-items:center}
footer [data-kiroku-open]{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}
.kiroku-me{background:#f1ead8}
@media (max-width:540px){.kiroku-dlg thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.kiroku-dlg tr{display:block;border-top:1px solid #1d232033;padding:6px 4px}.kiroku-dlg th[scope=row]{display:block;border:0;padding:4px 2px}.kiroku-dlg td{display:inline-block;border:0;padding:2px 8px 2px 2px;text-align:left}.kiroku-dlg td::before{content:attr(data-l) " ";color:#3d4440;font-size:12px}}
.kiroku-row{display:flex;justify-content:flex-end;margin-top:12px}
.kiroku-dlg button,.kiroku-bar button{min-height:44px;min-width:44px;border-radius:10px;border:2px solid #1d2320;background:#1d2320;color:#fff;font:700 15px/1.2 "BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif;padding:0 14px;cursor:pointer}
.kiroku-bar{position:relative;z-index:5;margin:8px auto;width:min(560px,calc(100% - 32px));box-sizing:border-box;display:flex;gap:10px;align-items:center;padding:10px 12px;border:2px solid #1d2320;border-radius:12px;background:#fffdf8;color:#1d2320;font:500 15px/1.6 "BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif}
.kiroku-bar p{margin:0;flex:1}`;
  (doc.head || doc.documentElement).appendChild(css);

  function start() {
    addEntry();
    new MutationObserver(() => addEntry()).observe(doc.body, { childList: true, subtree: true });
    doc.addEventListener("click", (e) => { const t = e.target.closest && e.target.closest("[data-kiroku-open]"); if (t) { e.preventDefault(); open(); } });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
  window.Kiroku = { v: 1, note, open, close, rows, news: () => news(false), show, playMinutes: () => Math.floor(playMs / 6e4) };
})();
