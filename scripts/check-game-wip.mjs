// game-wip.mjs と new-game.mjs の見方を、作った答えで確かめる（Lint から呼ぶ。GitHub は読まない。Claude は使わない）。
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, plan, repoOf, branchOf, WIP_LIMIT } from './game-wip.mjs';
import { scaffold, templateFiles } from './new-game.mjs';

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

ok(repoOf('説明\nrepo: kotoba-game\n') === 'kotoba-game', 'repo: の行を読めない');
ok(repoOf('repo は未定') === null, 'repo: の行が無いのに作りかけにした');
ok(branchOf('repo: a\nbranch: claude/x-1\n') === 'claude/x-1', 'branch: の行を読めない');

const old = new Date(Date.now() - 3 * 864e5).toISOString();
const day1 = new Date(Date.now() - 1.5 * 864e5).toISOString();
const fake = {
  'repos/satou-aaaaa/shared-workflows/issues?state=open&per_page=100&page=1': [
    { number: 5, title: '題材: 甲（甲）', body: 'repo: game-a', html_url: 'u5' },
    { number: 3, title: '題材: 乙（乙）', body: '', html_url: 'u3' },
    { number: 9, title: '題材: 丙（丙）', body: 'repo: game-c', html_url: 'u9' },
    { number: 7, title: '題材: 丁（丁）', body: 'repo: game-d', html_url: 'u7', labels: [{ name: 'needs-decision' }] },
    { number: 8, title: '題材: 戊（戊）', body: 'repo: game-e\nbranch: claude/e-1', html_url: 'u8' },
    { number: 10, title: '題材: 己（己）', body: 'repo: game-f', html_url: 'u10' },
    { number: 4, title: 'ほかの Issue', body: 'repo: x', html_url: 'u4' },
    { number: 6, title: '題材: PR', body: '', html_url: 'u6', pull_request: {} },
  ],
  'repos/satou-aaaaa/game-a': { has_pages: false },
  'repos/satou-aaaaa/game-a/pulls?state=open&per_page=10': [{ number: 1, updated_at: old }],
  'repos/satou-aaaaa/game-c': null,
  'repos/satou-aaaaa/game-e': { has_pages: false },
  'repos/satou-aaaaa/game-e/pulls?state=open&per_page=10': [],
  'repos/satou-aaaaa/game-f': { has_pages: false },
  'repos/satou-aaaaa/game-f/pulls?state=open&per_page=10': [{ number: 1, updated_at: day1 }],
};
const api = async (p) => (p in fake ? fake[p] : (() => { throw new Error(`読まないはずの所 ${p}`); })());
const data = await collect(api);
ok(data.wip.map((w) => w.number).join() === '5,8,9,10', `作りかけの見分けがちがう: ${data.wip.map((w) => w.number)}`);
ok(data.parked.map((w) => w.number).join() === '7', 'needs-decision の作りかけを数えている');
ok(data.queue.map((q) => q.number).join() === '3', `候補の列がちがう: ${data.queue.map((q) => q.number)}`);
const byNo = Object.fromEntries(data.wip.map((w) => [w.number, w.next]));
ok(/needs-decision を付ける/.test(byNo[5]), `3日動かない PR を止めるよう出さない: ${byNo[5]}`);
ok(/1日動きなし/.test(byNo[10]) && !/needs-decision/.test(byNo[10]), `1日動かない PR の出し方がちがう: ${byNo[10]}`);
ok(/ブランチ claude\/e-1 を checkout/.test(byNo[8]), `push したブランチから続けるよう出さない: ${byNo[8]}`);
ok(/リポジトリを作る/.test(byNo[9]), 'リポジトリが無いのに作るよう出さない');
const lines = plan(data);
ok(WIP_LIMIT !== 2 || lines.some((l) => /空きなし/.test(l)), '上限に達しても新しい候補を始めようとする');
ok(lines.some((l) => /候補が 1 本/.test(l)), '候補が少ないのに足すよう出さない');
ok(lines.some((l) => /止めている #7/.test(l)), '止めている作りかけを出さない');
const free = plan({ wip: [data.wip[0]], queue: data.queue, parked: data.parked });
ok(free.some((l) => /#3/.test(l) && /始める/.test(l)), '空きがあるのに候補を始めない');

const dir = mkdtempSync(join(tmpdir(), 'new-game-'));
writeFileSync(join(dir, 'AGENTS.md'), 'もとから');
const r = scaffold(dir);
ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8') === 'もとから', 'もうあるファイルを上書きした');
ok(r.copied.length === templateFiles().length - 1, 'ひな形を全部写していない');
for (const f of ['.github/workflows/qa.yml', 'transfer.js', 'sw.js', 'qa/a11y.mjs', 'scripts/setup.sh']) ok(existsSync(join(dir, f)), `${f} を写していない`);

if (errors.length) { console.error(errors.map((e) => `::error::${e}`).join('\n')); process.exit(1); }
console.log('✓ game-wip・new-game の見方');
