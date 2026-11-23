#!/usr/bin/env node
// ゲームの「簡単すぎ・単調」を数で見る（Claude は使わない。どの AI でも人でも使える）。
// data.js（か gen.js）の make() で問題を作れるだけ作り、遊ぶ人が感じる「また同じ」「見ただけで分かる」を数える。
// 直すかどうかは数だけで決めない。手順は routines/game-fun.md（実際に遊んでから決める）。
//
// 使い方: node scripts/game-fun.mjs <ゲームのフォルダ> [...]   （△ は読んで判断。失敗にはしない）
//         node scripts/game-fun.mjs --json <フォルダ>         （数だけを JSON で）
//         node scripts/game-fun.mjs --self-test                （見分けられるかの検査。scripts/check.sh から）
// make() が無いゲーム（パズル・独自の作り）は数えられないので「遊んで見る」と出す。
//
// 考え方（出典は routines/game-fun.md）：
// - フロー：うでに対して手ごたえが低すぎると退屈になる（Chen 2007）→ 見ただけで当たる手がかりを数える
// - 間をあけた想起・交互の練習が身につく（Bjork & Bjork 2011）→ 同じ問題がすぐ戻る・種類が偏るのを数える
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const DAYS = 28;

// 目安（これを越えたら △）。根拠は routines/game-fun.md「目安の理由」
export const LIMITS = {
  repeat7: 0.2, // 今日の問題のうち、前の7日に出た問題と同じものの割合
  kindCover: 0.7, // 28日の今日の問題に出る種類の割合（これより低いと △）
  kindWidth: 5, // 1つの種類から30の種で作れるちがう問題の数（これより少ないと △）
  posBias: 0.5, // 正解がいつも同じ位置にある割合
  longest: 0.4, // 正解だけがいちばん長い割合（長さで当たる）
  fewOpts: 3, // 選び肢がこれより少ない問題（当てずっぽうで当たる）
  pool: 60, // 作れるちがう問題の数（これより少ないと、毎日遊ぶ人は2〜3週で全部見てしまう）
};

const day = (i) => new Date(Date.UTC(2026, 10, 1) + i * 864e5).toISOString().slice(0, 10);
const kindIds = (G) => (Array.isArray(G.KINDS) ? G.KINDS.map((k) => (k && typeof k === "object" ? k.id : k)).filter((x) => typeof x === "string") : []);
const tryMake = (G, t, hard) => { try { const P = G.make(t, hard); return P && typeof P === "object" ? P : null; } catch { return null; } };
// 問題の中身の印（種の写し tag と、並びの順を除く）
function key(P) {
  const { tag, ...b } = P;
  const opts = Array.isArray(b.opts) ? [...b.opts].map((o) => JSON.stringify(o)).sort() : null;
  return JSON.stringify({ ...b, opts });
}
const kindOf = (t) => String(t).split("|")[0];
const len = (o) => (typeof o === "string" ? o.length : JSON.stringify(o).length);

