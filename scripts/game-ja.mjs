#!/usr/bin/env node
// ゲームの問題文・選び肢・説明の日本語を、機械で見られるところだけ点検する（どの AI でも人でも使える。Claude は使わない）。
// data.js の make() で問題を作れるだけ作り（種類 × 種・今日の問題 120 日・上級）、画面に出る字を集めて決まりに当てる。
// 機械で見られない「言い回しが不自然」「正解が2つ取れる中身」は、手順書 routines/game-ja.md の読み合わせで見る。
//
// 決まりの出典：
//   文化庁「公用文作成の考え方」（2022 建議）… 一文を短く（目安 50〜60 字）、二重否定を避ける、専門用語は説明を添える
//     https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93731901_01.pdf
//   出入国在留管理庁・文化庁「在留支援のためのやさしい日本語ガイドライン」… 一文を短く・一文に一つのこと・あいまいな言い方を避ける
//     https://www.moj.go.jp/isa/support/coexistence/04_00004.html
//   多肢選択式の作り方（Haladyna ら。石井秀宗「テスト作成ガイドライン」）… 正答は1つ、選び肢どうしが重ならない、
//     「すべて」「どれでもない」を使わない、正答だけ長いなどの手がかりを作らない
//     https://www.educa.nagoya-u.ac.jp/~ishii-h/materials/guidelines.pdf
//
// 使い方: node scripts/game-ja.mjs [--strict] [--json] <ゲームのフォルダ> [...]
//   ✗（error）は直す。--strict のときは ✗ が1つでもあれば 1 で終わる（game-qa.yml の「問題の日本語」）。
//   △（warn）は読んで判断する（長い文・正答だけ長い など）。
//   --dump：種類ごとに1問ずつ、問い・選び肢（◎が正解）・ヒント・説明を並べる（読み合わせ routines/game-ja.md 手順4）。
//   --self-test：決まりが「直すもの」と「よい文」を見分けられるかを確かめる（scripts/check.sh・Lint）。
//   わざとの例外は、ゲームの qa/ja-allow.txt に「規則名<TAB>字の一部」を1行ずつ書く（# のあとは理由）。
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const JSON_OUT = args.includes("--json");
const SELF = args.includes("--self-test");
const DUMP = args.includes("--dump");
const dirs = args.filter((a) => !a.startsWith("--"));

// 画面に出る字のある所（tag・src・id のような中の名前は見ない）
const SKIP_KEYS = new Set(["tag", "kind", "id", "src", "v", "grp", "type", "media", "svg", "art", "img", "icon", "seed", "key2"]);
const norm = (s) => String(s).normalize("NFKC").replace(/\s+/g, "").replace(/<[^>]+>/g, "");
const plain = (s) => String(s).replace(/<rt>[^<]*<\/rt>/g, "").replace(/<[^>]+>/g, "");

