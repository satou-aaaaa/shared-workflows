// 古い load() の表（scripts/store-legacy.mjs）を、共通部品 GameStore と読み比べる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 乱数の種つきで2つの写しを3000組作り、古い load() と GameStore.load() の結果をくらべる。
// ちがってよいのは、GameStore の決まり（template/store/store.js の頭）で直した所だけ：終えたとことんを戻さない・終えた回（gone）を消す・
// 済んだ回を戻すかどうか（bank 済み）・それにともなう日の記録。ほかの所が1つでもちがえば落とす（表に足した形が GameStore とちがう）。
import { LEGACY_LOADS } from "./store-legacy.mjs";
import fs from "node:fs"; import vm from "node:vm";
const store = fs.readFileSync(new URL("../template/store/store.js", import.meta.url), "utf8");
let seed = 1; let GONE = false; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(R() * a.length)];
const days = ["2026-11-18", "2026-11-19", "2026-11-20"];
const run = (mode) => R() < 0.25 ? null : { id: pick(["r1", "r2", "r3"]), mode, date: pick(days), res: Array.from({ length: Math.floor(R() * 6) }, () => ({ m: 0 })), cur: R() < 0.5 ? null : { i: 0, tag: "x", wrong: R() < 0.5 ? [] : ["a"], hints: Math.floor(R() * 2) } };
const state = () => { const s = { v: 1, t: Math.floor(R() * 3), days: {}, adays: {}, hdays: {}, dex: {}, kofi: {}, ach: {}, runs: {}, ebest: Math.floor(R() * 5) };
  for (const d of days) if (R() < 0.3) s.days[d] = { m: [0] }; for (const m of ["d", "e", "a"]) if (R() < 0.8) s.runs[m] = run(m);
  if (GONE && R() < 0.4) s.gone = { [pick(["r1", "r2", "r3"])]: 1 }; return s; };
const env = `
const fresh = () => ({ v: 1, t: 0, days: {}, adays: {}, hdays: {}, dex: {}, kofi: {}, ach: {}, runs: {}, ebest: 0 });
const tidy = (s) => s;
const bank = (s, r) => { if (r.res.length >= 5) { s.days[r.date] = s.days[r.date] || { m: [0] }; return true; } return false; };
const doneOf = (r) => r.res.length >= 5;
const bookOf = (s, mode) => mode === "d" ? s.days : mode === "a" ? s.adays : null;
const num = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);
const RECS = ["days", "hdays", "adays", "dex", "runs", "kofi", "ach"];
`;
const errors = [];
for (const L of LEGACY_LOADS) { GONE = /gone/.test(L.old);
  const newF = `function load() { return GameStore.load(KEY, mem, { v: 1, fresh, tidy, bank, doneOf, bookOf${L.opts ? `, ${L.opts}` : ""} }); }`;
  let diff = 0, ex = null; const cats = {};
  for (let i = 0; i < 3000; i++) {
    const A = state(), B = state();
    const res = [];
    for (const f of [L.old, newF]) {
      const ctx = { KEY: "k", mem: JSON.stringify(A), localStorage: { getItem: () => JSON.stringify(B) }, out: null };
      ctx.window = ctx; vm.createContext(ctx); vm.runInContext(store + env + f + "\nout = JSON.stringify(load());", ctx); res.push(ctx.out);
    }
    if (res[0] !== res[1]) { diff++; const o = JSON.parse(res[0]), n = JSON.parse(res[1]);
      for (const m of new Set([...Object.keys(o.runs), ...Object.keys(n.runs)])) { const x = o.runs[m], y = n.runs[m]; if (JSON.stringify(x) === JSON.stringify(y)) continue;
        const cat = !y && x && m === "e" ? "新は終えたとことんを戻さない" : !y && x && [A, B].some((q) => q.gone && q.gone[x.id]) ? "新は gone の回を消す" : !x && y && y.res.length >= 5 ? "新は済んだ回を残す（bank 済み）" : "その他";
        cats[cat] = (cats[cat] || 0) + 1; if (cat === "その他" && !ex) ex = { m, A, B, old: x, neu: y }; }
      if (JSON.stringify({ ...o, runs: 0 }) !== JSON.stringify({ ...n, runs: 0 })) { cats["runs 以外"] = (cats["runs 以外"] || 0) + 1; for (const k in o) if (k !== "runs" && JSON.stringify(o[k]) !== JSON.stringify(n[k])) cats["k:" + k + " " + JSON.stringify(o[k]) + "→" + JSON.stringify(n[k])] = 1; } }
  }
  if (process.argv.includes("-v")) console.log(L.id, L.from, "diff", diff, "/3000", JSON.stringify(cats));
  const bad = Object.keys(cats).filter((k) => k === "その他" || (k.startsWith("k:") && !k.startsWith("k:days ")));
  if (bad.length) { errors.push(`${L.id}（${L.from}）：GameStore と合わせ方がちがう ${bad.join("・")} ${JSON.stringify(ex).slice(0, 400)}`); }
}

if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log(`✓ 古い load() の表（${LEGACY_LOADS.length}通り）が GameStore と同じ合わせ方`);
