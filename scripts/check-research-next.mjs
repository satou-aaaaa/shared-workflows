// research-next.mjs の見方を、作った一覧で確かめる（Lint から呼ぶ。Claude は使わない）。
import { parseBacklog, pickInRepo, plan, dayNumber } from './research-next.mjs';

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

const a = parseBacklog(`# 一覧

## R-001 済んだもの
- 状態: 済み
- 優先: 1
- 完了条件: x
- 結果: PR #1

## R-002 待ちのあるもの
- 状態: 次
- 優先: 1
- 待ち: R-003
- 完了条件: x

## R-003 優先2
- 状態: 次
- 優先: 2
- 待ち: R-001
- 完了条件: x

## R-004 保留
- 状態: 保留
- 優先: 1
- 完了条件: x

## 書き方
- 状態: 次
`);
ok(a.errors.length === 0, `正しい一覧で誤りを出した: ${a.errors}`);
ok(a.items.length === 4, `項目の数がちがう: ${a.items.length}（R- の無い見出しを項目にしない）`);
ok(pickInRepo(a.items)?.item.id === 'R-003', '待ちが済んでいない R-002 か、保留を選んだ');

const b = parseBacklog(`## R-010 作業中
- 状態: 作業中
- 優先: 5
- 完了条件: x
- 実行: research-run r010

## R-011 次
- 状態: 次
- 優先: 1
- 完了条件: x
`);
const pb = pickInRepo(b.items);
ok(pb?.item.id === 'R-010' && pb.mode === '続ける', '作業中より新しい項目を先にした');

const c = parseBacklog(`## R-001 a
- 状態: 済み
- 完了条件: x

## R-001 b
- 状態: たぶん
`);
ok(c.errors.some((e) => e.includes('2回')), '番号の重なりを見つけない');
ok(c.errors.some((e) => e.includes('結果')), '済みなのに結果が無いのを見つけない');
ok(c.errors.some((e) => e.includes('たぶん')), '知らない状態を見つけない');
ok(c.errors.some((e) => e.includes('完了条件')), '完了条件の無いのを見つけない');

// 日替わり: 日付が1日進むと、最初に見るリポジトリが1つ進む。することの無いリポジトリは飛ばす
const d0 = new Date('2026-11-12T03:00:00Z');
const d1 = new Date('2026-11-13T03:00:00Z');
ok(dayNumber(d1) - dayNumber(d0) === 1, '日付の通し番号がずれる');
ok(dayNumber(new Date('2026-11-12T16:00:00Z')) === dayNumber(d1), '日本時間の日付で数えていない');
const empty = { name: 'empty', items: [] };
const repos = [{ name: 'x', items: a.items }, empty, { name: 'y', items: b.items }];
const seen = new Set([0, 1, 2].map((k) => plan(repos, new Date(d0.getTime() + k * 864e5))?.repo));
ok(seen.has('x') && seen.has('y') && !seen.has('empty'), `日替わりで回らない: ${[...seen]}`);
ok(plan([empty], d0) === null, 'することが無いのに選んだ');
ok(pickInRepo(b.items, new Set(['R-010']))?.item.id === 'R-011', '--skip した作業中の項目を選んだ');
const only = [{ name: 'y', items: b.items }];
ok(plan(only, d0, new Set(['y:R-010', 'y:R-011'])) === null, '--skip を全部した のに選んだ');
ok(plan(only, d0, new Set(['x:R-010']))?.item.id === 'R-010', 'ほかのリポジトリの --skip を当てはめた');

if (errors.length) {
  console.error(errors.map((e) => `::error::${e}`).join('\n'));
  process.exit(1);
}
console.log('research-next: 見方は合っています');
