# routines/ — Claude ルーティンの手順書

ルーティンのプロンプトは次の1行だけにする（`<名前>` はこの表のファイル名）。

> satou-aaaaa/shared-workflows を `git clone --depth 1` し（あれば pull）、`routines/common.md` と `routines/<名前>.md` を読んで、その手順どおりに1回実行してください。読めない場合は何もせず、その旨だけ報告してください。

| ファイル | ルーティン | 実行 |
| --- | --- | --- |
| [common.md](common.md) | すべてのルーティンの共通のきまり | — |
| [autonomy.md](autonomy.md) | 任せる範囲の表（聞かずにやってよいこと・聞くこと・ブレーキ） | — |
| [STYLE.md](STYLE.md) | 手順書の書き方（どの AI でも人でも同じ結果になる形） | — |
| [tool-map.md](tool-map.md) | Claude 専用の道具の置き換え表（ほかの AI・人が手順書を使うとき） | — |
| [without-claude.md](without-claude.md) | Claude が使えないときの運転マニュアル（止まるもの・週1の確認・ほかの AI・戻ったとき） | 使えないとき |
| [pr.md](pr.md) | PR の手順（push 前・PR・CI・コンフリクト・マージ・公開の確認）。全リポジトリ共通 | — |
| [../bootstrap/](../bootstrap/README.md) | 全部を立ち上げ直す手順（ルーティンの定義・チェック機構・プロジェクト指示・メモリ・スキル） | — |
| [catalog.md](catalog.md) | 繰り返しの作業すべての一覧（ほかの場所にある手順書・CI・スキルも含む） | — |
| [agent-practices.md](agent-practices.md) | エージェント利用のベストプラクティスの台帳（取り入れたもの・出典・見直しの記録） | — |
| [project-practices.md](project-practices.md) | 各プロジェクトの進め方の台帳（分野ごとのベストプラクティス・各プロジェクトの状況・見直しの記録） | — |
| [supervisor.md](supervisor.md) | 監督エージェントの巡回 | 6時間ごと（:41） |
| [repo-patrol.md](repo-patrol.md) | 全リポジトリ・全プロジェクト巡回と改善提案 | 毎日 22:38 JST |
| [routine-review.md](routine-review.md) | ルーティンとスキルの定期見直し（エージェント利用のベストプラクティスの調べ直しと、各プロジェクトの進め方の見直しを含む） | 週1（土曜 9:53 JST） |
| [ci-speedup.md](ci-speedup.md) | CI の時間短縮（集計は CI time report が木曜 05:29 JST に Issue「CI時間」へ） | 週1（木曜 10:26 JST） |
| [onboarding.md](onboarding.md) | 新しいリポジトリ・プロジェクトの受け入れ（巡回の新規検出や satou さんの連絡から呼ぶ） | 増えたとき |
| [dungeon-issue.md](dungeon-issue.md) | ダンジョンボドゲ issue 自動対応 | 3時間ごと（:54） |
| [last-tell-backup.md](last-tell-backup.md) | LAST TELL ソースの控え（source-backup ブランチへ） | 週1（日曜 8:52 JST） |

sandbox のルーティン（Issue/PR定期対応・運用エージェント・新規Issueの提案）の手順は satou-aaaaa/sandbox の `docs/routines/` にあり、共通のきまりはここの `common.md` を使う。
個人情報を扱うルーティン（転職・お礼メールなど）の手順は、公開リポジトリであるここには置かない。
