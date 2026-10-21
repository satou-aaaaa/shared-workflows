// 起きた問題の記録（incidents/）の形を調べる（Lint から呼ぶ。Claude は使わない）。
// 使い方: node scripts/check-incidents.mjs   （リポジトリの一番上で）
// 調べること（書き方は incidents/README.md）:
//   1. ファイル名が YYYY-MM-DD-<名前>.md で、README の「一覧」に載っている
//   2. 決まった見出しと「種類」の行があり、種類が README の「種類」の表にある
//   3. 対策が `- [x]`/`- [ ]` と 直す:/防ぐ:/見つける:/弱める: の形で、防ぐ か 見つける が1つ以上ある（直しただけで終わらせない）
//   4. 済んでいない対策に「担当」と「期限」がある
//   4b. 済んだ「防ぐ:」「見つける:」に、あとから確かめられる証拠がある（PR・Issue の番号、版、`ファイル`、リンク、この PR、手順の番号）。書いただけの対策を防ぐ
//   5. 内部の ID・メールアドレスが無い（公開リポジトリ）
// 考え方: Google SRE「Postmortem Culture」の action item（種類・担当・追跡）と blameless の書き方。
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'incidents';
const errors = [];
const readme = readFileSync(`${dir}/README.md`, 'utf8');

const section = (text, title) => {
  const start = text.indexOf(`## ${title}`);
  if (start < 0) return '';
  const rest = text.slice(start + title.length + 3);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
};
const kinds = new Set([...section(readme, '種類').matchAll(/^\| ([^|]+?) \| [^|]+ \|$/gm)].map((m) => m[1]).filter((k) => k !== '種類' && !/^-+$/.test(k)));
const index = section(readme, '一覧');
if (!kinds.size) errors.push('incidents/README.md の「種類」の表が読めない');

const headings = ['## 起きたこと', '## 原因', '## なぜ見つからなかったか', '## 対策'];
const banned = [
  [/\btrig_[0-9A-Za-z]{8,}/, 'ルーティンの ID'],
  [/\b(?:session|cse)_[0-9A-Za-z]{8,}/, 'セッションの ID'],
  [/\b(?:chan|cmsg)_[0-9A-Za-z]{8,}/, 'プロジェクト・メッセージの ID'],
  [/[0-9A-Za-z._%+-]+@(?:gmail|yahoo|outlook|icloud)\.[a-z.]+/, 'メールアドレス'],
];

for (const f of readdirSync(dir).sort()) {
  if (f === 'README.md' || !f.endsWith('.md')) continue;
  const p = `${dir}/${f}`;
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(f)) errors.push(`${p}: ファイル名は YYYY-MM-DD-<英小文字とハイフン>.md にする`);
  if (!index.includes(`(${f})`)) errors.push(`${p}: incidents/README.md の「一覧」に載っていない`);
  const text = readFileSync(p, 'utf8');
  const lines = text.split('\n');
  if (!lines[0].startsWith('# ')) errors.push(`${p}: 1行目は「# 何が起きたか」にする`);
  let last = -1;
  for (const h of headings) {
    const i = lines.findIndex((l) => l.trim() === h);
    if (i < 0) errors.push(`${p}: 見出し「${h}」がない`);
    else if (i < last) errors.push(`${p}: 見出し「${h}」の順番が違う`);
    else last = i;
  }
  const kind = text.match(/^- 種類: (.+)$/m)?.[1]?.trim();
  if (!kind) errors.push(`${p}: 「- 種類: 」の行がない`);
  else if (!kinds.has(kind)) errors.push(`${p}: 種類「${kind}」が README の「種類」の表に無い（足すなら表に1行足す）`);
  const actions = section(text, '対策').split('\n').filter((l) => l.startsWith('- '));
  if (!actions.length) errors.push(`${p}: 対策が1つもない`);
  for (const a of actions) {
    const m = a.match(/^- \[( |x)\] (直す|防ぐ|見つける|弱める): \S/);
    if (!m) { errors.push(`${p}: 対策「${a.slice(0, 30)}…」は「- [x] 防ぐ: …」の形にする`); continue; }
    // 証拠: #12・owner/repo#12・v31・18版・`path`・[名前](リンク)・この PR・手順10
    if (m[1] === 'x' && /^(防ぐ|見つける)$/.test(m[2]) && !/#\d+|\bv\d+|\d+版|`[^`]+`|\]\([^)]+\)|この ?PR|の PR|手順 ?\d+/.test(a)) errors.push(`${p}: 済んだ対策「${a.slice(0, 30)}…」に証拠が無い（PR の番号・版・\`ファイル\`・リンク・手順の番号のどれかを書く）`);
    if (m[1] === ' ' && !(/担当: /.test(a) && /期限: \d{4}-\d{2}-\d{2}/.test(a))) errors.push(`${p}: 済んでいない対策には「担当: 」と「期限: YYYY-MM-DD」を書く（${a.slice(0, 30)}…）`);
  }
  if (actions.length && !actions.some((a) => /\] (防ぐ|見つける):/.test(a))) errors.push(`${p}: 「防ぐ:」か「見つける:」の対策が無い（直しただけで終わらせない）`);
  lines.forEach((line, i) => {
    for (const [re, what] of banned) if (re.test(line)) errors.push(`${p}:${i + 1} に${what}がある`);
  });
}

if (errors.length) {
  console.error(errors.map((e) => `::error::${e}`).join('\n'));
  console.error('直し方: incidents/README.md の「書き方」');
  process.exit(1);
}
console.log('incidents: 形はそろっています');
