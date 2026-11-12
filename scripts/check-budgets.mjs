// 全リポジトリを読む定期のワークフロー（scripts/repos.mjs で一覧を読むもの）が、リポジトリが増えても時間切れにならない形かを調べる（Lint から呼ぶ）。
// 2026-11-09 リポジトリが88本・1週間のマージが1,064件になり、1本ずつ順に読む Weekly summary と Scorecard が時間切れで止まり、
// Issue が出なかった（incidents/2026-11-09-weekly-jobs-timeout.md）。調べること:
//   1. run: の中の for r in $REPOS の繰り返しで gh api・gh issue list・gh pr list を呼ばない（1本ごとに読むと、本数に比例して遅くなる）。
//      読むのは node のスクリプトで、検索でまとめるか、gh-api.mjs の pool で並べる
//   2. そのジョブで呼ぶ node scripts/*.mjs（repos.mjs を除く）は、行に BUDGET_SEC= を持ち、gh-api.mjs を使う。
//      BUDGET_SEC の合計はジョブの timeout-minutes の 8 割より短い（予算で止まって Issue を出す時間を残す）
//   3. こうしたワークフローの定期実行（cron）どうしを60分以上離す（GITHUB_TOKEN の API は「このリポジトリで1時間1,000回」を分け合う）
//   4. （全部のワークフロー）ファイルから Issue を作る（gh issue create --body-file "$x"）ときは、先に node scripts/fit-body.mjs "$x" で
//      65,536 字に収め、前の Issue を閉じるのは作ったあと（2026-11-12 CI time report の本文が長すぎて作れず、先に閉じた前の週の
//      Issue だけが消えた。incidents/2026-11-12-ci-time-report-body-too-long.md）
// 使い方: node scripts/check-budgets.mjs [ファイル…]   （引数なしで .github/workflows の全部）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function problems(file, text, scriptExists = (p) => existsSync(p), scriptText = (p) => readFileSync(p, 'utf8')) {
  const out = [];
  if (!/node scripts\/repos\.mjs/.test(text)) return out;
  const jobs = (text.split(/^jobs:\s*$/m)[1] || '').split(/^(?= {2}[\w-]+:\s*$)/m).filter((c) => /^ {2}[\w-]+:/.test(c));
  for (const job of jobs) {
    if (!/node scripts\/repos\.mjs/.test(job)) continue;
    const name = job.match(/^ {2}([\w-]+):/)[1];
    for (const loop of job.matchAll(/for r in "?\$REPOS"?; do([\s\S]*?)\n\s*done\b/g)) {
      const hit = loop[1].match(/gh (api|issue list|pr list)\b/);
      if (hit) out.push(`${file} ${name}: for r in $REPOS の中で gh ${hit[1]} を呼んでいる（本数に比例して遅くなる。node のスクリプトで検索にまとめるか並べて読み、結果をファイルで渡す）`);
    }
    const timeout = Number((job.match(/^ {4}timeout-minutes:\s*(\d+)/m) || [])[1] || 0);
    if (!timeout) out.push(`${file} ${name}: timeout-minutes が無い（既定の360分まで止まらない）`);
    let sum = 0;
    for (const line of job.split('\n')) {
      const m = line.match(/node (scripts\/[\w.-]+\.mjs)/);
      // repos.mjs・fit-body.mjs は API を読まない
      if (!m || m[1] === 'scripts/repos.mjs' || m[1] === 'scripts/fit-body.mjs') continue;
      const b = line.match(/BUDGET_SEC=(\d+)/);
      if (!b) { out.push(`${file} ${name}: ${m[1]} に BUDGET_SEC= が無い（予算で止まらず、ジョブごと時間切れになる）`); continue; }
      sum += Number(b[1]);
      if (scriptExists(m[1]) && !/gh-api\.mjs['"]/.test(scriptText(m[1]))) out.push(`${file} ${name}: ${m[1]} が scripts/gh-api.mjs を使っていない（BUDGET_SEC が効かない）`);
    }
    if (timeout && sum > timeout * 60 * 0.8) out.push(`${file} ${name}: BUDGET_SEC の合計 ${sum}秒が timeout-minutes ${timeout}分の8割（${timeout * 48}秒）を超える`);
  }
  return out;
}

// 4. ファイルから Issue を作る前に長さを収め、前の Issue は作ったあとに閉じるか
export function bodyProblems(file, text) {
  const out = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(/gh issue create\b.*--body-file "?(\$\{?\w+\}?)/);
    if (!m || line.trim().startsWith('#')) return;
    const v = m[1].replace(/[{}]/g, '');
    const before = lines.slice(0, i);
    const fitAt = before.findLastIndex((l) => l.includes('node scripts/fit-body.mjs') && l.replace(/[{}]/g, '').includes(v));
    if (fitAt < 0) out.push(`${file}:${i + 1}: Issue を作る前に node scripts/fit-body.mjs "${v}" で 65,536 字に収めていない（長すぎると Issue が作れない）`);
    const closeAt = before.findLastIndex((l) => /gh issue close\b/.test(l) && l.includes('新しい'));
    if (closeAt >= 0 && closeAt > fitAt) out.push(`${file}:${closeAt + 1}: 前の Issue を、新しい Issue を作る前に閉じている（作るのに失敗すると1件も無くなる。作ったあとに閉じる）`);
  });
  return out;
}

