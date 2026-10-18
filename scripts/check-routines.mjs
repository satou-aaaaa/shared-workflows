// 手順書の書き方（routines/STYLE.md）と、AI 共通の指示ファイル（AGENTS.md）があるかを調べる（Lint から呼ぶ。Claude は使わない）。
// 使い方: node scripts/check-routines.mjs   （リポジトリの一番上で）
// 調べること:
//   1. `<!-- style: v1 -->` を書いた手順書に、決まった見出し（目的・使う道具・手順・完了条件・やってはいけないこと）がこの順にある
//   2. AGENTS.md と template/AGENTS.md があり、CLAUDE.md と template/CLAUDE.md が `@AGENTS.md` で取り込んでいる
//   3. まだ新しい形になっていない手順書の名前を知らせる（失敗にはしない。少しずつ直す）
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const errors = [];
const notices = [];
const read = (p) => readFileSync(p, 'utf8');

// 一覧・決まり・書き方のファイルは手順書ではない
const notProcedures = new Set(['README.md', 'common.md', 'autonomy.md', 'catalog.md', 'agent-practices.md', 'STYLE.md', 'tool-map.md', 'project-practices.md']);
const required = ['## 目的', '## 使う道具', '## 手順', '## 完了条件', '## やってはいけないこと'];

for (const f of readdirSync('routines').sort()) {
  if (!f.endsWith('.md') || notProcedures.has(f)) continue;
  const text = read(`routines/${f}`);
  if (!text.includes('<!-- style: v1 -->')) {
    notices.push(`routines/${f} はまだ STYLE.md の形ではありません`);
    continue;
  }
  const lines = text.split('\n');
  let last = -1;
  for (const h of required) {
    const i = lines.findIndex((l) => l.trim() === h || l.trim().startsWith(`${h}（`));
    if (i < 0) errors.push(`routines/${f} に見出し「${h}」がない`);
    else if (i < last) errors.push(`routines/${f} の見出し「${h}」の順番が違う（STYLE.md の順に）`);
    else last = i;
  }
}

for (const dir of ['.', 'template']) {
  const agents = `${dir}/AGENTS.md`;
  const claude = `${dir}/CLAUDE.md`;
  if (!existsSync(agents)) errors.push(`${agents} がない`);
  if (!existsSync(claude) || !/^@AGENTS\.md\s*$/m.test(read(claude))) errors.push(`${claude} の先頭に @AGENTS.md の1行がない`);
}

for (const n of notices) console.log(`::notice::${n}`);
if (errors.length) {
  console.error(errors.map((e) => `::error::${e}`).join('\n'));
  console.error('直し方: routines/STYLE.md');
  process.exit(1);
}
console.log(`routines: 形はそろっています（新しい形になっていない手順書 ${notices.length} 件）`);
