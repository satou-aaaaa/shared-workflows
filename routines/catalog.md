# 繰り返しの作業の一覧（どこに手順書があるか）

satou さんのところで繰り返し行われる作業を1か所に並べた表。手順の中身はここに書かず、置き場所だけを書く（手順の本文は1か所だけに置く）。
新しいルーティン・定期の CI・決まった手順のスキルを作ったら、同じ PR でこの表に1行足す。止めたら消す。
ルーティンとスキルの定期見直し（[routine-review.md](routine-review.md) の A）が、毎週 list_triggers とこの表を突き合わせる。

最終確認: 2026-10-18（有効なルーティンを list_triggers で全件見た）

## Claude のルーティン（手順書がこのリポジトリにあるもの）

プロンプトは [README.md](README.md) の1行。手順を直すときはこのフォルダへの PR。

| 作業 | 手順書 | 実行 |
| --- | --- | --- |
| 監督の巡回 | [supervisor.md](supervisor.md) | 6時間ごと（:41） |
| 全リポジトリ・全プロジェクト巡回 | [repo-patrol.md](repo-patrol.md) | 毎日 22:38 JST |
| ルーティンとスキルの定期見直し | [routine-review.md](routine-review.md) | 土曜 9:53 JST |
| CI の時間短縮 | [ci-speedup.md](ci-speedup.md) | 木曜 10:26 JST |
| ダンジョンボドゲ issue 自動対応 | [dungeon-issue.md](dungeon-issue.md) | 3時間ごと（:54） |
| LAST TELL ソースの控え | [last-tell-backup.md](last-tell-backup.md) | 日曜 8:52 JST |
| 新しいリポジトリ・プロジェクトの受け入れ | [onboarding.md](onboarding.md) | 増えたとき |

## Claude のルーティン（手順書がほかにあるもの）

| 作業 | 手順書 | 実行 |
| --- | --- | --- |
| sandbox Issue/PR定期対応 | satou-aaaaa/sandbox `docs/routines/issue-pr.md` | 月曜 4:35 JST |
| sandbox 運用エージェント | satou-aaaaa/sandbox `docs/routines/ops-agent.md` | 平日 2:07 JST |
| sandbox 新規Issueの提案 | satou-aaaaa/sandbox `docs/routines/weekly-issue-proposal.md` | 水曜 8:47 JST |
| 週1の開発レポート | このプロジェクトの共有フォルダ `dev-report/README.md` | 月曜 7:13 JST |
| LAST TELL 毎日の改善提案 | プロンプト内（短い。LAST TELL プロジェクト） | 毎日（send_later で自分を入れ直す） |
| カルカソンヌ 週次の研究進捗まとめ | プロンプト内（短い。カルカソンヌ プロジェクト） | 日曜 20:45 JST |
| 個人の作業（朝のタスク整理・転職・動画・連載など） | 各プロジェクトの共有フォルダかプロンプト内 | — |

個人情報を扱う作業の手順は、公開リポジトリであるここには置かない（名前と置き場所も書かない）。
1回だけの確認（send_later の「〇〇の確認」）は表に載せない。

## Claude を使わずに CI で動くもの

| 作業 | 置き場所 | 実行 |
| --- | --- | --- |
| 週次まとめ Issue（開いた PR・CI 失敗） | このリポジトリ `weekly-summary.yml` | 月曜の朝 |
| CI時間 Issue | このリポジトリ `ci-time-report.yml` | 木曜 05:29 JST |
| 成績表 Issue | このリポジトリ `scorecard.yml` | 月曜 06:07 JST |
| 死活監視・Lighthouse・リンク切れ・ブランチ片付け・ラベル | 各リポジトリの `.github/workflows/`（中身はこのリポジトリの共通部品） | 毎日〜週1 |
| CI 失敗 Issue・自動マージ・更新情報・公開後の確認 | 同上 | PR・push のたび |
| 共通部品の試運転・権限の表の見張り | このリポジトリ `selftest.yml`・`permission-guard.yml` | PR のたび |
| カルカソンヌ自己対戦 | carcassonne-research `selfplay.yml` | 6時間ごと |
| LAST TELL 自動対戦 | last-tell `playthrough.yml` | 毎日 3:00 JST |
| sandbox のバックアップ・法令の見張り・夜間検査・ミューテーション | sandbox `backup.yml`・`law-watch.yml`・`nightly.yml`・`weekly-mutation.yml` | 定期 |

## 人やエージェントが毎回同じ手順で行う作業（スキル・決まり）

| 作業 | 手順書 |
| --- | --- |
| PR を作る・CI を通す・コンフリクトを直す・マージする・公開を確かめる | [pr.md](pr.md)（共通スキル「PR の手順」もこれを読む）。リポジトリだけの決まりは各 `CLAUDE.md` と `.claude/skills/steward/`（今は carcassonne-research） |
| CI が赤のとき・Gemini のレビュー | [common.md](common.md) の「CI が赤のとき」「Gemini のレビュー」 |
| LAST TELL の更新（index.html の作り直し・公開） | last-tell `README.md`、スキル last-tell-release-check |
| tenbin の作り直し・論文問題の追加 | tenbin `CLAUDE.md`、スキル add-ronbun-questions |
| 単体HTMLアプリの画面点検 | スキル law-app-ui-check |
| LAST TELL の演出の提案 | スキル last-tell-proposal-demo |
| 聞くか聞かないかの判断 | [autonomy.md](autonomy.md) |
| 各プロジェクトの進め方の見直し（分野のベストプラクティス） | [project-practices.md](project-practices.md)（土曜の見直しの F が1プロジェクトずつ） |
