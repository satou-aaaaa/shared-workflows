# Link check が外のサイトの時間切れだけで落ち、Auto merge の一時的な 502 で Issue が開いたままになった

- 種類: 公開・CI
- 場所: shared-workflows の `link-check.yml`・`ci-failure-issue.yml`（bushu-tashizan・taiyokei-kurabe・kansen-yobo）
- 気づいた人: 監督の見回り
- 影響: 11/17 に CI失敗の Issue が3件（bushu-tashizan #24・taiyokei-kurabe #13・kansen-yobo #4）。リンクは生きていて、PR もマージ済みで、遊ぶ人への影響はなかった。

## 起きたこと
- bushu-tashizan と taiyokei-kurabe の Link check が、README の出典（edrdg.org・nao.ac.jp）の時間切れ（TIMEOUT）1件だけで落ちた。同じ日の前後の実行は緑で、Errors は0件。
- kansen-yobo の Auto merge が `gh api` の HTTP 502（GitHub 側）で1回落ちた。7分後の次の実行で PR #3 はマージされたのに、失敗の知らせのほうがあとから届き、Issue #4 が開いたまま残った。

## 原因
- Link check は lychee の終わりの番号をそのまま使っており、lychee は時間切れも「リンクの失敗」（番号2）に数える。国内の役所・大学などのサイトは GitHub の実行機（海外）にときどき答えないので、生きたリンクでも日によって赤になる。今までは落ちたサイトをゲームごとに `exclude` へ足していた（taiyokei-kurabe の JAXA・天文学辞典）ので、同じ種類が新しいサイトで繰り返した。
- ci-failure-issue は「失敗したら立てる・次の成功で閉じる」だが、知らせの順が入れ替わる（成功の知らせが先に済み、あとの失敗の知らせで Issue を立てる）場合を見ていなかった。古いコミットの失敗は見ていたが、同じコミットのまま後の実行が成功した場合が抜けていた。

## なぜ見つからなかったか
- Link check の時間切れはときどきだけ起き、落ちたときは exclude を足して閉じていたので、部品の判定そのものを見直す機会がなかった。
- ci-failure-issue には動きを試す検査が無く、知らせの順が入れ替わる形はだれも試していなかった。

## 対策
- [x] 直す: Link check は時間切れだけなら警告（::warning）で通し、404 などのリンク切れ・分からないもの・読めない結果の表は今までどおり落とす（`link-check.yml`、この PR）
- [x] 防ぐ: 判定の手順を結果の表の見本（`scripts/fixtures/lychee/`）で試す `scripts/check-link-check-judge.sh` を Lint（`scripts/check.sh`）に足した（この PR）
- [x] 直す: ci-failure-issue は、失敗のあとに始まった実行が main でもう本当に成功（試しの実行でなく、成功の印が動いた）していれば、その失敗を知らせない（`ci-failure-issue.yml`、この PR）
- [x] 直す: 開いたままの3件の Issue を、直したあとの実行で閉じた（この PR のマージ後に Link check を回し直し、kansen-yobo #4 は閉じた）
- [ ] 見つける: 時間切れが同じ URL で続くとき（本当に止まったサイト）を週次まとめに出す（担当: CI時間短縮、期限: 2026-12-01）
