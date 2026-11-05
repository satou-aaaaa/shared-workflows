# CI の時間の集計が最初の6リポジトリだけで、ゲーム18本が入っていなかった

- 種類: 検査の見逃し
- 場所: shared-workflows の CI time report・ルーティン「CI の時間短縮」
- 気づいた人: ルーティン「CI の時間短縮」（2026-11-05 の回）
- 影響: 11/1 から増えたゲームなど18本の CI 時間が、週1の集計 Issue「CI時間」に一度も出ていなかった。速くする先を選ぶときに、その分が見えなかった。遊ぶ人への影響は無い。

## 起きたこと
- CI time report の `REPOS` は 2026-10-17 に作ったときの6つ（last-tell・tenbin・carcassonne-research・sandbox・local-kanban・shared-workflows）のままだった。
- 11/1〜11/4 にゲームのリポジトリを足したとき、drift-check.mjs などの一覧には足したが、CI time report には足さなかった。
- 直したあと同じ日に手で回すと、前の Issue（同じ日の題）を閉じてから、検索（`gh issue list --search`）がまだ「開いている」と返したので、新しい Issue を作らず、開いた「CI時間」が1件も無くなった。

## 原因
- 「全リポジトリ」を見る一覧が、ワークフローとスクリプトにばらばらに書かれていて、足すときにどれを直すかの決まりも検査も無かった。
- GitHub の検索は索引が遅れるのに、Issue の重なりを検索で見ていた。

## なぜ見つからなかったか
- 集計 Issue は読めたリポジトリだけを表にするので、入っていないリポジトリがあっても、表を見ただけでは気づけなかった。手順書の対象も6つのまま書かれていた。

## 対策
- [x] 直す: CI time report の `REPOS` に公開リポジトリ全部を足し、手順書の対象を「`REPOS` と同じ」にした（この PR）
- [x] 防ぐ: `scripts/check-repo-lists.mjs` が、CI time report の `REPOS` に drift-check.mjs の `REPOS` の抜けがあると Lint を落とす（この PR）
- [x] 見つける: 同じ検査を `scripts/check.sh`（push 前のフック）でも回す（この PR）
- [x] 直す: 同じ日の Issue は閉じず、重なりは検索でなく開いている一覧の題で見る。scorecard.yml の同じ形も直した（2つ目の PR）
- [x] 防ぐ: `gh issue list` に `--search` があると Lint・check.sh が落ちる（2つ目の PR）
