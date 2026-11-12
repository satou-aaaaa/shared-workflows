# CI time report の本文が長すぎて Issue が作れず、前の週の Issue だけ閉じて「CI時間」の Issue が1件も無くなった

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows の `ci-time-report.yml`（CI time report）
- 気づいた人: ルーティン「CI の時間短縮」（2026-11-12 の回）
- 影響: 11/12 の CI時間の Issue が出ず、11/5 の Issue（#135）も閉じられて、ルーティンが読む集計が無くなった。ほかのリポジトリへの影響は無い。

## 起きたこと
- 11/12 10:28 JST、定期の集計がまだ動いていなかったので、ルーティンが CI time report を手で回した。
- 集計は182秒で終わったが、前の週の Issue #135 を閉じたあと、新しい Issue の作成が `Body is too long (maximum is 65536 characters)` で3回とも落ちた。
- リポジトリが増え（11/5 の24本から倍以上）、ワークフローごとの表の行が増えて上限を超えた。

## 原因
- 本文の長さに上限があることを、集計のスクリプトも作る手順も考えていなかった。表はリポジトリの本数に比例して伸びる。
- 前の Issue を閉じてから新しい Issue を作る順だったので、作るのに失敗すると何も残らなかった。週次まとめ・成績表も同じ形だった。

## なぜ見つからなかったか
- 11/9 にリポジトリ増加の時間切れ（2026-11-09-weekly-jobs-timeout.md）を直したとき、時間だけを見て、本文の長さ・Issue の順番は見なかった。Lint にも本文の長さを見る検査が無かった。

## 対策
- [x] 直す: `scripts/fit-body.mjs` を足し、本文が上限（UTF-8 で 60,000 バイト）を超えたら行の切れ目で後ろを切って「N 行を省いた」と全部の置き場（実行の Summary）を書く。CI time report は遅いステップを表の前に移し、切れるのは合計の短い行からにした（この PR）。
- [x] 防ぐ: CI time report・Weekly summary・Scorecard の3つとも、本文を `fit-body.mjs` で収め、前の Issue は新しい Issue を作ったあとに閉じる順に直した（この PR）。
- [x] 見つける: `scripts/check-budgets.mjs`（Lint）が、すべてのワークフローで「ファイルから Issue を作る前に fit-body.mjs を通しているか」「前の Issue を作る前に閉じていないか」を見る。直す前の3ファイルで6件見つかることを確かめた（この PR）。
