// 立ち上げ直しの手順書（bootstrap/）が実際の仕組みとずれていないかを調べる（Lint から呼ぶ。Claude は使わない）。
// 使い方: node scripts/check-bootstrap.mjs   （リポジトリの一番上で）
// 調べること:
//   1. routines/ の手順書（決まり・一覧のファイルを除く）が bootstrap/routines.md に載っている
//   2. .github/workflows/ の部品（lint.yml を除く）が bootstrap/checks.md に載っている
//   3. bootstrap/ に内部の ID（ルーティン・セッション・プロジェクト）や秘密らしい文字列が無い
// 考え方: 手順書は仕組みとずれていくので、ずれは機械で見つける（README の「調べたこと」）。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
const read = (p) => readFileSync(p, 'utf8');

// 1. ルーティンの手順書
const notRoutines = new Set(['README.md', 'common.md', 'autonomy.md', 'catalog.md', 'agent-practices.md', 'onboarding.md']);
const routinesDoc = read('bootstrap/routines.md');
for (const f of readdirSync('routines')) {
  if (!f.endsWith('.md') || notRoutines.has(f)) continue;
  if (!routinesDoc.includes(`routines/${f}`)) errors.push(`bootstrap/routines.md に routines/${f} が載っていない`);
}

// 2. ワークフローの部品
const checksDoc = read('bootstrap/checks.md');
for (const f of readdirSync('.github/workflows')) {
  if (!f.endsWith('.yml') || f === 'lint.yml') continue;
  if (!checksDoc.includes(f)) errors.push(`bootstrap/checks.md に ${f} が載っていない`);
}

// 3. 内部 ID・秘密
const banned = [
  [/\btrig_[0-9A-Za-z]{8,}/, 'ルーティンの ID'],
  [/\b(?:session|cse)_[0-9A-Za-z]{8,}/, 'セッションの ID'],
  [/\b(?:chan|cmsg)_[0-9A-Za-z]{8,}/, 'プロジェクト・メッセージの ID'],
  [/claude\.ai\/artifact\/[0-9A-Za-z]{8,}/, 'Artifact の URL（作り直すと変わる）'],
  [/\b(?:ghp_|github_pat_|sk-ant-|AKIA)[0-9A-Za-z_]{8,}/, '秘密らしい文字列'],
  [/[0-9A-Za-z._%+-]+@(?:gmail|yahoo|outlook|icloud)\.[a-z.]+/, 'メールアドレス'],
];
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
for (const p of walk('bootstrap')) {
  const lines = read(p).split('\n');
  lines.forEach((line, i) => {
    for (const [re, what] of banned) if (re.test(line)) errors.push(`${p}:${i + 1} に${what}がある`);
  });
}

if (errors.length) {
  console.error(errors.map((e) => `::error::${e}`).join('\n'));
  console.error('直し方: bootstrap/README.md の「この手順書を古くしないために」');
  process.exit(1);
}
console.log('bootstrap: ずれなし');
