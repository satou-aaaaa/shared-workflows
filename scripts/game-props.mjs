#!/usr/bin/env node
// ゲームの問題の作り方（data.js）を、性質テスト（fast-check）で確かめる。sandbox の ADR-0011 と同じ考え方。
// 決まった種で回す qa/run.mjs とちがい、毎回でたらめな種・日付で何百回も作り、
// 「同じ種なら同じ問題」「空欄・undefined・NaN が出ない」「選び肢が重ならず答えは1つ」などの性質を見る。
// 落ちたら、再現に使う種（FC_SEED）と、いちばん短く縮めた例を出す。
// data.js が make()（と KINDS・dailyTags()）を持たないゲームは何もせずに通す。
//
// 使い方: node scripts/game-props.mjs <ゲームのフォルダ> [...]
//   FC_SEED=<数>  前に落ちた回と同じ種で回し直す
//   FC_RUNS=<数>  1つの性質を何回試すか（既定 200）
// fast-check は呼ぶ側で入れる（game-qa.yml は版を固定して --prefix に入れ、FC_DIR でその場所を渡す）。
// 出典：fast-check「Why Property-Based?」https://fast-check.dev/docs/introduction/why-property-based/
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let fc;
try {
  fc = require(require.resolve("fast-check", { paths: [process.env.FC_DIR, process.cwd(), path.dirname(new URL(import.meta.url).pathname)].filter(Boolean) }));
} catch {
  console.error("✗ fast-check が入っていない（npm i --no-save fast-check@4.10.2）");
  process.exit(2);
}

const RUNS = Number(process.env.FC_RUNS || 200);
const SEED = process.env.FC_SEED ? Number(process.env.FC_SEED) : Date.now() ^ (Math.random() * 2 ** 31);
const BROKEN = /undefined|NaN|\[object Object\]|\$\{|function\s*\(|=>/;

// 問題の中の字を全部集める（深い所も）
function strings(v, out = [], seen = new Set()) {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object" && !seen.has(v)) {
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) strings(x, out, seen);
  }
  return out;
}
function brokenNumbers(v, out = [], seen = new Set()) {
  if (typeof v === "number" && !Number.isFinite(v)) out.push(String(v));
  else if (v && typeof v === "object" && !seen.has(v)) {
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) brokenNumbers(x, out, seen);
  }
  return out;
}

// 2020〜2045 の日付（YYYY-MM-DD）
const dateArb = fc.date({ min: new Date("2020-01-01T00:00:00Z"), max: new Date("2045-12-31T00:00:00Z"), noInvalidDate: true }).map((d) => d.toISOString().slice(0, 10));
// 種の後ろにつける字（練習・とことんの種は数や日付・英数字。問題の tag にそのまま写るので、壊れた字の見分けに使う字は入れない）
const tailArb = fc.oneof(fc.stringMatching(/^[0-9a-z:._-]{0,12}$/), fc.integer().map(String), fc.double({ min: 0, max: 1, noNaN: true }).map(String), fc.constantFrom("", "0", "-1", "x|y", "🎌", " ", "2026-11-18:d0"));

function checkProblem(P, tag) {
  const why = [];
  if (!P || typeof P !== "object") return [`問題が作れない（${typeof P}）`];
  const { tag: _tag, ...body } = P; // tag は渡した種の写し
  const bad = strings(body).filter((s) => BROKEN.test(s));
  if (bad.length) why.push(`壊れた字: ${JSON.stringify(bad[0]).slice(0, 120)}`);
  const nan = brokenNumbers(P);
  if (nan.length) why.push(`数が ${nan[0]}`);
  if (Array.isArray(P.opts)) {
    const keys = P.opts.map((o) => JSON.stringify(o));
    if (new Set(keys).size !== keys.length) why.push(`選び肢が重なる: ${keys.join(" / ").slice(0, 160)}`);
    if (P.opts.some((o) => o === "" || o == null)) why.push("空の選び肢");
    if (typeof P.ans === "string" && P.opts.every((o) => typeof o === "string")) {
      const n = P.opts.filter((o) => o === P.ans).length;
      if (n !== 1) why.push(`答え「${P.ans}」が選び肢に ${n} 個`);
    }
  }
  return why.map((w) => `${tag}: ${w}`);
}

