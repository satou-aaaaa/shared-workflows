# carcassonne-research の selfplay が、採用の知らせの本文が長すぎて失敗した

- 種類: 公開・CI
- 場所: satou-aaaaa/carcassonne-research の selfplay（「新しく採用が出たら Issue で知らせる」）
- 気づいた人: 共通部品 ci-failure-issue（Issue #110）と監督の見回り
- 影響: selfplay の1回分（11/02 04:27 UTC）が赤になった。チャンピオン gen890 の採用・対戦ページの差し替え・学習ページの作り直し（#111）は済んでいて、抜けたのは採用の知らせの Issue だけ。

## 起きたこと
- 試行890で新しいチャンピオンが採用され、最後のステップが知らせの Issue を作ろうとした。
- 本文に成績表 `progress.md` を丸ごと入れていた。表は1試行で1行ずつ伸び、68700 文字になっていた。
- `gh issue create` が「Body is too long (maximum is 65536 characters)」で失敗した。

## 原因
- CI が作る本文に、回を重ねるほど伸びる中身をそのまま入れ、長さの上限を考えていなかった。
- 前の採用（gen836、11/01）のときは 64562 文字で、ぎりぎり上限の内側だった。そのため、それまでは失敗が出なかった。

## なぜ見つからなかったか
- このステップは約5時間の自己対戦のあと、しかも採用が出た回にしか動かない。テストでも普段の実行でも通らず、本番で初めて上限に当たった。
- 前の selfplay の失敗（incidents/2026-10-28-queued-run-empty-pr.md、#92）の対策は、`merge_via_pr.sh` の「差が無い PR」だけを見ていた。今回は別のステップ（知らせ）の、別の原因（本文の長さ）なので、前の対策が効く範囲の外だった。前の対策が壊れていたわけではない。
- どちらも「長い本番の最後のほうでしか動かず、テストで通らない部分」で起きた。前回はその部分全体を見直していなかった。

## 対策
- [x] 直す: 本文を上限に収める `scripts/cap_body.py` を作り、selfplay・ai-content・`merge_via_pr.sh` で `--body-file` に渡す前に通す（carcassonne-research #112）
- [x] 防ぐ: `tests/test_workflows.py` が、`--body-file` に渡す本文が `cap_body.py` を通っているかを見る（直す前は3か所すべてで落ちることを確かめた。carcassonne-research #112）
- [x] 防ぐ: `tests/test_cap_body.py` が、5000 行の成績表でも上限に収まり、見出しと最新の行が残ることを確かめる（carcassonne-research #112）
- [x] 見つける: 共通部品の本文（ci-time-report・scorecard・weekly-summary・post-deploy）も見直した。どれも1回分のまとめで、回を重ねても伸びないので今は変えない（この PR）