export const RULES = {
  // ── error：まちがいなく直すもの ──
  "punct:double": { lv: "error", re: /[、，][、，。]|。。|！！！|？？/, msg: "句読点が重なる" },
  "punct:space": { lv: "error", re: /[^\s　][　 ]{2,}[^\s　]|^[　 ]|[　 ]$/, msg: "空白が重なる・前後に空白" },
  "quote:unbalanced": { lv: "error", test: (s) => !/…$/.test(s) && (count(s, "「") !== count(s, "」") || count(s, "（") !== count(s, "）")), msg: "かぎかっこ・かっこが閉じていない" },
  "quote:empty": { lv: "error", re: /「」|（）/, msg: "中身の無いかっこ" },
  "particle:double": { lv: "error", re: /[一-龯ァ-ヶー々](が|を|に|で|へ)\1(?![ぁ-ん])/, msg: "助詞が重なる（「をを」など）" },
  "neg:double": { lv: "error", re: /ないわけではない|なくはない|なくもない|ないことはない|ない(わけ|こと)ではな/, msg: "二重否定" },
  "word:nonstd": { lv: "error", re: /選び肢/, msg: "辞書に無い言葉（「選び肢」→「選択肢」か「答え」）" },
  "opt:all-none": { lv: "error", opt: true, re: /^(上の|以上の)?(すべて|全部|どれも|いずれも)(正しい|あてはまる|ちがう|まちがい)$|どれでもない|どれもちがう|該当なし|上のすべて|以上のすべて/, msg: "「すべて」「どれでもない」の選び肢" },
  "youna:noun": { lv: "error", re: /[^るたいだうくすつぬむぶぐ）]」(ような|ように)/, msg: "名詞のあとの「ような」（「〜のような」）" },
  "law:raw": { lv: "error", test: (s) => /[一二三四五六七八九十]+月(?![一二三四五六七八九十〇0-9]*日)|[一二三四五六七八九十]箇月|(?:[一-龯]|[あよなわ])つ(?:た(?!め)|て)/.test(plain(s).replace(/「[^」]*」/g, "")), msg: "条文のままの書き方（「三月」＝3か月・「知つた」など。読みやすく直す）" },
  // ── warn：読んで判断するもの ──
  "neg:double-soft": { lv: "warn", re: /ないとは(言|い)えない/, msg: "二重否定に近い（法律の決まり文句なら、やさしい言いかえを添える）" },
  "len:sentence": { lv: "warn", test: (s) => longest(s) > 60, msg: "一文が 60 字をこえる（目安 50〜60 字）" },
  "kanji:run": { lv: "warn", test: (s) => /[一-龯々〆]{8,}/.test(plain(s).replace(/（[^）]*）/g, "")), msg: "漢字が 8 字以上続く（むずかしい言葉に説明やふりがなを）" },
  "neg:question": { lv: "warn", q: true, re: /(ない|でない|まちがっている|誤っている|ふさわしくない|あてはまらない)(もの|の)は[?？]/, msg: "否定でたずねる問い（「ない」を目立たせるか、肯定の問いに）" },
};
function count(s, c) { return s.split(c).length - 1; }
function longest(s) {
  return Math.max(0, ...plain(s).split(/[。！？!?\n]/).map((x) => x.replace(/（[^）]*）|「[^」]*」/g, "").length));
}

// 選び肢どうしの決まり
function optFindings(P) {
  const out = [];
  const opts = Array.isArray(P.opts) ? P.opts.filter((o) => typeof o === "string") : [];
  if (opts.length < 2) return out;
  const n = opts.map(norm);
  for (let i = 0; i < n.length; i++) for (let j = 0; j < n.length; j++) {
    if (i === j || n[i].length < 2) continue;
    if (n[i] === n[j] && i < j) out.push(["opt:same", "error", "表示が同じ選び肢が2つ", `${opts[i]} / ${opts[j]}`]);
  }
  if (typeof P.ans === "string" && opts.includes(P.ans)) {
    const a = norm(P.ans);
    for (const o of opts) {
      const n = norm(o);
      // 正解が「取り消せる」で、ほかが「1年たてば取り消せる」：条件つきの言い方は正解と両立して、2つ正しく読める
      if (o !== P.ans && a.length >= 2 && n.endsWith(a) && /(なら|れば|えば|たら|ても|まで|までは|までなら|ば)$/.test(n.slice(0, -a.length)))
        out.push(["opt:not-exclusive", "error", "正解に条件を足しただけの選び肢（正解と両立して2つ正しく読める）", `◎${P.ans} / ${o}`]);
    }
  }
  if (typeof P.ans === "string" && opts.includes(P.ans) && opts.length >= 3) {
    const L = (s) => plain(s).length, a = L(P.ans), others = opts.filter((o) => o !== P.ans).map(L);
    const max = Math.max(...others);
    if (a >= 12 && a > max * 1.6) out.push(["opt:long-ans", "warn", "正解だけがとび抜けて長い（長さで当たる）", `${P.ans}（${a}字。ほかは${max}字まで）`]);
  }
  return out;
}

// 問題を作れるだけ作る
export function problems(G) {
  const tags = new Set();
  const day = (i) => new Date(Date.UTC(2026, 10, 1) + i * 864e5).toISOString().slice(0, 10);
  for (let i = 0; i < 120; i++) {
    try { for (const t of G.dailyTags?.(day(i)) || []) tags.add(t); } catch {}
    try { for (const t of G.hardTags?.(day(i)) || []) tags.add(t); } catch {}
  }
  const kinds = Array.isArray(G.KINDS) ? G.KINDS.map((k) => (k && typeof k === "object" ? k.id : k)).filter((x) => typeof x === "string") : [];
  for (const k of kinds) for (let s = 0; s < 6; s++) tags.add(`${k}|ja${s}`);
  const out = [];
  for (const t of tags) {
    try { const P = G.make(t); if (P && typeof P === "object") out.push(P); } catch {}
  }
  return out;
}

