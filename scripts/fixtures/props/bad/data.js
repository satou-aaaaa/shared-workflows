// game-props.mjs の Selftest 用の小さな見本（壊れた作り。性質テストが落ちるはず）。ゲームの data.js と同じ形（KINDS・make・dailyTags・hardTags・rng）
(function () {
  const KINDS = [{ id: "a", ans: "ア" }, { id: "b", ans: "イ" }, { id: "c", ans: "ウ" }, { id: "d", ans: "エ" }];
  const ALL = KINDS.map((k) => k.ans);
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function make(tag) {
    const k = KINDS.find((x) => x.id === String(tag).split("|")[0]) || KINDS[0];
    const R = rng(seedOf(tag));
    return { tag, kind: k.id, q: `${k.id} はどれ？`, opts: R() < 0.2 ? [k.ans, k.ans, "オ"] : shuffle(R, ALL), ans: k.ans, n: R() < 0.1 ? NaN : 1, note: R() < 0.1 ? `${k.memo}` : "" };
  }
  function dailyTags(date) { const R = rng(seedOf(date)); return shuffle(R, KINDS).slice(0, 3).map((k, i) => `${k.id}|${date}:d${i}`); }
  function hardTags(date) { return [`d|${date}:h0`]; }
  module.exports = { KINDS, make, dailyTags, hardTags, rng, seedOf };
})();
