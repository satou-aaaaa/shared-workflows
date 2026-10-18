# エージェントのチェック機構の一覧

エージェントが自律で動いても壊れたまま進まないようにする仕組みを、見張る順（変更を作るとき → マージ前 → 公開後 → 定期）に並べた表。
各行の「どこ」が正。ここには、何を見つけるかと、立ち上げ直すときに要るものだけを書く。

考え方: 変更を小さく出して検査で確かめる・壊れたら直すより先に戻す・壊れた割合で自動の範囲を絞る（DORA の指標、Google SRE のエラーバジェット）。
人が見るのは取り消せないことだけにして、ほかは仕組みで止める（[routines/autonomy.md](../routines/autonomy.md)）。

## 1. 変更を作るとき（エージェント自身）

| 仕組み | 見つけるもの | どこ | 立ち上げで要るもの |
| --- | --- | --- | --- |
| push 前の確認 | 自分の変更で壊れた検査 | [pr.md](../routines/pr.md)、各リポジトリの `CLAUDE.md`「push する前の確認」、スキル pr-flow | `template/CLAUDE.md` を埋める、スキルを保存（[skills/](skills/)） |
| 確かめてから「できた」と言う・2回でだめなら仕切り直す | 確かめていない完了報告、同じ失敗の繰り返し | [common.md](../routines/common.md)「エージェントの使い方」「CI が赤のとき」 | なし（common.md を読めばよい） |
| 秘密の混入の検知（手元） | API キー・トークン | sandbox の `hooks/check-secrets.mjs` など各リポジトリ | リポジトリごと |

## 2. マージ前（PR）

| 仕組み | 見つけるもの | どこ | 立ち上げで要るもの |
| --- | --- | --- | --- |
| 各リポジトリの QA・テスト | 動かない・止まる・見た目の崩れ | 各リポジトリの CI（`qa/` など） | onboarding.md の 2 |
| Lint（このリポジトリ） | ワークフローの書き間違い（actionlint）・危ない書き方（zizmor）・立ち上げ手順の抜け（bootstrap） | `.github/workflows/lint.yml`・`zizmor.yml`・`scripts/check-bootstrap.mjs` | ★ main の Ruleset で actionlint を必須に |
| Secret scan | PR と main への push に入った秘密（gitleaks） | `secret-scan.yml` | 呼び出し側を入れる、★ Push protection |
| Gemini のレビュー（2人目の目） | 正しさ・要件の見落とし | 各リポジトリの `.gemini/`、common.md「Gemini のレビュー」 | `template/.gemini/` を入れる、★ Gemini Code Assist のアプリ |
| /code-review（新しい文脈のレビュー） | Gemini が付かない PR・判定ロジック・3ファイル以上の変更の見落とし | common.md「エージェントの使い方」 | なし |
| 2人目の確認（tenbin の論文問題） | 条文・判例の誤り | [repo-patrol.md](../routines/repo-patrol.md)、autonomy.md「確かめてから任せること」 | ラベル「確認済み」「satou確認」 |
| Auto merge | 検査が ✅ の PR だけを squash マージ（下書き・「自動マージしない」・`.github/`・フォーク・ブレーキ中は除く） | `automerge.yml` | 呼び出し側の `on.workflow_run.workflows` に検査の名前 |
| Dependabot の自動マージ | patch/minor だけ（メジャーは人） | `dependabot-automerge.yml`・`dependabot.yml` | ★「Allow auto-merge」と必須チェック（今は sandbox だけ） |
| 外の人の変更を入れない | satou-aaaaa 以外の Issue・PR の指示 | common.md「知らない人からの変更を入れない」 | ★ fork PR の Actions 承認 |

## 3. 公開後