function strings(v, key, out, seen) {
  if (typeof v === "string") { if (/[ぁ-んァ-ヶ一-龯]/.test(v)) out.push([key, v]); return out; }
  if (v && typeof v === "object" && !seen.has(v)) {
    seen.add(v);
    for (const [k, x] of Array.isArray(v) ? v.map((x, i) => [key, x]) : Object.entries(v)) if (!SKIP_KEYS.has(k)) strings(x, k, out, seen);
  }
  return out;
}

function loadAllow(dir) {
  const f = path.join(dir, "qa", "ja-allow.txt");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean).map((l) => l.split("\t"));
}

// make() が無いゲーム（パズル・独自の作り）は、.js の文字列と index.html の字をそのまま集めて、文の決まり（選び肢・問い以外）だけを当てる。
// 2026-11-21 までは飛ばしていて、35本が一度も見られていなかった（incidents/2026-11-21-game-ja-unclear.md）。
// 字のかけら（「（」で切れた文字列・空白つきの継ぎ目）が多いので、かっこ・空白・句読点の決まりは当てない。
const TEXT_RULES = new Set(["word:nonstd", "neg:double", "particle:double", "youna:noun", "law:raw", "neg:double-soft", "len:sentence", "kanji:run"]);
const TEXT_SKIP = new Set(["sw.js", "transfer.js", "store.js", "depth.js", "gender-ng.js", "a11y.js"]);
export function textStrings(dir) {
  const out = [];
  let files = [];
  try { files = readdirSync(dir).filter((f) => (f.endsWith(".js") && !TEXT_SKIP.has(f)) || f === "index.html"); } catch { return out; }
  for (const f of files) {
    let src = readFileSync(path.join(dir, f), "utf8");
    if (f.endsWith(".html")) {
      // 画面の字（タグの間）と、script の中の文字列の両方を見る
      const scripts = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
      const body = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "");
      for (const m of body.matchAll(/>([^<>]+)</g)) { const t = m[1].trim(); if (/[ぁ-んァ-ヶ一-龯]/.test(t)) out.push([f, t]); }
      src = scripts;
    }
    src = src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      const t = m[2].replace(/\$\{[^}]*\}/g, "○");
      if (/[ぁ-んァ-ヶ一-龯]/.test(t)) out.push([f, t]);
    }
  }
  return out;
}
function checkText(dir, only = null) {
  const ss = textStrings(dir);
  if (!ss.length) return null;
  const allow = loadAllow(dir);
  const found = new Map();
  for (const [f, s] of ss) for (const [rule, R] of Object.entries(RULES)) {
    if (R.opt || R.q || !TEXT_RULES.has(rule) || (only && !only.includes(rule))) continue;
    if (R.test ? R.test(s) : R.re.test(plain(s))) {
      if (allow.some(([r, part]) => r === rule && (!part || s.includes(part)))) continue;
      const k = rule + "\t" + s;
      const x = found.get(k);
      if (x) x.n++; else found.set(k, { rule, lv: R.lv, msg: R.msg, text: `[${f}] ` + s.slice(0, 160), n: 1 });
    }
  }
  return { name: path.basename(path.resolve(dir)), problems: 0, texts: ss.length, findings: [...found.values()] };
}

