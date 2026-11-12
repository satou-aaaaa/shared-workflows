# 繰り返しの作業の一覧（どこに手順書があるか）

satou さんのところで繰り返し行われる作業を1か所に並べた表。手順の中身はここに書かず、置き場所だけを書く（手順の本文は1か所だけに置く）。
新しいルーティン・定期の CI・決まった手順のスキルを作ったら、同じ PR でこの表に1行足す。止めたら消す。
ルーティンとスキルの定期見直し（[routine-review.md](routine-review.md) の A）が、毎週 list_triggers とこの表を突き合わせる。

最終確認: 2026-11-07（有効なルーティンを list_triggers で全件見た）

## Claude のルーティン（手順書がこのリポジトリにあるもの）

プロンプトは [README.md](README.md) の1行。手順を直すときはこのフォルダへの PR。

| 作業 | 手順書 | 実行 |
| --- | --- | --- |
| 監督の巡回 | [supervisor.md](supervisor.md) | 見回りの中で1日2回（8:07・20:07 JST。2026-10-28 から） |
| 全リポジトリ・全プロジェクト巡回 | [repo-patrol.md](repo-patrol.md) | 平日 22:38 JST |
| ルーティンとスキルの定期見直し（G：トークン節約の点検 [token-check.md](token-check.md)） | [routine-review.md](routine-review.md) | 土曜 9:53 JST |
| CI の時間短縮 | [ci-speedup.md](ci-speedup.md) | 木曜 10:26 JST |
| ゲームの感想を読んで直す | [game-feedback.md](game-feedback.md) | 日曜 10:41 JST |
| ゲームを作る・1本磨く | [game-dev.md](game-dev.md) | 磨くのは水曜 10:17 JST・新作は下の毎日の回 |
| 新作ゲームを毎日1本ずつ進める（同時2本まで） | [game-factory.md](game-factory.md) | 毎日 10:37 JST |
| X（@coedogameclub）の運用 | [x-account.md](x-account.md) | 土曜 10:47 JST |
| ダンジョンボドゲ issue 自動対応 | [dungeon-issue.md](dungeon-issue.md) | 毎朝 9:54 JST |
| LAST TELL ソースの控え | [last-tell-backup.md](last-tell-backup.md) | 日曜 8:52 JST |
| sandbox Issue/PR定期対応（kensetsu-kyoka-toolkit） | [sandbox-issue-pr.md](sandbox-issue-pr.md) | 月曜 4:35 JST |
| 研究を毎日1件ずつ進める（carcassonne・gem-merchant・isle-routes の研究を日替わり） | [research-loop.md](research-loop.md) | 毎日 14:23 JST（重い計算は各リポジトリの research-run.yml） |
| 新しいリポジトリ・プロジェクトの受け入れ | [onboarding.md](onboarding.md) | 増えたとき |

## Claude のルーティン（手順書がほかにあるもの）

| 作業 | 手順書 | 実行 |
| --- | --- | --- |
| sandbox 新規Issueの提案 | satou-aaaaa/sandbox `docs/routines/weekly-issue-proposal.md` | 水曜 8:47 JST |
| 見回り（監督の巡回・面接の前後。カンバンへの集約は 2026-11-05 から休止） | このプロジェクトの共有フォルダ `board/patrol.md` | 毎日 8:07・20:07 JST |
| 見回りの届き先を新しいスレッドに替える | このプロジェクトの共有フォルダ `board/patrol-weekly-reset.md` | 月曜 7:47 JST |
| カンバンの頼みごとを片付ける | このプロジェクトの共有フォルダ `board/app-requests.md` | アプリでの答え・依頼のたび（ops-backup の app-inbox への push が合図）。GitHub の合図は Web の画面でしか付けられず、付くまでは見回り（8:07・20:07）が拾う（11/5 の1週間の振り返り：取りこぼし0） |
| 週1の開発レポート | このプロジェクトの共有フォルダ `dev-report/README.md` | 月曜 7:13 JST |
| claude.ai の中身の控え（全ルーティンの定義・自作スキル・satouさんのボード（カンバン）と、全プロジェクトの指示・メモリ・共有フォルダ） | satou-aaaaa/ops-backup（非公開）`README.md` | 毎日 9:17 JST（ルーティンの定義は日曜。ほかのプロジェクトは各プロジェクトが日曜に） |
| 週次の研究進捗まとめ（研究リポジトリ3つ） | プロンプト内（短い。カルカソンヌ プロジェクト） | 日曜 20:45 JST |
| 個人の作業（朝のタスク整理・転職・動画・連載など） | 各プロジェクトの共有フォルダかプロンプト内 | — |

