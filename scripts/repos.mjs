// リポジトリの一覧（repos.txt）を読む（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/repos.mjs              → 公開で見るもの（game と app）を空白区切りで1行に出す（ワークフローの REPOS 用）
//         node scripts/repos.mjs game         → 種類を絞る（game・app・private・ignore。空白区切りで複数可）
//         import { readRepos } from './repos.mjs'  → [{ name, kind }] を名前の順で返す
// きっかけ: 2026-11-07 一覧がワークフロー4か所・README・手順書に分かれていて、新作を足す PR どうしが毎回ぶつかった
// （incidents/2026-11-07-repo-list-conflicts.md）。一覧はここだけに置き、足すときは repos.txt に1行足す。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KINDS = ['game', 'app', 'private', 'ignore'];
export const REPOS_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'repos.txt');

// 形がおかしい行は投げずに problems に入れる（検査 check-repo-lists.mjs が全部まとめて出せるように）
export function parseRepos(text) {
  const repos = [];
  const problems = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) return;
    const [name, kind, ...rest] = line.split(/\s+/);
    const at = `repos.txt ${i + 1}行目`;
    if (!/^[A-Za-z0-9._-]+$/.test(name)) problems.push(`${at}: 名前 ${name} がリポジトリの名前の形でない`);
    if (!KINDS.includes(kind)) problems.push(`${at}: 種類 ${kind ?? '（無い）'} は ${KINDS.join('・')} のどれか`);
    if (rest.length) problems.push(`${at}: 「名前 種類」の2つだけにする（説明は # のあとに書く）`);
    if (kind === 'ignore' && !raw.includes('#')) problems.push(`${at}: ignore には # のあとに理由を書く`);
    repos.push({ name, kind, line: i + 1 });
  });
  return { repos, problems };
}

export function readRepos() {
  const { repos, problems } = parseRepos(readFileSync(REPOS_FILE, 'utf8'));
  if (problems.length) throw new Error(problems.join('\n'));
  return repos;
}

// kinds を渡さなければ、公開で見るもの（game と app）
export const repoNames = (kinds = ['game', 'app']) => readRepos().filter((r) => kinds.includes(r.kind)).map((r) => r.name);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const kinds = process.argv.slice(2);
  console.log(repoNames(kinds.length ? kinds : undefined).join(' '));
}
