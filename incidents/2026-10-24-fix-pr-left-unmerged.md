# carcassonne-research の selfplay が main へ直接 push して断られ、直す PR も2日マージされず失敗が続いた

- 種類: 見回りの見落とし
- 場所: satou-aaaaa/carcassonne-research の selfplay（6時間ごと）・CI failure issue（共通部品）・監督の巡回
- 気づいた人: 監督の巡回（Issue #66）→ satou さんがボードのカードで「別スレッドで直す」
- 影響: 10/21〜24 の定期実行が12回続けて赤。対戦ページのAIが gen386 のまま、採用された新しいチャンピオンに差し替わらなかった。

## 起きたこと
- 10/21 に selfplay へ「対戦ページのAIを main に直接 push で差し替える」手順が入った（#62）。main は Ruleset で PR 必須なので、毎回 `GH013 Changes must be made through a pull request` で断られた。
- 10/22 朝、別のスレッドが直す PR #69（`scripts/merge_via_pr.sh` で PR を作ってすぐマージ）を出し、CI は緑になった。
- #69 は .github/ を変えるので自動マージが拾わず、出したスレッドもマージせずに終わった。監督は Issue #66 に「直す PR を出して」と2回書いたが、#69 はすでにあった。
- 10/24 に #69 をマージした。次の定期の回（22:03 UTC）は PR を作るところまで進んだが、リポジトリの設定「Allow GitHub Actions to create and approve pull requests」が切れていて断られた。

## 原因
- ワークフローが main へ直接 push していた。リポジトリの Ruleset（PR 必須）と食い違う書き方を止める検査が無かった。PR の CI はスケジュールの「main へ入れる」道を通らないので、PR の時点では緑だった。
- CI失敗の Issue は「失敗した」としか書かず、直す PR がもうあるかを知らせなかった。

## なぜ見つからなかったか
- 監督の巡回は Issue だけを見て、それを閉じる PR（本文の `Closes #66`）が開いたままかを見ていなかった。そのため「直して」と出し直すだけで、止まった PR をマージに回せなかった。
- 止まった PR を見つける仕組み（Stale check）は #69 自身に入っていたので、マージされるまで働かなかった。

## 対策
- [x] 直す: 直す PR をマージした（carcassonne-research #69）
- [x] 直す: carcassonne-research の設定「Allow GitHub Actions to create and approve pull requests」を ON にした（satou さん。selfplay が PR 経由で gen622・gen633 を入れたことで確認、carcassonne-research #84・#87）
- [x] 防ぐ: carcassonne-research の `tests/test_workflows.py` が、ワークフローと scripts/*.sh の `git push` が main を指していたら落とす。直す前の版で落ちることを確かめた（carcassonne-research #70）
- [x] 見つける: 共通部品 `ci-failure-issue.yml` が、Issue を閉じる PR（`Closes #N` など）が開いたままなら、その番号と最後の動きを失敗の知らせに書き添える（この PR）
- [x] 見つける: 監督の手順（supervisor.md 手順3）に、知らせに直す PR があれば修正を出し直さず、担当にマージを頼む、を足した（この PR）
- [x] 防ぐ: 立ち上げ手順（onboarding.md 5 の 4）に、CI が PR を作るリポジトリではこの設定を ON にする、を足した（この PR）
- [x] 見つける: carcassonne-research の `Stale check`（週1）が、3日動きの無い PR を知らせる（carcassonne-research #69）