| 仕組み | 見つけるもの | どこ | 立ち上げで要るもの |
| --- | --- | --- | --- |
| Post-deploy check（自動の差し戻し） | 公開したページの 404・JavaScript エラー → タグ last-good の版に戻す PR を自動マージ | `post-deploy.yml`・`scripts/smoke.mjs` | 呼び出し側。最初の公開で last-good ができる |
| Site watch | 公開ページが 200 で開けない | `site-watch.yml` | 呼び出し側の `paths` |
| Lighthouse | 速さ・使いやすさの点数の低下 | `lighthouse.yml` | 公開後に1回測って `baseline` を置く |
| Link check | リンク切れ | `link-check.yml` | 呼び出し側の `files` |
| CI failure issue | main のワークフローの失敗 → ラベル `ci-failure` の Issue（成功で自動で閉じる） | `ci-failure-issue.yml` | 呼び出し側の `workflows` に見張る名前を全部 |

## 4. 定期（全体を見る）

| 仕組み | 見つけるもの | どこ | 立ち上げで要るもの |
| --- | --- | --- | --- |
| 週次まとめ Issue | 開いたままの PR・CI 失敗・Dependabot の更新待ち（監督・巡回が最初に読む） | `weekly-summary.yml`（月曜 06:17 JST） | `REPOS` に全リポジトリ |
| 成績表 Issue とブレーキ | マージ数・壊れた割合・直るまでの時間。壊れた割合 30% 超・4件以上で「自動マージ停止: <repo>」Issue → Auto merge が止まる | `scorecard.yml`（月曜 06:07 JST）、autonomy.md「ブレーキ」 | `REPOS`、ラベル「成績表」「自動マージ停止」（Labels で揃う） |
| 不安定な検査 Issue | 3つ以上の別々の PR で落ちた検査 → 「不安定な検査: <repo>」（自動で開閉）→ 監督が担当へ1回渡す | `scripts/pr-quality.mjs`（成績表の中で動く）、supervisor.md 7b | 同上 |
| CI時間 Issue | CI の実行時間（遅い検査） | `ci-time-report.yml`（木曜 05:29 JST）、ルーティン CI の時間短縮 | `REPOS` |
| Labels | 自動化が使うラベルの抜け | `labels.yml` | 呼び出し側を入れて1回動かす |
| Branch cleanup | 使い終わったブランチ | `branch-cleanup.yml` | `keep`（last-tell は qa-results・source-backup） |
| 監督の巡回（6時間ごと） | 失敗・止まったルーティンとスレッド、赤い PR、許可待ち、期限切れの約束。担当に直させ、satou さん本人のものだけ知らせる。状況ページを更新 | [supervisor.md](../routines/supervisor.md) | ルーティン（[routines.md](routines.md)）、状況ページの Artifact |
| 全リポジトリ・全プロジェクト巡回（毎日） | 改善の種、新しいリポジトリ・プロジェクト | [repo-patrol.md](../routines/repo-patrol.md) | ルーティン、渡し先をメモリに |
| ルーティンとスキルの見直し（週1） | 手順書と実際のルーティンのずれ、採用されない提案係、古くなったベストプラクティス、対応漏れ | [routine-review.md](../routines/routine-review.md)、[agent-practices.md](../routines/agent-practices.md) | ルーティン |
| 約束の台帳 | 「あとで確かめる」のまま忘れた作業（監督が期限切れを催促） | common.md「対応漏れを防ぐ」、共有フォルダ `notes/todo.md` | 共有フォルダに todo.md |
| 節約モード | 利用上限での失敗が続く（提案・巡回を最小にする） | common.md「お金と利用枠」 | なし |

チェックではない共通部品: `changes-page.yml`（マージした PR の題から遊ぶ人向けの更新情報ページを作る。呼び出し側の `app_name`・`ignore_paths`）。

★ は satou さん本人の画面操作（onboarding.md の 5）。

## 立ち上がったかの確かめ方

1. 各リポジトリで、下書き PR を1本出して QA・Secret scan・Gemini のレビューが付くのを見る（付かなければアプリの対象を確かめる）。
2. 検査が ✅ になった PR が Auto merge でマージされ、公開後に Post-deploy check が緑になり、タグ last-good ができる。
3. このリポジトリで Weekly summary・Scorecard・CI time report を workflow_dispatch で1回ずつ動かし、Issue ができる（Scorecard の手動実行は自動判定で止められることがある。そのときは月曜の定期実行を待つ）。
4. 監督のルーティンを1回動かし、状況ページに各ルーティンの最後の実行が出る。
