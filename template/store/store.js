// 保存の読み直し（2つの写しを合わせる）の共通部品。ひな形: satou-aaaaa/shared-workflows の template/store/store.js。
// ゲームでは直さない。index.html の store:begin〜store:end の印のあいだに node scripts/sync-template.mjs <ゲームのフォルダ> で写す（ファイルを足さないので sw.js の SHELL は変えない）。
// 共通部品の版: 1（上げたら写しの版も上がる。scripts/drift-check.mjs がずれを週次まとめに出す）
//   1: とことんを終えた保存が失敗したあと、読み直しで古い回が戻る不具合が73本に広がっていた（incidents/2026-11-17-endless-revive-after-save-failure.md）。
//      load() の合わせ方を1か所に集め、直すときはここだけ直す。
// 使い方（ゲームの load()）:
//   function load() { return GameStore.load(KEY, mem, { v: 1, fresh, tidy, bank, doneOf, bookOf, objs: ["days", "runs"] }); }
// 決まり（どのゲームでも同じ。変えるときはここと scripts/check-store.mjs を直す）:
//   - 2つの写し（localStorage と、保存に失敗したときの mem）を時刻 t で新しい n・古い o に分ける。
//   - 数は多いほう・true は残す・入れ物は両方を合わせて数は多いほう（field で変えられる）。
//   - 途中経過 runs はモードごと。片方が null（その回を終えた）なら、もう片方の回は
//     済んでいる・記録帳にある・とことん（ended）なら戻さない。
//   - 別の回どうしなら日付の新しいほう（同じ日は n）。古いほうは bank で記録へ入れる。
//   - 同じ回なら進み具合 prog の大きいほう（同じなら n）。join で両方の印を合わせられる。
(function (root) {
  "use strict";
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const VER = 1;

  // 1つの写しを読む（読めない・形がちがう・版がちがうときは null）
  function parse(text, v) {
    if (text === null || text === undefined) return null;
    let x = null;
    try { x = JSON.parse(text); } catch (e) { return null; }
    return isObj(x) && x.v === v ? x : null;
  }

  // 既定の進み具合：答えた数を重く、いまの問題のまちがい・ヒントを軽く見る
  const progOf = (r) => (r && r.res ? r.res.length : 0) * 1000 + (r && r.cur ? (r.cur.wrong || []).length * 10 + (r.cur.hints || 0) : 0);

  // 回以外の記録を合わせる
  function fields(s, n, o, opt) {
    for (const k in o) {
      if (k === "runs" || k === "t") continue;
      const x = o[k], y = n[k];
      if (opt.field) { const r = opt.field(k, x, y, s); if (r !== undefined) { s[k] = r; continue; } }
      if (Array.isArray(x) && Array.isArray(y)) s[k] = y;
      else if (isObj(x) && isObj(y)) {
        s[k] = Object.assign({}, x, y);
        for (const q in x) if (typeof x[q] === "number" && typeof y[q] === "number") s[k][q] = Math.max(x[q], y[q]);
      } else if (typeof x === "number" && typeof y === "number") s[k] = Math.max(x, y);
      else if (x === true) s[k] = true;
    }
  }

  // 片方が null（終えた）・もう片方が途中の回のとき、その回を戻してよいか
  function revive(s, r, m, n, opt) {
    if (!r || opt.bank(s, r) || opt.doneOf(r)) return false;
    // とことんは日付の記録帳を持たない。終えた側（null）が新しければ、古い回を戻さない
    if (opt.ended(r, m) && n.runs[m] === null) return false;
    const bd = opt.bookOf(s, r.mode);
    return opt.strictBook ? !!bd && !bd[r.date] : !bd || !bd[r.date];
  }

  // 途中経過（モードごと）を合わせる
  function runs(s, a, b, n, opt) {
    const ra = isObj(a.runs) ? a.runs : {}, rb = isObj(b.runs) ? b.runs : {};
    s.runs = Object.assign({}, n.runs);
    for (const m of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
      const x = ra[m], y = rb[m];
      if (x === undefined || y === undefined) { if (x || y) s.runs[m] = x || y; continue; }
      if (!x || !y) { const r = x || y; if (revive(s, r, m, n, opt)) s.runs[m] = r; continue; }
      if (!opt.same(x, y, m)) {
        if (opt.differ) { opt.differ(s, x, y, m, n); continue; }
        const dx = x.date || "", dy = y.date || "";
        if (dx === dy && !opt.bankTie) continue; // 同じ日の別の回は新しい写しのまま
        const [w, l] = dx > dy ? [x, y] : dx < dy ? [y, x] : n.runs[m] === x ? [x, y] : [y, x];
        opt.bank(s, l);
        s.runs[m] = w;
        continue;
      }
      const px = opt.prog(x), py = opt.prog(y), w = px > py ? x : py > px ? y : n.runs[m], l = w === x ? y : x;
      s.runs[m] = w && l && opt.join ? opt.join(w, l, m) : w;
    }
  }

  // 2つの写しを合わせる（どちらか null なら、ある方に足りない置き場を補うだけ）
  function merge(a, b, opt) {
    opt = Object.assign({
      tidy: (s) => s, objs: [], bank: () => false, doneOf: () => false, bookOf: () => null, strictBook: false,
      ended: (r) => r.mode === "e", same: (x, y) => x.id === y.id, prog: progOf, bankTie: false,
    }, opt);
    if (typeof opt.fresh !== "function") throw new Error("GameStore: fresh が要る");
    a = isObj(a) && a.v === opt.v ? a : null;
    b = isObj(b) && b.v === opt.v ? b : null;
    if (!a || !b) {
      const s = Object.assign(opt.fresh(), a || b || {});
      for (const q of opt.objs) if (!isObj(s[q])) s[q] = {};
      return opt.tidy(s);
    }
    a = Object.assign(opt.fresh(), a);
    b = Object.assign(opt.fresh(), b);
    const [n, o] = (a.t || 0) >= (b.t || 0) ? [a, b] : [b, a];
    const s = Object.assign(opt.fresh(), n);
    fields(s, n, o, opt);
    runs(s, a, b, n, opt);
    if (opt.after) opt.after(s, n, o);
    return opt.tidy(s);
  }

  // localStorage の写しと mem（保存に失敗したときの写し）を読んで合わせる
  function load(key, mem, opt) {
    let b = null;
    try { b = parse(root.localStorage.getItem(key), opt.v); } catch (e) {}
    return merge(parse(mem, opt.v), b, opt);
  }

  const api = { VER, parse, merge, load, progOf };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GameStore = api;
})(typeof window !== "undefined" ? window : globalThis);