export function measure(G) {
  const kinds = kindIds(G);
  const m = { problems: 0, notes: [] };
  const daily = []; // 今日の問題（KINDS が無いゲームの手がかりも、これで数える）
  const add = (msg) => m.notes.push(msg);

  // 1. 今日の問題：前の7日と同じ問題・出る種類
  if (typeof G.dailyTags === "function") {
    const seen = []; let total = 0, rep = 0; const usedKinds = new Set();
    for (let i = 0; i < DAYS; i++) {
      let tags = []; try { tags = G.dailyTags(day(i)) || []; } catch {}
      const today = new Set();
      for (const t of tags) {
        const P = tryMake(G, t); if (!P) continue;
        total++; usedKinds.add(kindOf(t)); daily.push(P);
        const k = key(P);
        if (seen.slice(-7).some((s) => s.has(k))) rep++;
        today.add(k);
      }
      seen.push(today);
    }
    m.problems += total;
    m.repeat7 = total ? rep / total : 0;
    if (m.repeat7 > LIMITS.repeat7) add(`単調：今日の問題の ${pct(m.repeat7)} が前の7日に出た問題と同じ（目安 ${pct(LIMITS.repeat7)} 以下）`);
    if (kinds.length) {
      m.kindCover = kinds.filter((k) => usedKinds.has(k)).length / kinds.length;
      if (m.kindCover < LIMITS.kindCover) add(`単調：28日の今日の問題に出る種類が ${pct(m.kindCover)}（${kinds.length} 種類のうち。目安 ${pct(LIMITS.kindCover)} 以上）`);
    }
  }

  // 2. 種類ごとのはば（練習・とことんで同じ問題ばかりにならないか）
  const all = [];
  m.narrow = [];
  for (const k of kinds) {
    const ks = new Set();
    for (let s = 0; s < 30; s++) { const P = tryMake(G, `${k}|fun${s}`); if (P) { ks.add(key(P)); all.push(P); } }
    if (ks.size && ks.size < LIMITS.kindWidth) m.narrow.push(`${k}（${ks.size} 通り）`);
  }
  m.problems += all.length;
  m.pool = new Set(all.map(key)).size;
  if (kinds.length && m.pool < LIMITS.pool) add(`単調：作れるちがう問題が ${m.pool} 通り（目安 ${LIMITS.pool} 以上。毎日遊ぶ人はすぐ全部見る）`);
  if (m.narrow.length) add(`単調：30回作っても ${LIMITS.kindWidth} 通りに満たない種類 ${m.narrow.slice(0, 6).join("・")}`);

  // 3. 見ただけで当たる手がかり（正解の位置・正解だけ長い・選び肢が少ない）
  const qs = [...all, ...daily].filter((P) => Array.isArray(P.opts) && P.opts.length > 1 && P.ans !== undefined);
  if (qs.length) {
    const pos = new Map(); let longest = 0, few = 0;
    const byType = new Map(); // 問いの種類（type・なければ問いの字）ごとの「正解だけ長い」。全体では目安以下でも、1つの種類が長さで当たることがある
    for (const P of qs) {
      const at = typeof P.ans === "number" && !P.opts.includes(P.ans) ? P.ans : P.opts.findIndex((o) => JSON.stringify(o) === JSON.stringify(P.ans));
      if (at < 0) continue;
      pos.set(at, (pos.get(at) || 0) + 1);
      const L = P.opts.map(len), others = L.filter((_, i) => i !== at);
      const ty = String(P.type ?? P.q ?? ""), bt = byType.get(ty) || [0, 0];
      if (L[at] > Math.max(...others)) longest++;
      if (P.opts.length >= 3) { bt[0]++; if (L[at] > Math.max(...others)) bt[1]++; byType.set(ty, bt); } // 2択は長さの差が当て推量（50%）と変わらない
      if (P.opts.length < LIMITS.fewOpts) few++;
    }
    const n = [...pos.values()].reduce((a, b) => a + b, 0) || 1;
    const [topAt, topN] = [...pos.entries()].sort((a, b) => b[1] - a[1])[0] || [0, 0];
    m.posBias = topN / n; m.longest = longest / n; m.fewOpts = few / n;
    if (m.posBias > LIMITS.posBias && n >= 10) add(`簡単すぎ：正解の ${pct(m.posBias)} が ${topAt + 1} 番目（並べ替えていない？）`);
    if (m.longest > LIMITS.longest) add(`簡単すぎ：正解だけがいちばん長い問題が ${pct(m.longest)}（長さで当たる。目安 ${pct(LIMITS.longest)} 以下）`);
    m.longType = [...byType.entries()].filter(([, [n, l]]) => n >= 10 && l / n > LIMITS.longest).map(([t, [n, l]]) => `${t.slice(0, 20)}（${l}/${n}）`);
    if (m.longest <= LIMITS.longest && m.longType.length) add(`簡単すぎ：正解だけがいちばん長い問いの種類 ${m.longType.slice(0, 4).join("・")}（長い選び肢を選べば当たる）`);
    if (m.fewOpts > 0.5) add(`簡単すぎ：選び肢が ${LIMITS.fewOpts - 1} つ以下の問題が ${pct(m.fewOpts)}（当てずっぽうで半分当たる）`);
  }

  // 4. 上級が通常より難しいか（問題が lv＝段階を持つゲームだけ。上級は「難しい種類から・ヒント無し」が多いので、lv の平均で比べる）
  if (typeof G.hardTags === "function" && typeof G.dailyTags === "function") {
    const avg = (fn) => { let s = 0, n = 0; for (let i = 0; i < DAYS; i++) { let tags = []; try { tags = fn(day(i)) || []; } catch {} for (const t of tags) { const P = tryMake(G, t, fn === G.hardTags); if (P && typeof P.lv === "number") { s += P.lv; n++; } } } return n ? s / n : null; };
    const h = avg(G.hardTags), d = avg(G.dailyTags);
    if (h !== null && d !== null) {
      m.hardLv = h; m.dailyLv = d;
      if (h <= d) add(`簡単すぎ：上級の問題の段階（lv の平均 ${h.toFixed(2)}）が今日の問題（${d.toFixed(2)}）より高くない`);
    }
  } else if (kinds.length && typeof G.dailyTags === "function") {
    add("手ごたえ：上級（hardTags）が無い。慣れた人の次の目標があるか遊んで見る");
  }
  return m;
}
const pct = (x) => `${Math.round(x * 100)}%`;

