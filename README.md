# shared-workflows

satou-aaaaa の各リポジトリ（last-tell・tenbin・carcassonne-research・sandbox・dungeon-boardgame・naitei-no-michi）で共通に使う部品。
同じ処理をリポジトリごとにコピーせず、ここを1か所直せば全部に効くようにするためのもの。Claude は使わない（GitHub Actions だけで動く）。

| 場所 | 中身 |
| --- | --- |
| [.github/workflows/](.github/workflows/) | 再利用できるワークフロー（共通部品） |
| [template/](template/) | 新しいリポジトリにそのままコピーする呼び出し側のワークフロー・Dependabot・CLAUDE.md のひな形 |
| [routines/](routines/) | Claude ルーティンの共通のきまりと手順書 |

## 共通部品

| ファイル | すること | 主な設定 |
| --- | --- | --- |
| `ci-failure-issue.yml` | main のワークフローが失敗したら `ci-failure` の Issue を立て、成功したら閉じる | 見張るワークフロー名は呼び出し側の `on.workflow_run.workflows` |
| `site-watch.yml` | 公開ページ（GitHub Pages）が 200 で開けるか見る | `paths` |
| `lighthouse.yml` | Lighthouse の点数が基準から下がっていないか測る | `baseline`・`margin` |
| `branch-cleanup.yml` | 使い終わったブランチを消す（作業中・PR が開いているものは消さない） | `keep`・`keep_days`・`dry_run` |
| `automerge.yml` | 検査が ✅ の PR を squash マージし、公開を起こす | `require_paths`・`dispatch`・`pages_build`・`delete_branch` |
| `dependabot-automerge.yml` | Dependabot の patch/minor 更新の自動マージを予約する | — |
| `link-check.yml` | HTML のリンク切れを調べる（外部リンクも、3回まで試す） | `files`・`exclude` |
| `secret-scan.yml` | PR と main への push で、API キーなどの混入を gitleaks で調べる | — |
| `labels.yml` | 自動化が使う共通ラベル（ci-failure・自動マージしない・needs-decision・dependencies）を揃える | `extra` |
| `changes-page.yml` | マージされた PR の題から遊ぶ人向けの更新情報ページを作り、公開を起こす | `app_name`・`ignore_paths`・`dispatch`・`pages_build` |

このリポジトリだけで動くもの: `weekly-summary.yml`（毎週月曜の朝、全リポジトリの開いたままの PR と CI 失敗 Issue を、ラベル「週次まとめ」の Issue 1件にまとめる。監督・巡回はこれを読む）。`ci-time-report.yml`（毎週木曜の朝、全リポジトリの CI の実行時間を集計し、ラベル「CI時間」の Issue 1件にする。ルーティン「CI の時間短縮」はこれを読む。集計は `scripts/ci-time.mjs`）。

呼び出し側の書き方（例: Site watch）:

```yaml
name: Site watch
on:
  schedule:
    - cron: "17 21 * * *"
  workflow_dispatch:
permissions:
  contents: read
  pages: read
jobs:
  watch:
    uses: satou-aaaaa/shared-workflows/.github/workflows/site-watch.yml@main
    with:
      paths: index.html sw.js manifest.webmanifest
```

- 呼び出し側は `@main` を指す。ここを直すと次の実行から全リポジトリに効くので、変更は PR で出し、Lint（actionlint）が通ってからマージする。
- 権限（`permissions:`）は呼び出し側で与える。共通部品はその範囲でしか動けない。
- 全リポジトリが公開なので、Actions の利用料はかからない。
- 書き込めるのは satou さんとそのエージェントだけ（main は Ruleset で PR 必須・Lint 必須）。外部の人の PR はマージしない。

## 新しいリポジトリを作ったら

`template/` の中身をコピーし、`ci-failure-issue.yml` の見張るワークフロー名、`site-watch.yml` の `paths`、`lighthouse.yml` の `baseline`（最初に手で1回動かして測る）、`dependabot.yml` の対象、`CLAUDE.md` の `<>` を埋める。
