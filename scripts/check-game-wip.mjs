// game-wip.mjs と new-game.mjs の見方を、作った答えで確かめる（Lint から呼ぶ。GitHub は読まない。Claude は使わない）。
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, plan, repoOf, branchOf, threadOf, kindOf, isNonGame, WIP_LIMIT } from './game-wip.mjs';
import { scaffold, templateFiles, TODO, SKIP, COPY_DIRS } from './new-game.mjs';

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

ok(repoOf('説明\nrepo: kotoba-game\n') === 'kotoba-game', 'repo: の行を読めない');
ok(repoOf('repo は未定') === null, 'repo: の行が無いのに作りかけにした');
ok(branchOf('repo: a\nbranch: claude/x-1\n') === 'claude/x-1', 'branch: の行を読めない');
ok(threadOf('repo: a\nthread: 次の新作ゲームを2本作る\n') === '次の新作ゲームを2本作る', 'thread: の行を読めない');
// 箇条書き（- ・*）と ` で囲んだ名前も読む（2026-11-18 別スレッドの「- repo: shingo-yomi」を候補と読んだ。incidents/2026-11-18-game-wip-bullet-repo-line.md）
ok(repoOf('説明\n\n- repo: shingo-yomi\n- thread: 新作ゲームを作る(夜・並列1)\n') === 'shingo-yomi', '箇条書きの repo: の行を読めない');
ok(repoOf('* repo: `okurigana-dotchi`\n') === 'okurigana-dotchi', '* と ` で囲んだ repo: の行を読めない');
ok(threadOf('- repo: a\n- thread: 新作ゲームを作る(夜・並列1)\n') === '新作ゲームを作る(夜・並列1)', '箇条書きの thread: の行を読めない');
ok(branchOf('- branch: claude/x-1\n') === 'claude/x-1', '箇条書きの branch: の行を読めない');
ok(repoOf('このゲームの repo: は未定') === null, '文の途中の repo: を作りかけと読んだ');
ok(repoOf('+ repo: shingo-yomi\n') === 'shingo-yomi', '+ の箇条書きの repo: の行を読めない（#521 の CodeRabbit）');
ok(threadOf('repo: a\n- thread:\n- branch: claude/x-1\n') === null, '空の thread: で次の行を thread と読んだ（#521 の CodeRabbit）');
ok(repoOf('- repo:\nshingo-yomi\n') === null, '空の repo: で次の行を repo と読んだ');