// make() が無く、game.js が dailyList(日付)・mainOf(問題) を持つゲーム（暑さ指数よみの形）：今日の問題の主役が前の7日と重なる割合だけ数える
// （2026-11-23 atsusa-shisu は make() が無く「遊んで見る」になり、主役の重なり 36% を見逃していた）
export function measureList(G, from = Date.now()) {
  const m = { problems: 0, notes: [] };
  const dayAt = (i) => new Date(from + (i + 2) * 864e5).toISOString().slice(0, 10); // あさってから28日（直した決まりが入るのは先の日から。過去の日は変えないため）
  const seen = []; let rep = 0;
  for (let i = 0; i < DAYS; i++) {
    let mains = []; try { mains = (G.dailyList(dayAt(i)) || []).map((q) => JSON.stringify(G.mainOf(q))); } catch {}
    for (const x of mains) { m.problems++; if (seen.slice(-7).some((s) => s.has(x))) rep++; }
    seen.push(new Set(mains));
  }
  m.repeat7 = m.problems ? rep / m.problems : 0;
  if (m.repeat7 > LIMITS.repeat7) m.notes.push(`単調：今日の問題の主役の ${pct(m.repeat7)} が前の7日の主役と同じ（目安 ${pct(LIMITS.repeat7)} 以下）`);
  return m;
}

function load(dir) {
  const src = ["data.js", "gen.js"].map((x) => path.resolve(dir, x)).find(existsSync);
  try { return src ? require(src) : null; } catch { return null; }
}
function loadList(dir) {
  const src = path.resolve(dir, "game.js");
  try { const G = existsSync(src) ? require(src) : null; return G && typeof G.dailyList === "function" && typeof G.mainOf === "function" ? G : null; } catch { return null; }
}

