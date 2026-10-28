# carcassonne-research の selfplay が、もう main に入っていた差し替えを PR にしようとして失敗した

- 種類: 公開・CI
- 場所: satou-aaaaa/carcassonne-research の selfplay（scripts/merge_via_pr.sh）
- 気づいた人: 共通部品 ci-failure-issue の見回り（Issue #92）と監督の巡回
- 影響: selfplay の1回分（10/28 04:47 UTC）が赤になり Issue が立った。対戦ページは先の回で同じチャンピオンに差し替え済みで、遊ぶ人への影響は無い。

## 起きたこと
- selfplay は同時に1本しか回らない。10/27 22:57 に予約された回（run 54）は、先の回（run 53）が終わる 23:45 まで待たされた。
- 待たされた回は、予約した時点の main（9cc4c88）を取り出して約5時間走った。そのあいだに、先の回が同じチャンピオン gen633 を main に入れていた。
- 対戦ページの差し替えは、古い取り出しと比べて「新しい」と判定した。`merge_via_pr.sh` が main に rebase すると差が無くなり、`gh pr create` が「No commits between main and auto/…」で失敗した。
- 知らせには「Actions の PR 作成の設定が切れている」とだけ出て、本当の原因が分からなかった。

## 原因
- `merge_via_pr.sh` が、rebase のあと main との差が残っているかを確かめずに PR を作っていた。
- ワークフローの取り出しは予約した時点のコミットで行われ、待っているあいだに main が進むことを前提にしていなかった。

## なぜ見つからなかったか
- `merge_via_pr.sh` を作ったとき（10/24、incidents/2026-10-24-fix-pr-left-unmerged.md）のテストは、直接 push を落とすことだけを見ていた。差が無くなる形は試していなかった。
- それまでは selfplay の回の間隔が、1回にかかる時間より長かったので、待たされる回が出なかった。

## 対策
- [x] 直す: `merge_via_pr.sh` で、rebase のあと main と差が無ければ PR を作らずに成功で終える（carcassonne-research #93）
- [x] 防ぐ: 待たされた回の形をにせものの gh で再現するテスト `tests/test_merge_via_pr.py`（直す前は落ちることを確かめた。carcassonne-research #93）
- [x] 見つける: PR を作れなかったときの知らせで、原因を設定だと決めつけず、gh のメッセージを見るよう書く（carcassonne-research #93）