export function check(dir) {
  const file = path.resolve(dir, "data.js");
  const alt = path.resolve(dir, "gen.js");
  const src = existsSync(file) ? file : existsSync(alt) ? alt : null;
  let G;
  try { G = src && require(src); } catch { G = null; }
  if (!G || typeof G.make !== "function") return checkText(dir);
  const allow = loadAllow(dir);
  const found = new Map(); // 規則+字 → 1件
  const add = (rule, lv, msg, text, n = 1) => {
    if (allow.some(([r, part]) => r === rule && (!part || text.includes(part)))) return;
    const k = rule + "\t" + text.replace(/[0-9０-９]+/g, "#").replace(/[月火水木金土日]）/g, "）");
    const f = found.get(k);
    if (f) f.n += n; else found.set(k, { rule, lv, msg, text, n });
  };
  const ps = problems(G);
  for (const P of ps) {
    for (const [key, s] of strings(P, "", [], new Set())) {
      for (const [rule, R] of Object.entries(RULES)) {
        if (R.opt && key !== "opts") continue;
        if (R.q && key !== "q") continue;
        const hit = R.test ? R.test(s) : R.re.test(plain(s));
        if (hit) add(rule, R.lv, R.msg, `[${key}] ` + s.slice(0, 160));
      }
    }
    for (const [rule, lv, msg, text] of optFindings(P)) add(rule, lv, msg, text);
  }
  // 画面の決まった字（index.html・ヒント・説明の部品）も、言葉の決まりだけ当てる（2026-11-21「選び肢」が9本の画面に出ていた）
  const t = checkText(dir, ["word:nonstd", "neg:double", "particle:double"]);
  for (const f of t ? t.findings : []) add(f.rule, f.lv, f.msg, f.text, f.n);
  return { name: path.basename(path.resolve(dir)), problems: ps.length, findings: [...found.values()] };
}

// 決まりの見本（--self-test）。実際に見つかった文を入れる（2026-11-21 incidents/2026-11-21-game-ja-unclear.md）
const BAD = [
  ["youna:noun", "みなと町で「どしゃ降り」ような雨。"],
  ["law:raw", "処分があったことを知った日の翌日から起算して三月"],
  ["law:raw", "請求のあつた日から二十日以内"],
  ["neg:double", "進めないわけではないが、まず止まる。"],
  ["quote:unbalanced", "その送付を受けた日）から十日以内に"],
  ["punct:double", "取り消せる、。"],
  ["particle:double", "家をを買った。"],
  ["word:nonstd", "ヒントで選び肢を減らせます。"],
];
const GOOD = [
  "みなと町で「どしゃ降り」のような雨。", "「バケツをひっくり返したように降る」ような雨。", "処分があったことを知った日の翌日から3か月",
  "目立つために、ほかの動画を使う。", "3月3日（月）まで", "「三箇月以上住所を有する者」（公職選挙法）", "止まって安全を確かめてから進める。",
];
const OPT_BAD = [{ opts: ["取り消せる", "取り消せない", "1年たてば取り消せる"], ans: "取り消せる" }, { opts: ["健康保険", "健康保険", "年金"], ans: "健康保険" }];
const OPT_GOOD = [{ opts: ["取り消せる", "取り消せない", "店が決める", "半分だけ取り消せる"], ans: "取り消せる" }];
function selfTest() {
  const fails = [];
  const hits = (s) => Object.entries(RULES).filter(([, R]) => !R.opt && !R.q && R.lv === "error" && (R.test ? R.test(s) : R.re.test(plain(s)))).map(([r]) => r);
  for (const [rule, s] of BAD) if (!hits(s).includes(rule)) fails.push(`見のがした ${rule}: ${s}`);
  for (const s of GOOD) if (hits(s).length) fails.push(`よい文を落とした ${hits(s).join(",")}: ${s}`);
  for (const P of OPT_BAD) if (!optFindings(P).length) fails.push(`選び肢を見のがした: ${P.opts.join(" / ")}`);
  for (const P of OPT_GOOD) if (optFindings(P).length) fails.push(`よい選び肢を落とした: ${optFindings(P).map((f) => f[0]).join(",")}`);
  // make() が無いゲームも、画面（index.html）と .js の字を見る（2026-11-21 まで35本を飛ばしていた）
  const tmp = mkdtempSync(path.join(os.tmpdir(), "game-ja-"));
  mkdirSync(path.join(tmp, "qa"));
  writeFileSync(path.join(tmp, "index.html"), "<p>ヒントで選び肢を減らせます。</p><script>const a = \"進めないわけではないが、まず止まる。\";</script>");
  writeFileSync(path.join(tmp, "game.js"), "// 選び肢（コメントは見ない）\nconst T = \"家をを買った。\";");
  const tr = checkText(tmp), got = new Set(tr.findings.map((f) => f.rule));
  for (const r of ["word:nonstd", "neg:double", "particle:double"]) if (!got.has(r)) fails.push(`画面の字で見のがした ${r}`);
  if (tr.findings.some((f) => f.text.includes("コメント"))) fails.push("コメントの字まで見た");
  writeFileSync(path.join(tmp, "qa", "ja-allow.txt"), "word:nonstd\t選び肢 # 見本\nneg:double\nparticle:double\n");
  if (checkText(tmp).findings.length) fails.push("ja-allow.txt の例外が画面の字に効かない");
  rmSync(tmp, { recursive: true, force: true });
  if (fails.length) { console.log(fails.map((f) => "✗ game-ja: " + f).join("\n")); process.exit(1); }
  console.log(`✓ game-ja：見本 ${BAD.length + GOOD.length + OPT_BAD.length + OPT_GOOD.length} 件を見分けた`);
}