async function load(dir) {
  const file = path.resolve(dir, "data.js");
  if (!existsSync(file)) return null;
  try {
    return require(file);
  } catch {
    try {
      return (await import(pathToFileURL(file).href)).default;
    } catch {
      return null;
    }
  }
}

const results = [];
async function run(dir) {
  const name = path.basename(path.resolve(dir));
  const G = await load(dir);
  if (!G || typeof G.make !== "function") {
    console.log(`- ${name}: data.js に make() が無いので飛ばす`);
    return;
  }
  const props = [];
  const params = { numRuns: RUNS, seed: SEED, endOnFailure: true };
  const kinds = Array.isArray(G.KINDS) ? G.KINDS.map((k) => k && k.id).filter((x) => typeof x === "string") : [];
  const hasDaily = typeof G.dailyTags === "function";

  if (hasDaily) {
    props.push(["今日の問題：どの日でも作れて、同じ日なら同じ並び・同じ日の中で種が重ならない", fc.property(dateArb, (d) => {
      const a = G.dailyTags(d), b = G.dailyTags(d);
      if (!Array.isArray(a) || !a.length) throw new Error(`${d}: dailyTags が空`);
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${d}: 2回で並びがちがう`);
      if (new Set(a).size !== a.length) throw new Error(`${d}: 同じ種が2回 ${a.join(",")}`);
      return true;
    })]);
    props.push(["今日の問題：どの日の問題も、壊れた字・NaN・重なる選び肢が無く、2回作って同じ", fc.property(dateArb, (d) => {
      for (const t of G.dailyTags(d)) {
        const P = G.make(t), Q = G.make(t);
        const why = checkProblem(P, t);
        if (JSON.stringify(P) !== JSON.stringify(Q)) why.push(`${t}: 2回作って中身がちがう（make の中で Math.random か日時を使っている）`);
        if (why.length) throw new Error(why.join("\n"));
      }
      return true;
    })]);
  }
  if (typeof G.hardTags === "function") {
    props.push(["上級：どの日でも作れて、壊れた字が無い", fc.property(dateArb, (d) => {
      const tags = G.hardTags(d);
      if (!Array.isArray(tags)) throw new Error(`${d}: hardTags が配列でない`);
      for (const t of tags) {
        const why = checkProblem(G.make(t, true), t);
        if (why.length) throw new Error(why.join("\n"));
      }
      return true;
    })]);
  }
  if (kinds.length) {
    props.push(["練習・とことん：どの種類にどんな種を足しても作れて、壊れた字が無く、2回作って同じ", fc.property(fc.constantFrom(...kinds), tailArb, (k, tail) => {
      const t = `${k}|${tail}`;
      const P = G.make(t);
      const why = checkProblem(P, t);
      if (JSON.stringify(P) !== JSON.stringify(G.make(t))) why.push(`${t}: 2回作って中身がちがう`);
      if (why.length) throw new Error(why.join("\n"));
      return true;
    })]);
  }
  if (typeof G.rng === "function") {
    props.push(["乱数：どの種でも 0 以上 1 未満", fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (s) => {
      const R = G.rng(s);
      for (let i = 0; i < 50; i++) { const x = R(); if (!(x >= 0 && x < 1)) throw new Error(`rng(${s}) の ${i} 回目が ${x}`); }
      return true;
    })]);
  }
  if (!props.length) {
    console.log(`- ${name}: 確かめられる性質が無いので飛ばす`);
    return;
  }
  for (const [label, prop] of props) {
    const r = fc.check(prop, params);
    if (r.failed) {
      const msg = String(r.errorInstance?.message || r.error || "").split("\n").slice(0, 6).join("\n    ");
      results.push({ name, label, ok: false });
      console.log(`✗ ${name}: ${label}\n    ${msg}\n    反例: ${fc.stringify(r.counterexample)}  （再現: FC_SEED=${r.seed} node scripts/game-props.mjs ${dir}）`);
    } else {
      results.push({ name, label, ok: true });
      console.log(`✓ ${name}: ${label}`);
    }
  }
}

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error("使い方: node scripts/game-props.mjs <ゲームのフォルダ> [...]");
  process.exit(2);
}
console.log(`種 FC_SEED=${SEED}・1つの性質につき ${RUNS} 回`);
for (const d of dirs) await run(d);
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `✗ ${bad.length} 件の性質が破れた` : `✓ 性質テストが通った（${results.length} 件）`);
process.exit(bad.length ? 1 : 0);
