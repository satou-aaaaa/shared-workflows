// ワークフローの run: で、$( gh api … || true ) のように「失敗しても続ける」を $( ) の中に書いていないかを調べる。
// $( ) の中で || true / || echo を付けると、失敗したコマンドが出した文字（エラーの本文など）も変数に入る。
// 2026-11-01、Pages が無いリポジトリで gh api の 404 の本文が URL として使われ、Site watch が落ちた
// （incidents/2026-11-01-pages-404-body-as-url.md）。正しくは  x=$(コマンド) || x=""  と外で受ける。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dirs = [".github/workflows", "template/.github/workflows"];
let bad = 0;
for (const d of dirs) {
  for (const name of readdirSync(d).filter((n) => /\.ya?ml$/.test(n))) {
    const file = join(d, name);
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      // 行末の \ でつながった行を1行として見る
      let text = lines[i], j = i;
      while (/\\\s*$/.test(text) && j + 1 < lines.length) text = text.replace(/\\\s*$/, " ") + lines[++j];
      if (/\$\((?:gh|curl)\s[^()]*\|\|\s*(?:true|echo|:)\b[^()]*\)/.test(text)) {
        console.error(`✗ ${file}:${i + 1}: $( ) の中で || を使っている。失敗したときの出力も変数に入るので、x=$(…) || x="" と外で受ける`);
        bad++;
      }
      i = j;
    }
  }
}
if (bad) process.exit(1);
console.log("✓ $( ) の中の || は無い");
