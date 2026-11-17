// ゲームの PR で、遊ぶ人が困る作り（scripts/game-patterns.mjs の playerBugs）を「新しく持ち込んだ」ら落とす（game-qa.yml の PR だけ。Claude は使わない）。
// 使い方: node check-game-new.mjs <main の index.html（無ければ無いパス）> <PR の index.html>
// もとからある作りは落とさない（週次まとめの「ひな形からのずれ」で直す）。直すと出なくなる。
// きっかけ: drift-check が週次まとめに出しても直されず、古いゲームから写した新作に広がった（incidents/2026-11-17-known-game-bugs-spread.md）
import { readFileSync, existsSync } from 'node:fs';
import { playerBugs } from './game-patterns.mjs';

const [basePath, headPath] = process.argv.slice(2);
if (!headPath) { console.error('使い方: node check-game-new.mjs <main の index.html> <PR の index.html>'); process.exit(2); }
if (!existsSync(headPath)) { console.log('index.html が無いので見ない'); process.exit(0); }
const before = new Set(existsSync(basePath) ? playerBugs(readFileSync(basePath, 'utf8')).map(([id]) => id) : []);
const now = playerBugs(readFileSync(headPath, 'utf8'));
const added = now.filter(([id]) => !before.has(id));
for (const [id, msg] of now.filter(([id]) => before.has(id))) console.log(`::warning::もとからある（週次まとめで直す）${id}: ${msg}`);
for (const [id, msg] of added) console.log(`::error::この PR で持ち込んだ ${id}: ${msg}`);
if (added.length) process.exit(1);
console.log(`✓ 遊ぶ人が困る作りを新しく持ち込んでいない（もとからあるもの ${now.length} 件）`);
