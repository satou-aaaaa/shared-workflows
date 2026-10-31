# carcassonne-research の「CI失敗: AI content」が、直ったあとも2日閉じなかった

- 種類: 公開・CI
- 場所: satou-aaaaa/carcassonne-research の AI content・共通部品 ci-failure-issue
- 気づいた人: 監督の巡回（1日以上開いた ci-failure Issue として）
- 影響: Issue #83 が 10/26〜28 開いたまま。10/27 18:37 と 10/28 00:11 に成功していたのに閉じず、見回りが直す仕事を頼んだ。同じ穴で、自動マージが起こす Pages・Release tag・main の QA の失敗も Issue にならないおそれがあった。

## 起きたこと
- 10/26〜27、AI content がコツ集の言い切り「勝敗の差が大きい上位2つは都市と草原」と gen576 の集計が合わず4回失敗した（草原と道の差は数点で入れ替わる）。
- Issue #83 が立ったのは schedule の回だけ。selfplay が `gh workflow run` で起こした回は、失敗も成功も Issue に届かなかった。
- gen622・gen633 で成功したが、どちらも selfplay が起こした回だったので、Issue は閉じなかった。
- 同じ時期、Stale check（#80）が古い auto/ ブランチ4本で赤のままだった（消すのは satou さんの確認待ち）。

## 原因
- GITHUB_TOKEN で起こした実行は workflow_run を起こさない（[GitHub Docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)。workflow_dispatch だけが例外で、その実行の終わりは次のワークフローを起こさない）。CI失敗の見張りは workflow_run だけで動いていた。
- コツ集の言い切りに、誤差の範囲の順位（2位と3位）が入っていた。

## なぜ見つからなかったか
- 見張りの部品を作ったとき（10/14）は、見張るワークフローがすべて schedule・push で動いていた。あとから自動マージ（Pages・Release tag・QA の回し直し）や selfplay（AI content）が GITHUB_TOKEN で起こす形を足したが、見張りに届くかは誰も確かめなかった。
- 失敗の回が schedule でも1回あったので Issue は立ち、穴が「閉じない」形でしか見えなかった。

## 対策
- [x] 直す: コツ集の言い切りを「勝敗の差が一番大きいのは都市」にし、順位の入れ替わりで止めないテストを足した（carcassonne-research #91）
- [x] 防ぐ: 共通部品 `ci-failure-issue.yml` に見回り（呼び出し元の schedule で、見張る名前ごとに main の最新の実行を見て Issue を立てる・閉じる）を足した（この PR）。ひな形にも6時間ごとの schedule を入れた
- [x] 防ぐ: carcassonne-research に「ほかのワークフローが起こすワークフローは見張りに入り、見回りがある」テストを足した（carcassonne-research #91）
- [x] 防ぐ: この PR の初回で、手元に shellcheck が無く actionlint が run: を調べないまま通り、CI で落ちた。`scripts/check.sh` と `scripts/setup.sh` が shellcheck の無い環境を止める
- [x] 見つける: `scripts/drift-check.mjs` が ci-failure-issue の呼び出しに schedule が無いリポジトリを週次まとめに出す（この PR）
- [x] 防ぐ: ほかのリポジトリの呼び出しにも schedule を足す（last-tell #155・articles #6・local-kanban #79・naitei-no-michi #11・tenbin #25・sandbox #309）
