# carcassonne-research の自動の CI が2週間で73回赤になった（承認待ちの PR 検査・API の 504・コツ集の言い切り）

- 種類: 公開・CI
- 場所: carcassonne-research（selfplay・AI content・auto/* の PR）
- 気づいた人: 監督の集計（10/21〜11/03 の CI 失敗一覧）
- 影響: 失敗73回（成功341回）。auto/* の PR の検査が45回ジョブ0件で failure になり、生成物は検査されずに main へ入っていた。コツ集の作り直しが11回止まった。

## 起きたこと
- 自動の PR（GITHUB_TOKEN で作成）の test・CodeQL・Secret scan が、作成から数秒のマージでジョブ0件の failure になった（例: carcassonne-research の PR #115、run 41573639207）。
- AI content が、48局のぶれで「勝った側は草原でも多く取る」が外れて止まった（gen926）。止まるたびに毎日の定期実行も赤になった。gen419・gen576・gen836 に続く4回目（前回は 2026-11-01-tips-claim-noise-again.md）。
- selfplay の Issue 作成が `HTTP 504 Gateway Timeout` で1回失敗し、ジョブが赤になった。

## 原因
- GITHUB_TOKEN で作った PR の pull_request の実行は承認待ちになる。それが動く前にマージしてブランチを消していた。
- 雑音のある集計に対する言い切りの検査が、パイプライン全体を止める作りだった。
- gh の呼び出しに、一時的な失敗をやり直す仕組みが無かった。

## なぜ見つからなかったか
- auto/* のブランチは CI 失敗の Issue の見張り対象外（main だけを見る）だったので、失敗は知らせに上がらなかった。
- 言い切りは「外れたら文を直す」運用で、毎回その場の文だけを直していた。

## 対策
- [x] 直す: 「草原でも多く取る」を本文と検査から外し、gen912・gen926 を `tests/data/habits_history/` に足した（carcassonne-research #121）
- [x] 防ぐ: 自動のコミットに [skip ci] を付け、test・Secret scan を workflow_dispatch で回して、通ったときだけマージする（`scripts/merge_via_pr.sh`、carcassonne-research #121）
- [x] 防ぐ: 言い切りが外れたら止めずにコツ集を前の版で残し、`data/tips_blocked.json` と Issue で直しを頼む（carcassonne-research #121）
- [x] 防ぐ: gh の 5xx は `scripts/gh_retry.sh` でやり直す。Issue は gh_issue_create_once で2件にしない（carcassonne-research #121）
- [x] 見つける: にせものの gh で merge_via_pr.sh・gh_retry.sh を試しに動かすテストと、ワークフローの gh が ghr を通るかの検査（`tests/test_merge_via_pr.py`・`tests/test_workflows.py`、carcassonne-research #121）
- [ ] 見つける: actionlint を CI か check.py に入れる（担当: carcassonne-research のスレッド、期限: 2026-11-17）
