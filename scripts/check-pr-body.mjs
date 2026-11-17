// PR の本文（ファイルか標準入力）に、シェルが中身を消した跡が無いかを見る。
// 使い方: node scripts/check-pr-body.mjs body.md   または   gh api repos/<o>/<r>/pulls/<n> --jq .body | node scripts/check-pr-body.mjs -
// 見るもの: 空のコード（`` や ` `）、「を  で」のような2つ続きの空白で抜けた言葉、書き出しの残り（$repo・${ok} など）。
// きっかけ: incidents/2026-11-07-pr-body-backtick-ran.md（引用しないヒアドキュメントの ` ` がコマンドとして走り、本文から消えた）
import { readFileSync } from "node:fs";

const src = process.argv[2] || "-";
const text = readFileSync(src === "-" ? 0 : src, "utf8");
const bad = [];
text.split("\n").forEach((line, i) => {
  if (/^\s*```/.test(line)) return;
  if (/(^|[^`])``(?!`)/.test(line) || /`\s+`/.test(line)) bad.push([i + 1, "空のコード", line]);
  if (/[ぁ-んァ-ヶ一-龠）」]\s{2,}[ぁ-んァ-ヶ一-龠（「]/.test(line)) bad.push([i + 1, "言葉が抜けた跡（空白が2つ）", line]);
  if (/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(line.replace(/`[^`]*`/g, ""))) bad.push([i + 1, "書き出されていない変数", line]);
});
for (const [n, why, line] of bad) console.log(`${src}:${n}: ${why}: ${line.trim()}`);
if (bad.length) { console.log("✗ 本文を直してから出す（ヒアドキュメントは <<'EOB' で引用し、値は後から置き換える）"); process.exit(1); }
console.log("✓ PR の本文に消えた跡は無い");