// cron の「分 時 * * 曜日」から、週の中の分（0〜10079）の並びを返す。読めない形は null
export function cronMinutes(cron) {
  const [mi, h, dom, mon, dow] = cron.trim().split(/\s+/);
  if (dom !== '*' || mon !== '*' || !/^\d+$/.test(mi) || !/^\d+$/.test(h)) return null;
  const days = dow === '*' ? [0, 1, 2, 3, 4, 5, 6] : dow.split(',').map(Number);
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 7)) return null;
  return days.map((d) => (d % 7) * 1440 + Number(h) * 60 + Number(mi));
}

export function crowded(entries) {
  const out = [];
  const all = entries.flatMap(({ file, cron }) => (cronMinutes(cron) || []).map((t) => ({ file, t })));
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (all[i].file === all[j].file) continue;
      const d = Math.abs(all[i].t - all[j].t);
      if (Math.min(d, 10080 - d) < 60) out.push(`${all[i].file} と ${all[j].file} の定期実行が60分以内（GITHUB_TOKEN の1時間1,000回を分け合う。60分以上離す）`);
    }
  }
  return out;
}

// 見分けの試し（これが通らなければ検査そのものが壊れている）
function selfTest() {
  const bad = `jobs:\n  a:\n    timeout-minutes: 5\n    steps:\n      - run: |\n          REPOS="$(node scripts/repos.mjs)"\n          for r in $REPOS; do\n            x=$(gh api "repos/o/$r/pulls")\n          done\n          node scripts/x.mjs\n`;
  const good = `jobs:\n  a:\n    timeout-minutes: 15\n    steps:\n      - run: |\n          REPOS="$(node scripts/repos.mjs)"\n          BUDGET_SEC=600 node scripts/x.mjs\n          for r in $REPOS; do\n            echo "$r"\n          done\n`;
  const over = good.replace('BUDGET_SEC=600', 'BUDGET_SEC=800');
  const has = () => true;
  const uses = () => "import { makeApi } from './gh-api.mjs';";
  const t = [
    [problems('bad', bad, has, uses).length === 2, 'gh api の繰り返しと BUDGET_SEC 無しを見つける'],
    [problems('good', good, has, uses).length === 0, '直した形は通す'],
    [problems('over', over, has, uses).some((p) => p.includes('8割')), '予算の合計が上限の8割を超えるのを見つける'],
    [problems('nouse', good, has, () => 'execFileSync("gh")').some((p) => p.includes('gh-api.mjs')), 'gh-api.mjs を使わないスクリプトを見つける'],
    [bodyProblems('b', 'run: |\n  for o in $x; do gh issue close "$o" --comment "新しいのを作った"; done\n  gh issue create --body-file "$body"\n').length === 2, '長さを収めずに作る・先に閉じるを見つける'],
    [bodyProblems('g', 'run: |\n  node scripts/fit-body.mjs "$body"\n  gh issue create --body-file "$body"\n  for o in $x; do gh issue close "$o" --comment "新しいのを作った"; done\n').length === 0, '収めてから作り、あとで閉じる形は通す'],
    [bodyProblems('p', 'run: |\n  echo x | gh issue create --body-file -\n').length === 0, '標準入力からの短い本文は見ない'],
    [crowded([{ file: 'a', cron: '7 21 * * 0' }, { file: 'b', cron: '17 21 * * 0' }]).length === 1, '10分ちがいの定期実行を見つける'],
    [crowded([{ file: 'a', cron: '7 19 * * 0' }, { file: 'b', cron: '17 21 * * 0' }]).length === 0, '2時間離れた定期実行は通す'],
    [crowded([{ file: 'a', cron: '50 23 * * 6' }, { file: 'b', cron: '10 0 * * 0' }]).length === 1, '週をまたぐ近さも見つける'],
  ];
  return t.filter(([ok]) => !ok).map(([, n]) => `見分けの試しが通らない: ${n}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const dir = '.github/workflows';
  const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).map((f) => join(dir, f));
  const errs = [...selfTest()];
  const crons = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    errs.push(...problems(f, text), ...bodyProblems(f, text));
    if (/node scripts\/repos\.mjs/.test(text)) for (const m of text.matchAll(/cron:\s*["']([^"']+)["']/g)) crons.push({ file: f, cron: m[1] });
  }
  errs.push(...crowded(crons));
  for (const e of errs) console.error(`✗ ${e}`);
  if (errs.length) process.exit(1);
  console.log('✓ 全リポジトリを読む定期のワークフローは、予算で止まる形。Issue の本文は長さを収めてから作る');
}
