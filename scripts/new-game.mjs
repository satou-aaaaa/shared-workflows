// 新作ゲームのフォルダを、いまのひな形（template/）から始める（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/new-game.mjs <新しいゲームのフォルダ>   例: node scripts/new-game.mjs ../kotoba-game
// すること: template/ の中身（.github/workflows・.coderabbit.yaml・.claude・.gemini・AGENTS.md・CLAUDE.md・qa/*.mjs・
//           scripts/setup.sh・transfer.js・depth.js・sw.js）を写す。フォルダにもうあるファイルは上書きしない（あとから写すのは sync-template.mjs）。
// 写したあとに書くもの（ゲームごとの中身）は最後に出す一覧のとおり。
// きっかけ: 2026-11-07 新作を古いゲームから写して始め、ひな形の直しが届かないまま PR #1 を出した（incidents/2026-11-07-new-game-old-template.md）。
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = join(dirname(fileURLToPath(import.meta.url)), '..', 'template');

export function templateFiles(dir = T) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? templateFiles(p) : [relative(T, p)];
  }).sort();
}

export function scaffold(to) {
  const copied = [];
  const kept = [];
  for (const f of templateFiles()) {
    const dest = join(to, f);
    if (existsSync(dest)) { kept.push(f); continue; }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(T, f), dest);
    copied.push(f);
  }
  return { copied, kept };
}

export const TODO = [
  'AGENTS.md の <> を埋める（見本は kippu-10・kenko-minuki の AGENTS.md。決まりは routines/game-dev.md「共通の形」）',
  'sw.js の // game:begin〜// game:end に CACHE と SHELL を書く',
  'scripts/setup.sh の npm_dir= と next= を確かめる',
  'index.html：</head> の前に template/a11y/a11y.html の中身と transfer.js の <script>（data-game・data-keys に <名前>-depth も）、その次に depth.js の <script>（data-game・data-key="<名前>-depth"）',
  '深さ（routines/game-dev.md「1問を深くする」）：Depth.setValid・自信のボタン（Depth.sureHtml・bindSure・judge。答えを選ばないパズルは置かず、drift-allow.json に depth:sure と理由）・2つ目の判断（2段・ひねり・挑戦条件のどれか）・復習（解き終えたときと、まちがえた・ヒントを使ったその時（keep で same を確かめたあとの early()）に Depth.mark・ホームの「復習 N問」で Depth.due・途中の復習 runs.r があれば「復習の続きから」）。sw.js の SHELL に ./depth.js、qa/run.mjs から checkDepth と画面の検査（見本は kenko-minuki・gurafu-minuki）',
  'qa/package.json と qa/run.mjs（見本のゲームの同じ所を grep して必要な所だけ写す）',
  'manifest.webmanifest・アイコン・og.png（tools/make-icons.cjs・make-og.cjs）・.github/ISSUE_TEMPLATE/feedback.yml',
  'PR #1 の前に: LOCAL_ROOT=<親> REPOS=<名前> node scripts/drift-check.mjs と node scripts/sync-template.mjs --check <フォルダ>',
];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const to = process.argv[2];
  if (!to) { console.error('使い方: node scripts/new-game.mjs <新しいゲームのフォルダ>'); process.exit(2); }
  const { copied, kept } = scaffold(to);
  console.log(`写した: ${copied.length} ファイル${kept.length ? `（もうあったので残した: ${kept.join(', ')}）` : ''}`);
  console.log('このあと書くもの:');
  for (const t of TODO) console.log(`- ${t}`);
}
