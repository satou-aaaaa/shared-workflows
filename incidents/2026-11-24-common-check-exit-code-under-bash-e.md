# 毎日の共通の点検（Common check）が、最初に決まりに外れたゲームを見つけた所で落ちた

- 種類: 公開・CI
- 場所: `.github/workflows/common-check.yml`（画面の決まりを見る段）。同じ書き方が `.github/workflows/game-explore.yml` にも3か所
- 気づいた人: CI（2026-11-24 7:43 JST の初回の定期実行。ci-failure の Issue #603）
- 影響: 点検が途中で止まり、Issue「共通部品の抜け」「画面の決まりの違反」にまとめられなかった。ゲームの不具合ではない（点検そのものの不具合）。

## 起きたこと
- 11/23 に入れた Common check の初回の実行が、「画面の決まりを見る」段で終わりの番号 1 で落ちた。ログには違反の中身が出ず、段の途中で止まっていた。

## 原因
- GitHub Actions の `run:` は `bash -e {0}` で動く。段の中で `set -uo pipefail` と書いても `-e` は残る。
- `log=$( … ui-check.mjs … ); code=$?` は、ui-check が 1（決まりに外れた）で終わると、代入の行で段ごと止まり、`code=$?` まで来ない。違反が1本でもあれば必ず落ちる書き方だった。
- game-explore.yml の `node … > log` の次の行の `code=$?`・`qcode=$?` も同じ（不具合を見つけた所で止まる）。

## なぜ見つからなかったか
- 入れた PR（#583）では、違反の無い見本でしか動かしていなかった。マージ後に Run workflow で一度回していなかった。
- actionlint・shellcheck は、`-e` で動くことを前提にしたこの形を指摘しない。

## 対策
- [x] 直す: `code=0; log=$(…) || code=$?` の形にした（common-check.yml・game-explore.yml）。この PR
- [x] 防ぐ: `scripts/check-exit-codes.mjs` を足し、check.sh と Lint で `run:` の中の `$?` を `||` の右以外で使っていたら落とす（`set +e` の間は見ない）。自己検査つき。この PR