// ゲームではない題材（kind: app）は候補に入れない（2026-11-22 akashi-lang などを「候補を始める」と出した。incidents/2026-11-22-game-wip-non-game-topics.md）
ok(kindOf('説明\n- kind: app\n') === 'app' && isNonGame('kind: app') && !isNonGame('kind: game') && !isNonGame('ふつうのゲーム'), 'kind: の行を読めない');
ok(isNonGame('リポジトリ akashi-lang（種類 app、ゲームではない）'), '「ゲームではない」と書いた題材をゲームと読んだ');
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
    { number: 11, title: '題材: 庚（庚）', body: 'repo: game-g\nthread: 別の作業', html_url: 'u11', updated_at: new Date().toISOString() },
    { number: 12, title: '題材: 辛（辛）', body: 'repo: game-h\nthread: 止まった作業', html_url: 'u12', updated_at: old },
    { number: 13, title: '題材: 壬（壬）', body: 'repo: game-i', html_url: 'u13' },
    { number: 14, title: '題材: 癸（癸）', body: 'repo: game-j', html_url: 'u14' },
    { number: 4, title: 'ほかの Issue', body: 'repo: x', html_url: 'u4' },
    { number: 2, title: '題材: 言語（言語）', body: 'kind: app', html_url: 'u2' },
    { number: 15, title: '題材: 防災アプリ（防災）', body: 'kind: app\nrepo: app-k', html_url: 'u15' },
    { number: 1, title: '題材: 止めた候補（候補）', body: '', html_url: 'u1', labels: [{ name: 'needs-decision' }] },
    { number: 6, title: '題材: PR', body: '', html_url: 'u6', pull_request: {} },
  ],
  'repos/satou-aaaaa/game-a': { has_pages: false },
  'repos/satou-aaaaa/game-a/pulls?state=open&per_page=10': [{ number: 1, updated_at: old }],
  'repos/satou-aaaaa/game-c': null,
  'repos/satou-aaaaa/game-e': { has_pages: false },
  'repos/satou-aaaaa/game-e/pulls?state=open&per_page=10': [],
  'repos/satou-aaaaa/game-f': { has_pages: false },
  'repos/satou-aaaaa/game-f/pulls?state=open&per_page=10': [{ number: 1, updated_at: day1 }],
  'repos/satou-aaaaa/game-h': { has_pages: false },
  'repos/satou-aaaaa/game-h/pulls?state=open&per_page=10': [],
  // Pages は入っているが README だけ（Create repo の直後。2026-11-20 kaminari-mamoru）と、index.html があって公開済み
  'repos/satou-aaaaa/game-i': { has_pages: true },
  'repos/satou-aaaaa/game-i/pulls?state=open&per_page=10': [],
  'repos/satou-aaaaa/game-i/contents/index.html': null,
  'repos/satou-aaaaa/game-j': { has_pages: true },
  'repos/satou-aaaaa/game-j/pulls?state=open&per_page=10': [],
  'repos/satou-aaaaa/game-j/contents/index.html': { name: 'index.html' },
};
const api = async (p) => (p in fake ? fake[p] : (() => { throw new Error(`読まないはずの所 ${p}`); })());
const data = await collect(api);
ok(data.wip.map((w) => w.number).join() === '5,8,9,10,12,13,14', `作りかけの見分けがちがう: ${data.wip.map((w) => w.number)}`);
ok(data.others.map((w) => w.number).join() === '11', '別スレッドが作っているものを作りかけに数えた（3日動かないものは引き取る）');
ok((data.apps || []).map((w) => w.number).join() === '2,15', `ゲームではない題材の見分けがちがう: ${(data.apps || []).map((w) => w.number)}`);
ok(data.parked.map((w) => w.number).join() === '1,7', 'needs-decision の作りかけ・候補を数えている');
ok(data.queue.map((q) => q.number).join() === '3', `候補の列がちがう: ${data.queue.map((q) => q.number)}`);
const byNo = Object.fromEntries(data.wip.map((w) => [w.number, w.next]));
ok(/needs-decision を付ける/.test(byNo[5]), `3日動かない PR を止めるよう出さない: ${byNo[5]}`);
ok(/1日動きなし/.test(byNo[10]) && !/needs-decision/.test(byNo[10]), `1日動かない PR の出し方がちがう: ${byNo[10]}`);
ok(/ブランチ claude\/e-1 を checkout/.test(byNo[8]), `push したブランチから続けるよう出さない: ${byNo[8]}`);
ok(/リポジトリを作る/.test(byNo[9]), 'リポジトリが無いのに作るよう出さない');
ok(/PR #1 を作る/.test(byNo[13]) && !/公開済み/.test(byNo[13]), `Pages だけ入って index.html の無いリポジトリを公開済みと出した: ${byNo[13]}`);
ok(/公開済み/.test(byNo[14]), `index.html がある Pages のリポジトリを公開済みと出さない: ${byNo[14]}`);
const lines = plan(data);
ok(lines.some((l) => /止めている候補 #1/.test(l)) && !lines.some((l) => /候補 #1「/.test(l) && /始める/.test(l)), 'needs-decision の候補を始めるよう出した（2026-11-26 #588）');
ok(WIP_LIMIT !== 2 || lines.some((l) => /空きなし/.test(l)), '上限に達しても新しい候補を始めようとする');
ok(lines.some((l) => /候補が 1 本/.test(l)), '候補が少ないのに足すよう出さない');
ok(lines.some((l) => /別スレッドが担当 #11/.test(l) && /触らない/.test(l)), '別スレッドが作っているものを触らないと出さない');
ok(lines.some((l) => /止めている #7/.test(l)), '止めている作りかけを出さない');
ok(lines.some((l) => /ゲームではない #2/.test(l) && /触らない/.test(l)) && !lines.some((l) => /#2「/.test(l)), 'ゲームではない題材を触らないと出さない・候補として始めようとした');
const free = plan({ wip: [data.wip[0]], queue: data.queue, parked: data.parked });
ok(free.some((l) => /#3/.test(l) && /始める/.test(l)), '空きがあるのに候補を始めない');

const dir = mkdtempSync(join(tmpdir(), 'new-game-'));
writeFileSync(join(dir, 'AGENTS.md'), 'もとから');
const r = scaffold(dir);
ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8') === 'もとから', 'もうあるファイルを上書きした');
ok(r.copied.length === templateFiles().filter((f) => !SKIP.some((d) => f.startsWith(d))).length - 1, 'ひな形を全部写していない');
ok(!existsSync(join(dir, 'core', 'core.js')), 'core/core.js をファイルで写した（index.html の印のあいだにだけ写す。incidents/2026-11-22-game-wip-non-game-topics.md）');
ok(!existsSync(join(dir, 'store', 'store.js')), 'store/store.js をファイルで写した（index.html の印のあいだにだけ写す。incidents/2026-11-17-new-game-store-file.md）');
ok(!existsSync(join(dir, 'kiroku')) && !existsSync(join(dir, 'parts')), 'kiroku/・parts/ をファイルで写した（印のあいだにだけ写す。incidents/2026-11-27-new-game-kiroku-parts-files.md）');
{ const sync = readFileSync(new URL('./sync-template.mjs', import.meta.url), 'utf8'), tops = new Set(templateFiles().map((f) => f.replaceAll('\\', '/').split('/')[0]));
  const inline = [...new Set([...sync.matchAll(/<!-- ([a-z0-9]+):begin/g)].map((m) => m[1]))].filter((n) => n !== 'a11y' && tops.has(n)).concat(/template\/parts\//.test(sync) ? ['parts'] : []);
  ok(inline.every((n) => SKIP.includes(n + '/')), `印で写す部品（${inline.join('・')}）が new-game.mjs の SKIP に無い（ファイルでも写り、使われない写しが残る）`); }
ok(!existsSync(join(dir, 'screens')), 'screens/ をファイルで写した（ゲームは Core.screens を使う。incidents/2026-11-27-core-check-hidden-coach-button.md）');
{ const dirs = [...new Set(templateFiles().map((f) => f.replaceAll('\\', '/')).filter((f) => f.includes('/')).map((f) => f.split('/')[0] + '/'))];
  const loose = dirs.filter((d) => !SKIP.includes(d) && !COPY_DIRS.includes(d));
  ok(loose.length === 0, `template/ のフォルダ（${loose.join('・')}）が new-game.mjs の SKIP にも COPY_DIRS にも無い（ゲームに写すか決めていない）`); }
{ const cc = readFileSync(new URL('../template/qa/core-check.mjs', import.meta.url), 'utf8');
  ok(!/#core-coach \.core-coach-go/.test(cc), 'core-check.mjs が隠れた吹き出しの中の「やってみる」を数える（#core-coach:not([hidden]) で絞る。incidents/2026-11-27-core-check-hidden-coach-button.md）'); }
ok(TODO.some((t) => /store:begin/.test(t) && /GameStore\.load/.test(t)), '新作の「このあと書くもの」に保存の共通部品（store の印・GameStore.load）が無い');
for (const f of ['.github/workflows/qa.yml', 'transfer.js', 'depth.js', 'qa/depth-check.mjs', 'sw.js', 'qa/a11y.mjs', 'scripts/setup.sh']) ok(existsSync(join(dir, f)), `${f} を写していない`);

{ const dep = readFileSync(join(dir, '.github', 'dependabot.yml'), 'utf8'); // ゲームの package.json は qa/ にある（2026-11-19 kenketsu-dekiru #1 で "/" のまま写った）
  ok(/package-ecosystem: "npm"\r?\n\s+directory: "\/qa"/.test(dep) && /package-ecosystem: "github-actions"\r?\n\s+directory: "\/"/.test(dep), '新作の Dependabot の npm が /qa を見ていない（または Actions の / まで変えた）'); }
ok(TODO.some((t) => /depth\.js/.test(t)) && TODO.some((t) => /Depth\.mark/.test(t) && /checkDepth/.test(t)), '新作の「このあと書くもの」に深さ（depth.js のつなぎ）が無い');

if (errors.length) { console.error(errors.map((e) => `::error::${e}`).join('\n')); process.exit(1); }
console.log('✓ game-wip・new-game の見方');
