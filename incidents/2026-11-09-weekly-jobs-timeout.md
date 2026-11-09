# リポジトリが88本に増え、Weekly summary と Scorecard が時間切れで止まって週1の Issue が出なかった

- 種類: 公開・CI
- 場所: shared-workflows の `weekly-summary.yml`・`scorecard.yml`（中の `scripts/drift-check.mjs`・`next-actions.mjs`・`pr-quality.mjs`）
- 気づいた人: 監督の巡回（ci-failure Issue #267・#268）
- 影響: 2026-11-09（月）の週次まとめと成績表の Issue が作られなかった。自動マージ停止・不安定な検査の Issue の開け閉めも、この週は動かなかった。ゲームの公開には影響なし。

## 起きたこと
- 11-09 9:47 JST に Scorecard が、9:56 JST に Weekly summary が定期実行で動き、どちらも Issue を作る段が `timeout-minutes`（15分・5分）に当たって `cancelled` で止まった。
- ログには何も出ていなかった（本文はファイルに書くだけ）。残っていたのは node と gh の処理で、全リポジトリを1本ずつ読んでいる途中だった。

## 原因
- 見るリポジトリが repos.txt の88本に増え、1週間のマージが1,064件になった（前の週は149件。検索 `is:pr is:merged` で数えた）。
- 成績表の `pr-quality.mjs` は、マージした PR 1件ごとに実行の一覧・変更ファイル・落ちたジョブ・注記を gh で1回ずつ読み、1,000回を超える読み取りを順に待っていた。
- 週次まとめの `drift-check.mjs` は、リポジトリ1本ごとに約25ファイルを API で1つずつ読み、88本で2,000回を超えていた。シェルも1本ごとに gh を2回ずつ呼んでいた。
- GITHUB_TOKEN の API は「このリポジトリで1時間1,000回」（GitHub Docs「Rate limits for the REST API」）。10分ちがいで動く2つが、同じ枠を分け合っていた。

## なぜ見つからなかったか
- 読む回数がリポジトリの本数と PR の数に比例する作りで、かかった時間を見る仕組みが無かった。前の週は3分（上限15分）・1分（上限5分）で通っていて、増え方に気づけなかった。
- ジョブが時間切れになると、それまで集めた中身も含めて何も出ない作りだった（Issue を作るのは最後の1回だけ）。

## 対策
- [x] 直す: 読み方を `scripts/gh-api.mjs` にそろえた。1回の読み取りは30秒まで、4本ずつ並べ、1秒12回まで（二次の制限「1分900点」の内）。開いた PR・ci-failure・needs-decision は検索でまとめて読む（`weekly-lists.mjs`・`next-actions.mjs`）。ずれの検査はファイルを浅い clone から読み、API はルールセット・Pages などだけ（`drift-check.mjs` の CLONE_ROOT）。成績表は実行の一覧をリポジトリごとに1回、変更行は GraphQL 1回で読み、落ちた検査は新しい5回分だけ読む（`pr-quality.mjs`。上の表の数もここで数え、シェルの gh を減らした）。CI時間（`ci-time.mjs`）も同じ読み方にした（この PR）
- [x] 防ぐ: 中の node は予算（BUDGET_SEC・API_MAX）を超えそうになると読むのをやめ、読めなかったリポジトリを「確かめられなかった」「読めず」と書いて、Issue は必ず出す。ジョブの上限は 15分・30分・15分にした（この PR）
- [x] 防ぐ: 成績表を月曜 04:07 JST に動かし、週次まとめ（06:17）と2時間離した。同じ1時間の枠を分け合わない（この PR）
- [x] 見つける: 毎回かかった時間と API の回数をログの注記に出し、予算の6割を超えたら Issue の本文に ⏱ の行と ::warning:: を出す（`gh-api.mjs` の reportUsage）。リポジトリが増えて時間切れが近いことを、止まる前に週次まとめ・成績表で知らせる（この PR）
- [x] 防ぐ: Lint に `scripts/check-budgets.mjs` を足した。全リポジトリを読む定期のワークフローで、`for r in $REPOS` の中の gh api・gh issue list、BUDGET_SEC の無い node、gh-api.mjs を使わないスクリプト、予算の合計がジョブの上限の8割を超えるもの、60分以内に重なる定期実行を落とす（この PR）
- [x] 直す: 止まった週の成績表と週次まとめを、直したあと手で1回ずつ流して作った（Actions の Run workflow）
