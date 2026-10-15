# routines/ — Claude ルーティンの手順書

ルーティンのプロンプトは次の1行だけにする（`<名前>` はこの表のファイル名）。

> satou-aaaaa/shared-workflows を `git clone --depth 1` し（あれば pull）、`routines/common.md` と `routines/<名前>.md` を読んで、その手順どおりに1回実行してください。読めない場合は何もせず、その旨だけ報告してください。

| ファイル | ルーティン | 実行 |
| --- | --- | --- |
| [common.md](common.md) | すべてのルーティンの共通のきまり | — |
| [supervisor.md](supervisor.md) | 監督エージェントの巡回 | 6時間ごと（:41） |
| [repo-patrol.md](repo-patrol.md) | 全リポジトリ・全プロジェクト巡回と改善提案 | 毎日 22:38 JST |
| [routine-review.md](routine-review.md) | ルーティンとスキルの定期見直し | 週1（土曜 9:53 JST） |
| [dungeon-issue.md](dungeon-issue.md) | ダンジョンボドゲ issue 自動対応 | 3時間ごと（:54） |

sandbox のルーティン（Issue/PR定期対応・運用エージェント・新規Issueの提案）の手順は satou-aaaaa/sandbox の `docs/routines/` にあり、共通のきまりはここの `common.md` を使う。
個人情報を扱うルーティン（転職・お礼メールなど）の手順は、公開リポジトリであるここには置かない。
