# 新作のリポジトリが作れていないのを、許可の問題と思って6時間待った

- 種類: 手順の抜け
- 場所: shared-workflows の Actions「Create repo」・routines/onboarding.md 手順0-A（デマたしかめ dema-tashikame）
- 気づいた人: デマたしかめのスレッド
- 影響: ゲームは出来ていたのに、公開が約6時間遅れた。satou さんに GitHub アプリの許可を直してもらう手間をかけた（直しても届かなかった）。

## 起きたこと
- 2026-11-07 03時ごろ、Create repo を起こしたあと「作れた」として進め、`add_repo` が「you don't have access」を返した。
- 新しいリポジトリが Claude の GitHub アプリの対象に入っていないと考え、コーディネーター経由で satou さんに許可を直してもらい、再試行を3回くり返した。
- 09時、許可を直しても届かないので Create repo をもう一度起こしたら緑になった（もうあれば止まる作り）。前の実行では作れていなかった。

## 原因
- 実行の一覧はどれも題が「Create repo」で、入力の名前が出ない。並行で多くの新作が作られていて、別のゲームの緑の実行を自分のものと思った。
- 「you don't have access」は、リポジトリが無いときにも出る。許可の問題と決めつけた。

## なぜ見つからなかったか
- 手順書に「自分の実行が緑か見る」とはあったが、一覧で見分ける手がかりが無かった。`add_repo` が失敗したときに、まずあるかを確かめる手順も無かった。

## 対策
- [x] 直す: Create repo を同じ inputs で起こし直して作り、PR #1 を出した（satou-aaaaa/dema-tashikame#1）
- [x] 見つける: `.github/workflows/create-repo.yml`・`.github/workflows/add-ruleset.yml` に run-name「Create repo: <名前>」「Add ruleset: <名前>」を付け、一覧で自分の実行が分かるようにした
- [x] 防ぐ: `routines/onboarding.md` 手順0-A に「`add_repo` が you don't have access なら、許可を疑う前に list_repos で探し、無ければ同じ inputs で起こし直す（もうあれば止まるので安全）」を足した