function selfTest() {
  let fails = 0;
  const ok = (cond, msg) => { if (!cond) { fails++; console.error(`✗ self-test: ${msg}`); } };
  // 良い見本：毎日ちがう問題・正解の位置がばらける・長さがそろう・上級は選び肢が多い
  const good = {
    KINDS: [{ id: "a" }, { id: "b" }],
    dailyTags: (d) => ["a", "b"].map((k) => `${k}|${d}`),
    hardTags: (d) => [`b|${d}|h`],
    make: (t, hard) => {
      let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const opts = ["いち", "にい", "さん", "よん", hard ? "ごお" : null].filter(Boolean);
      const at = h % opts.length;
      return { tag: t, q: `問${h % 997}`, opts, ans: opts[at], lv: kindOf(t) === "b" ? 2 : 1 };
    },
  };
  const g = measure(good);
  ok(g.notes.length === 0, `良い見本に △ が出た: ${g.notes.join(" / ")}`);
  // 悪い見本：毎日同じ・正解がいつも1番目でいちばん長い・種類 b は出ない・上級が同じ
  const bad = {
    KINDS: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    dailyTags: (d) => [`a|${d}`],
    hardTags: (d) => [`a|${d}`],
    make: (t) => ({ tag: t, q: "同じ問い", opts: ["いちばん長い正解の選び肢", "短い"], ans: "いちばん長い正解の選び肢", lv: 1 }),
  };
  const b = measure(bad).notes.join("\n");
  for (const want of ["前の7日", "出る種類", "通りに満たない", "番目", "いちばん長い", "当てずっぽう", "上級の問題の段階"]) ok(b.includes(want), `悪い見本で「${want}」を見つけられない`);
  // 種類が混ざると全体では目安以下でも、1つの種類だけ長さで当たる（2026-11-21 悪質商法みやぶりの「どうする？」が 29/44）
  const mixed = {
    KINDS: [{ id: "a" }, { id: "b" }, { id: "c" }],
    make: (t) => {
      let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const k = kindOf(t);
      const opts = k === "a" ? ["とても長い正解の選び肢", "短い", "みじかい"] : ["いち", "にい", "さん"];
      return { tag: t, type: k, q: `問${h % 997}`, opts, ans: k === "a" ? 0 : h % 3 };
    },
  };
  ok(measure(mixed).notes.join("").includes("問いの種類"), "1つの種類だけ長さで当たるのを見つけられない");
  // make() が無く dailyList・mainOf で作るゲーム：主役を回すなら ✓、前の日の主役をすぐ出すなら △
  const n0 = (d) => Math.round((Date.parse(d) - Date.parse("2026-01-01")) / 864e5);
  const rot = { dailyList: (d) => [0, 1, 2, 3, 4].map((j) => ({ t: (n0(d) * 5 + j) % 45 })), mainOf: (q) => q.t };
  const stay = { dailyList: (d) => [0, 1, 2, 3, 4].map((j) => ({ t: (n0(d) * 2 + j) % 45 })), mainOf: (q) => q.t };
  ok(measureList(rot).notes.length === 0 && measureList(rot).problems > 0, "主役を回すゲームに △ が出た");
  ok(measureList(stay).notes.join("").includes("前の7日の主役"), "前の日の主役をすぐ出すゲームを見つけられない");
  console.log(fails ? `✗ game-fun の self-test が ${fails} 件落ちた` : "✓ game-fun の self-test が通った");
  process.exit(fails ? 1 : 0);
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") selfTest();
else {
  const json = args[0] === "--json";
  const dirs = json ? args.slice(1) : args;
  if (!dirs.length) { console.error("使い方: node scripts/game-fun.mjs [--json] <ゲームのフォルダ> [...]"); process.exit(2); }
  const out = [];
  for (const d of dirs) {
    const name = path.basename(path.resolve(d));
    const G = load(d);
    const L = (!G || typeof G.make !== "function") && loadList(d);
    if (L) {
      const m = measureList(L);
      out.push({ name, make: false, list: true, ...m });
      if (!json) { console.log(`${m.notes.length ? "△" : "✓"} ${name}: make() は無いので今日の問題の主役 ${m.problems} 個だけ見た（ほかは遊んで見る）`); for (const n of m.notes) console.log(`  △ ${n}`); }
      continue;
    }
    if (!G || typeof G.make !== "function") { out.push({ name, make: false }); if (!json) console.log(`- ${name}: make() が無いので数えられない（遊んで見る）`); continue; }
    const m = measure(G);
    // make() はあっても、札（tag）で問題を作らないゲーム（パズルなど make(seed, 大きさ)）は1問も作れない。✓ と出さない
    if (!m.problems) { out.push({ name, make: false }); if (!json) console.log(`- ${name}: make() で問題を作れなかった（札で作らないゲーム）。遊んで見る`); continue; }
    out.push({ name, make: true, ...m });
    if (!json) {
      console.log(`${m.notes.length ? "△" : "✓"} ${name}: 問題 ${m.problems} 個を見た・読んで判断 ${m.notes.length}`);
      for (const n of m.notes) console.log(`  △ ${n}`);
    }
  }
  if (json) console.log(JSON.stringify(out, null, 1));
}
