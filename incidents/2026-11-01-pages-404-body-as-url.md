# Pages の無いリポジトリで、Site watch が gh api の 404 の本文を URL にして落ちた

- 種類: 公開・CI
- 場所: 共通部品 site-watch.yml（usotsuki-roppo で発生）。lighthouse.yml・post-deploy.yml・ci-failure-issue.yml にも同じ書き方
- 気づいた人: 監督の見回り（usotsuki-roppo の Issue #8 が1日開いたまま）
- 影響: usotsuki-roppo の Site watch が1回失敗し、CI失敗 Issue が開いたままになった。公開ページは壊れていない

## 起きたこと
2026-11-01 00:11 UTC、usotsuki-roppo で Site watch の最初の定時実行が動いた。まだ Pages を有効にする前だった。
`gh api repos/…/pages` が 404 を返し、その本文（`{"message":"Not Found",…}`）が公開URLとして使われ、curl が「URL が不正」で6回失敗した。
部品には「Pages が無ければ何もせず終わる」分岐があったが、通らなかった。

## 原因
`base=$(gh api … 2>/dev/null || true)` と、失敗を $( ) の中で受けていた。gh api は HTTP エラーでもエラーの本文を標準出力に出して終わるので、変数が空にならず「Pages が無い」と判定できなかった。同じ書き方が lighthouse・post-deploy・ci-failure-issue にもあった。

## なぜ見つからなかったか
いままでの部品の利用先はどれも Pages が有効になってから呼び出しを入れていて、「Pages が無い」分岐が一度も動いていなかった。actionlint・shellcheck は $( ) の中の `|| true` を誤りとは見ない。

## 対策
- [x] 直す: 4つの部品で `x=$(…) || x=""` と外で受け、URL は `https://` で始まるものだけ使う。curl の結果も同じ形に（この PR）
- [x] 防ぐ: Lint に `scripts/check-capture.mjs` を足し、ワークフローの `$(gh …|| true)`・`$(curl …|| echo …)` を落とす（この PR。直す前の版で落ちることを確かめた）
- [x] 見つける: 呼び出し元の `ci-failure-issue.yml` が失敗で Issue を立て、6時間ごとの見張りが次の成功で閉じる仕組みはそのまま（shared-workflows #83）