function dump(dir) {
  const src = ["data.js", "gen.js"].map((x) => path.resolve(dir, x)).find(existsSync);
  let G; try { G = src && require(src); } catch {}
  if (!G || typeof G.make !== "function") return console.log(`- ${path.basename(path.resolve(dir))}: make() が無い`);
  const kinds = Array.isArray(G.KINDS) ? G.KINDS.map((k) => (k && typeof k === "object" ? k.id : k)).filter((x) => typeof x === "string") : [];
  const tags = kinds.length ? kinds.map((k) => `${k}|ja0`) : [...new Set(problems(G).map((P) => P.tag))].slice(0, 60);
  console.log(`# ${path.basename(path.resolve(dir))}`);
  for (const t of tags) {
    let P; try { P = G.make(t); } catch { continue; }
    if (!P) continue;
    const opts = Array.isArray(P.opts) ? P.opts.map((o) => (typeof o === "string" ? o : JSON.stringify(o))) : [];
    console.log(`\n## ${P.kind ?? t}\nQ: ${plain(P.q ?? P.question ?? "")}\n${opts.map((o) => (o === P.ans ? "◎ " : "・ ") + o).join("\n")}`);
    for (const k of ["look", "key", "why", "gwhy"]) if (typeof P[k] === "string") console.log(`${k}: ${plain(P[k])}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` && SELF) selfTest();
else if (import.meta.url === `file://${process.argv[1]}` && DUMP) dirs.forEach(dump);
else if (import.meta.url === `file://${process.argv[1]}`) {
  let errors = 0;
  const all = [];
  for (const d of dirs) {
    const r = check(d);
    if (!r) { if (!JSON_OUT) console.log(`- ${path.basename(path.resolve(d))}: data.js（gen.js）に make() が無いので飛ばす`); continue; }
    all.push(r);
    const e = r.findings.filter((f) => f.lv === "error");
    errors += e.length;
    if (JSON_OUT) continue;
    const w = r.findings.length - e.length;
    console.log(`${e.length ? "✗" : "✓"} ${r.name}: ${r.texts ? `make() が無いので字 ${r.texts} 個を見た` : `問題 ${r.problems} 通り`}・直す ${e.length}・読んで判断 ${w}`);
    // CI（--strict）では △ を 15 行までにする（長い文だけで数百行になり、✗ が埋もれる）
    let shown = 0;
    for (const f of r.findings.sort((a, b) => (a.lv === b.lv ? 0 : a.lv === "error" ? -1 : 1))) {
      if (STRICT && f.lv !== "error" && ++shown > 15) { console.log(`  △ ほか ${w - 15} 件（手元で node scripts/game-ja.mjs <フォルダ> を回すと全部出る）`); break; }
      console.log(`  ${f.lv === "error" ? "✗" : "△"} ${f.rule}（${f.msg}）×${f.n}: ${f.text}`);
    }
  }
  if (JSON_OUT) console.log(JSON.stringify(all, null, 1));
  if (STRICT && errors) {
    console.log(`::error::問題の日本語に直すものが ${errors} 件。わざとなら qa/ja-allow.txt に理由つきで書く（routines/game-ja.md）`);
    process.exit(1);
  }
}
