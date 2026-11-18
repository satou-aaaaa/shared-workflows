#!/usr/bin/env node
// ゲームの JavaScript を ESLint で見る（sandbox の npm run lint と同じ考え方）。書き間違えた変数（no-undef）・
// 届かない行・同じキーの2回書きなど、遊ぶ前に止まる書き間違いを探す。index.html の中の <script> と、ゲームの .js を見る。
// ほかのファイルで決めた名前（data.js の const・共通部品の Depth・A11y・GameStore など）は、index.html が読むファイルから集めて「ある」ことにする。
//
// 使い方: node scripts/game-lint.mjs <ゲームのフォルダ> [...]
//   --warn  見つけても失敗にせず、GitHub の警告（::warning）だけ出す（入れはじめ。game-qa.yml はこれ）
// eslint・@eslint/js・globals・eslint-plugin-html は呼ぶ側で入れる（game-qa.yml は版を固定して --prefix に入れ、LINT_DIR でその場所を渡す）。
// 出典：ESLint「Configuration Files」https://eslint.org/docs/latest/use/configure/configuration-files ・「no-undef」https://eslint.org/docs/latest/rules/no-undef
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const warnOnly = args.includes("--warn");
const dirs = args.filter((a) => !a.startsWith("--"));
if (!dirs.length) {
  console.error("使い方: node scripts/game-lint.mjs [--warn] <ゲームのフォルダ> [...]");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const from = [process.env.LINT_DIR, process.cwd(), path.dirname(new URL(import.meta.url).pathname)].filter(Boolean);
let ESLint, js, globals, html;
try {
  const load = (m) => require(require.resolve(m, { paths: from }));
  ({ ESLint } = load("eslint"));
  js = load("@eslint/js");
  globals = load("globals");
  html = load("eslint-plugin-html");
} catch (e) {
  console.error(`✗ eslint などが入っていない（npm i --no-save eslint @eslint/js globals eslint-plugin-html）: ${e.message}`);
  process.exit(2);
}

// 見ないもの：検査・道具・下書き。ひな形の写し（sw.js・transfer.js・depth.js。QR の部品を含み、中身は shared-workflows で見る）
const IGNORE = ["**/node_modules/**", "qa/**", "qa-report/**", "tools/**", "scripts/**", "**/*.min.js", "preview.html", "a11y/**", ".shared-workflows/**"];
const TEMPLATE_COPIES = new Set(["sw.js", "transfer.js", "depth.js"]);

// ファイルの一番外で決めた名前（const X・let X・var X・function X・class X、window.X =）
function topNames(src) {
  const out = new Set();
  for (const m of src.matchAll(/^(?:const|let|var|function\*?|async function|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^(?:const|let|var)\s+\{([^}]*)\}\s*=/gm)) for (const n of m[1].split(",")) { const k = n.split(":").pop().trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) out.add(k); }
  for (const m of src.matchAll(/\b(?:window|globalThis|self|root|this)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) out.add(m[1]);
  return out;
}

// index.html とゲームの .js が決めている名前を全部集める（<script> どうしは同じ global を分け合う）
function sharedGlobals(dir) {
  const names = new Set();
  const files = [];
  if (existsSync(path.join(dir, "index.html"))) {
    const page = readFileSync(path.join(dir, "index.html"), "utf8");
    for (const m of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) for (const n of topNames(m[1])) names.add(n);
    for (const m of page.matchAll(/<script\b[^>]*\bsrc="([^":]+)"/g)) files.push(m[1].replace(/^\.\//, "").split("?")[0]);
    // <div id="x"> は window.x としても読めるが、ゲームでは使わない約束なので足さない
  }
  for (const f of readdirSync(dir)) if (f.endsWith(".js") && f !== "sw.js") files.push(f);
  // 共通部品が window に置く名前（ひな形の template/ の中身。読み忘れは QA の画面の検査で分かる）
  for (const n of ["Depth", "A11y", "GameStore", "HK"]) names.add(n);
  for (const f of new Set(files)) {
    const p = path.join(dir, f);
    if (existsSync(p)) for (const n of topNames(readFileSync(p, "utf8"))) names.add(n);
  }
  return Object.fromEntries([...names].map((n) => [n, "writable"]));
}

let problems = 0;
for (const d of dirs) {
  const dir = path.resolve(d);
  const name = path.basename(dir);
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: true,
    overrideConfig: [
      { ignores: IGNORE },
      js.configs.recommended,
      {
        files: ["**/*.js", "**/*.html"],
        plugins: { html },
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "script",
          globals: { ...globals.browser, ...globals.commonjs, ...sharedGlobals(dir) },
        },
        rules: {
          // 使っていない変数・空の catch・読まない代入は、遊ぶ人には害が無く数が多いので見ない
          "no-unused-vars": "off",
          "no-empty": "off",
          "no-useless-assignment": "off",
          // 全角の空白は日本語の文の中で使う（文字列・コメント・テンプレートの中は見ない）
          "no-irregular-whitespace": ["error", { skipStrings: true, skipComments: true, skipTemplates: true, skipRegExps: true }],
          // stop・open などブラウザにもある名前をページの関数にするのは動く（ページの関数が勝つ）
          "no-redeclare": ["error", { builtinGlobals: false }],
          // while (true) のくり返しは使う
          "no-constant-condition": ["error", { checkLoops: false }],
        },
      },
    ],
    errorOnUnmatchedPattern: false,
  });
  const targets = ["index.html", ...readdirSync(dir).filter((f) => f.endsWith(".js") && !TEMPLATE_COPIES.has(f) && !f.endsWith(".min.js"))].filter((f) => existsSync(path.join(dir, f)));
  const results = await eslint.lintFiles(targets);
  const msgs = results.flatMap((r) => r.messages.map((m) => ({ file: path.relative(process.cwd(), r.filePath), ...m })));
  problems += msgs.length;
  for (const m of msgs) {
    const where = `${m.file}:${m.line}:${m.column}`;
    const text = `${m.message}（${m.ruleId || "読めない"}）`;
    if (process.env.GITHUB_ACTIONS) console.log(`::${warnOnly ? "warning" : "error"} file=${m.file},line=${m.line},col=${m.column}::${text}`);
    console.log(`${warnOnly ? "△" : "✗"} ${name}: ${where} ${text}`);
  }
  if (!msgs.length) console.log(`✓ ${name}: ESLint の指摘なし（${targets.length} ファイル）`);
}
if (problems && !warnOnly) {
  console.log(`✗ ESLint の指摘が ${problems} 件`);
  process.exit(1);
}
console.log(problems ? `△ ESLint の指摘が ${problems} 件（--warn なので失敗にしない）` : "✓ ESLint が通った");