カンバンの自動改善（`board/improve.md`、毎日 11:23）は 2026-11-05 に止めた（satou さん「カンバンは今は使っていない」）。戻すときは定期実行を有効にし、この表に行を戻す。

個人情報を扱う作業の手順は、公開リポジトリであるここには置かない（名前と置き場所も書かない）。
1回だけの確認（send_later の「〇〇の確認」）は表に載せない。

## Claude を使わずに CI で動くもの

| 作業 | 置き場所 | 実行 |
| --- | --- | --- |
| 週次まとめ Issue（開いた PR・CI 失敗・次にやること・再発防止の残った対策と繰り返し・ひな形からのずれ） | このリポジトリ `weekly-summary.yml`（ずれは `scripts/drift-check.mjs`） | 月曜の朝 |
| 控えの見張り（毎朝の書き出しが止まったら Issue。Claude が止まった合図） | satou-aaaaa/ops-backup（非公開）`watch.yml` | 毎日 12:23 JST |
| CI時間 Issue | このリポジトリ `ci-time-report.yml` | 木曜 05:29 JST |
| 成績表 Issue | このリポジトリ `scorecard.yml` | 月曜 04:07 JST（週次まとめと2時間ずらす） |
| 死活監視・Lighthouse・リンク切れ・ブランチ片付け・ラベル・CodeQL | 各リポジトリの `.github/workflows/`（中身はこのリポジトリの共通部品） | 毎日〜週1 |
| CI 失敗 Issue・自動マージ・更新情報・公開後の確認 | 同上 | PR・push のたび |
| 共通部品の試運転・権限の表の見張り | このリポジトリ `selftest.yml`・`permission-guard.yml` | PR のたび |
| カルカソンヌ自己対戦 | carcassonne-research `selfplay.yml` | 6時間ごと |
| 研究の重い計算（何百局の対戦・学習） | このリポジトリ `research-run.yml`（各研究リポジトリの同名の呼び出しから） | 研究の毎日の回が起こすとき |
| LAST TELL 自動対戦 | last-tell `playthrough.yml` | 毎日 3:00 JST |
| sandbox のバックアップ・法令の見張り・夜間検査・ミューテーション | sandbox `backup.yml`・`law-watch.yml`・`nightly.yml`・`weekly-mutation.yml` | 定期 |

## 人やエージェントが毎回同じ手順で行う作業（スキル・決まり）

| 作業 | 手順書 |
| --- | --- |
| PR を作る・CI を通す・コンフリクトを直す・マージする・公開を確かめる | [pr.md](pr.md)（共通スキル「PR の手順」もこれを読む）。リポジトリだけの決まりは各 `CLAUDE.md` と `.claude/skills/steward/`（今は carcassonne-research） |
| CI が赤のとき・CodeRabbit のレビュー | [common.md](common.md) の「CI が赤のとき」「CodeRabbit のレビュー」 |
| LAST TELL の更新（index.html の作り直し・公開） | last-tell `README.md`、スキル last-tell-release-check |
| tenbin の作り直し・論文問題の追加 | tenbin `CLAUDE.md`、スキル add-ronbun-questions |
| カンバン（local-kanban）を直す | local-kanban `AGENTS.md`（データ側の `local-board/kanban.html` もそろえる） |
| 単体HTMLアプリの画面点検 | スキル law-app-ui-check。数で見る部分は共通部品 `ui-check.yml`（PR のたび） |
| LAST TELL の演出の提案 | スキル last-tell-proposal-demo |
| 聞くか聞かないかの判断 | [autonomy.md](autonomy.md) |
| できないと分かっている操作の回り道（クラウドから開けないページは `fetch-page.yml`） | [known-limits.md](known-limits.md) |
| 定期の見回りを作る前に、イベントで受けられないか見る | [events.md](events.md) |
| 作業を並列に分ける・合わせる | [parallel.md](parallel.md) |
| Claude が使えないときの運転（週1の確認・ほかの AI で動かす） | [without-claude.md](without-claude.md)・[tool-map.md](tool-map.md)・`scripts/next-actions.mjs` |
| 各プロジェクトの進め方の見直し（分野のベストプラクティス） | [project-practices.md](project-practices.md)（土曜の見直しの F が1プロジェクトずつ） |
