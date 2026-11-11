// game-wip.mjs と new-game.mjs の見方を、作った答えで確かめる（Lint から呼ぶ。GitHub は読まない。Claude は使わない）。
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, plan, repoOf, WIP_LIMIT } from './game-wip.mjs';
import { scaffold, templateFiles } from './new-game.mjs';

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

ok(repoOf('説明\nrepo: kotoba-game\n') === 'kotoba-game', 'repo: の行を読めない');
ok(repoOf('repo は未定') === null, 'repo: の行が無いのに作りかけにした');

const old = new Date(Date.now() - 3 * 864e5).toISOString();
const fake = {
  'repos/satou-aaaaa/shared-workflows/issues?state=open&per_page=100&page=1': [
    { number: 5, title: '題材: 甲（甲）', body: 'repo: game-a', html_url: 'u5' },
    { number: 3, title: '題材: 乙（乙）', body: '', html_url: 'u3' },
    { number: 9, title: '題材: 丙（丙）', body: 'repo: game-c', html_url: 'u9' },
    { number: 4, title: 'ほかの Issue', body: 'repo: x', html_url: 'u4' },
    { number: 6, title: '題材: PR', body: '', html_url: 'u6', pull_request: {} },
  ],
  'repos/satou-aaaaa/game-a': { has_pages: false },
  'repos/satou-aaaaa/game-a/pulls?state=open&per_page=10': [{ number: 1, updated_at: old }],
  'repos/satou-aaaaa/game-c': null,
};
const api = async (p) => (p in fake ? fake[p] : (() => { throw new Error(`読まないはずの所 ${p}`); })());
const data = await collect(api);
ok(data.wip.map((w) => w.number).join() === '5,9', `作りかけの見分けがちがう: ${data.wip.map((w) => w.number)}`);
ok(data.queue.map((q) => q.number).join() === '3', `候補の列がちがう: ${data.queue.map((q) => q.number)}`);
ok(/3日動きなし/.test(data.wip[0].next), `止まった PR を止まったと出さない: ${data.wip[0].next}`);
ok(/リポジトリを作る/.test(data.wip[1].next), 'リポジトリが無いのに作るよう出さない');
const lines = plan(data);
ok(WIP_LIMIT !== 2 || lines.some((l) => /空きなし/.test(l)), '上限に達しても新しい候補を始めようとする');
ok(lines.some((l) => /候補が 1 本/.test(l)), '候補が少ないのに足すよう出さない');
const free = plan({ wip: [], queue: data.queue });
ok(free.some((l) => /#3/.test(l) && /始める/.test(l)), '空きがあるのに候補を始めない');

const dir = mkdtempSync(join(tmpdir(), 'new-game-'));
writeFileSync(join(dir, 'AGENTS.md'), 'もとから');
const r = scaffold(dir);
ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8') === 'もとから', 'もうあるファイルを上書きした');
ok(r.copied.length === templateFiles().length - 1, 'ひな形を全部写していない');
for (const f of ['.github/workflows/qa.yml', 'transfer.js', 'sw.js', 'qa/a11y.mjs', 'scripts/setup.sh']) ok(existsSync(join(dir, f)), `${f} を写していない`);

if (errors.length) { console.error(errors.map((e) => `::error::${e}`).join('\n')); process.exit(1); }
console.log('✓ game-wip・new-game の見方');
