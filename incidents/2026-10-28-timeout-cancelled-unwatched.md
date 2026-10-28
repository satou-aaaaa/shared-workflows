# sandbox の Weekly mutation が初回から4週続けて2時間の上限で止まり、だれも気づかなかった

- 種類: 見回りの見落とし
- 場所: satou-aaaaa/sandbox の Weekly mutation・共通部品 ci-failure-issue
- 気づいた人: 監督の巡回（開いたままの ci-failure Issue sandbox #310 を直す途中で）
- 影響: ミューテーションテストの週次結果が9/30の導入から一度も出なかった（5回のうち4回が時間切れ、1回が初回テストの失敗）。生き残りの要約 Issue も一度も更新されていない。

## 起きたこと
- 9/30〜10/17、Weekly mutation の4回がどれも `timeout-minutes: 120` に当たって止まった。実行の結論は `cancelled` だった。
- 10/24 の回は「実行の印」検査が Stryker の写しの中で落ちて `failure` になり、10/28 に見回りが Issue #310 を立てた（検査は #307 で直り済み）。
- #310 を調べて、それより前の4回が時間切れだったと分かった。

## 原因
- 1つのジョブで 3251 件のミュータントに、1件ごとに全テスト（約10秒）を流していた。手元で測ると約7時間かかる。導入時（ADR-0011）の見積もり「数分〜数十分」は、テストが今の約5分の1だった頃のもの。
- ジョブが timeout-minutes に当たると、実行全体の結論は `timed_out` ではなく `cancelled` になる。共通部品 ci-failure-issue は `failure`・`timed_out` だけを知らせ、`cancelled` は数えていなかった。

## なぜ見つからなかったか
- 見張りは「手で止めた・concurrency で取り消した」実行を数えないために `cancelled` を外していた。時間切れも同じ `cancelled` になることを確かめていなかった（`timed_out` を入れていたので拾えると思い込んでいた）。
- 週次のワークフローを足したとき、手で1回流して完走を確かめていなかった（初回の手動実行も時間切れで `cancelled` だった）。

## 対策
- [x] 直す: Weekly mutation をモジュールごとの組（17組）に分けて並べ、各組ではその組のファイルを使うテストだけを流す。届かなかった組があれば失敗にする（sandbox #311）
- [x] 見つける: 共通部品 `ci-failure-issue.yml` が `cancelled` の実行のジョブの注記を読み、「exceeded the maximum execution time」があれば `timed_out` として Issue にする（この PR）。ひな形に `checks: read` を足した（非公開リポジトリで注記を読むため）
- [x] 防ぐ: sandbox の `test/mutationPlan.test.js` が、どの組にもテストが届くこと・組が20以内であることを毎回の `npm test` で見る（sandbox #311）
