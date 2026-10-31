# プロジェクトの進め方の見直し（分野ごとの台帳）

（satou さん 2026-10-18「各agentにも、プロジェクトの進め方のベストプラクティスを調査して、フローを定期的に見直すようにしてほしい」）

各リポジトリ・プロジェクトの担当が、自分の分野（ゲーム開発・学習アプリ・研究・業務ツール・執筆）での進め方のベストプラクティスと比べて、自分の作業の流れを見直すための台帳。
エージェント全般の使い方は [agent-practices.md](agent-practices.md) が受け持ち、ここでは扱わない（重複させない）。

- 見直しは土曜の見直し（[routine-review.md](routine-review.md) の F）が、1回に1プロジェクトずつ順番に行う。新しいルーティンは作らない。
- 担当は、自分のプロジェクトの作業の流れ（手順・検査・公開のしかた）を変える前に、この台帳の自分の行を読む。
- 個人情報を扱うプロジェクト（転職など）の台帳は、公開リポジトリであるここには置かない。そのプロジェクトの共有フォルダに同じ形で置く（名前もここに書かない）。
- kotlin-csv は他の人のものなので対象外。

## 分野ごとの要点

| 分野 | 要点 | 出典 |
| --- | --- | --- |
| ゲーム開発 | 遊んでほしい体験（体験目標）を先に言葉にし、変更はその目標に照らして確かめる | [Game Design Workshop 抜粋（Tracy Fullerton）](https://gamedeveloper.com/design/book-excerpt-game-design-workshop) |
| ゲーム開発 | 作る→遊んでもらう→目標と比べる→直す、の小さな周回を全工程で回す。核の遊びは作り込む前に確かめる | 同上 |
| ゲーム開発 | テスターの声はそのまま実装せず、困っている点（症状）を拾い、直し方は作る側が決める | [Playtesting best practices（Wayline）](https://www.wayline.io/blog/game-playtesting-best-practices-implementing-player-suggestions) |
| 学習アプリ | 効果が高いのは「思い出す練習（小テスト）」と「間隔をあけた復習」。読み返し・要約・線引きは効果が低い | [Dunlosky ら 2013 の報告（APS）](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html) |
| 学習アプリ | 内容の正しさは一次資料（条文・判例）で確かめ、出典を付ける | tenbin のスキル add-ronbun-questions（既に実施） |
| セキュリティ（防御の資料・道具） | 資料は一次の指針（NIST・IPA・OWASP など）を出典にし、調べた日を書いて定期的に古さを見直す。道具は防御用だけにし、秘密を作らない・混ぜない（push 前に検査） | [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)・[OWASP DevSecOps Guideline: Secrets Management](https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management) |
| 研究（ゲームAI） | 強くなったかは対戦数を決め打ちせず、逐次検定（SPRT）で「強い・変わらない」が決まるまで打つ。誤りの率を先に決める | [Fishtest FAQ（Stockfish）](https://github.com/official-stockfish/fishtest/wiki/Fishtest-faq)・[SPRT（Chess Programming Wiki）](https://chessprogramming.org/Sequential_Probability_Ratio_Test) |
| 研究（ゲームAI） | 学習の結果は複数のシードで回し、ばらつき（信頼区間）と再現のコマンドを必ず添える。条件をそろえた比較だけを比べる | [Deep Reinforcement Learning that Matters（Henderson ら）](https://arxiv.org/abs/1709.06560) |
| 業務ツール | 作る人が自分で使う（ドッグフーディング）。実際の案件の流れ（ダミーデータ）で端から端まで通して、詰まった所を次の作業にする | [Dogfooding（GitLab Handbook）](https://handbook.gitlab.com/handbook/product/product-processes/dogfooding-for-r-d) |
| 業務ツール | 小さく出して早く戻す。変更の量・失敗の率・直すまでの時間を見る | [DORA](https://dora.dev/) |
| 執筆（連載） | 決まった更新の間隔を守る。書きためか少なくとも筋書きを先に作り、間隔が空かないようにする | [What I Learned From 100+ Serials（Erica Drayton）](https://ericadrayton.substack.com/p/what-i-learned-from-70-serials-on) |
| 執筆（連載） | 読者が付いたら、反応（好き・嫌い）を次の話と直しの材料にする | 同上 |

## プロジェクトごとの状況

「今の流れの置き場所」は、その担当が毎回読む手順。「次に試すこと」は見直しで見つけた差で、F の回に取り入れるか判断する（取り入れたら「取り入れたこと」へ移す）。

| プロジェクト | 分野 | 今の流れの置き場所 | 取り入れたこと | 次に試すこと |
| --- | --- | --- | --- | --- |
| last-tell（LAST TELL） | ゲーム開発 | last-tell `CLAUDE.md`・`README.md`、スキル last-tell-release-check・last-tell-proposal-demo | 自動対戦（毎日）・画面の QA・テスターの報告欄（Issues） | 体験目標を短く書き、毎日の改善提案と自動対戦の結果をそれに照らす。テスターの声を「症状」で集計する |
| last-tell-godot（LAST TELL Godot 版） | ゲーム開発 | last-tell-godot `AGENTS.md`・`README.md` | qa.yml（Web 版との照合・画面・重さ、Linux と Windows） | Web 版と同じ結果になることを自動の照合で確かめてから入れる |
| naitei-no-michi（内定への道） | ゲーム開発（ノベル） | naitei-no-michi `CLAUDE.md` | 全エンディングに届くかの自動プレイ（QA） | 体験目標（どんな気持ちで終わってほしいか）を書く。遊んだ人の感想の受け口を作るか決める |
| dungeon-boardgame（ダンジョンボドゲ） | ゲーム開発（ボードゲーム） | [dungeon-issue.md](dungeon-issue.md) | satou さんの Issue に自動で対応 | 体験目標と、試遊のたびに見る点を書く |
| local-kanban（カンバン） | 業務ツール | local-kanban `AGENTS.md`・`README.md` | 見本データでの自動検査（QA）・satou さん自身が毎日使う | 実際の使い方（スマホでの追加・済み・確認への答え）で詰まった所を Issue にする |
| security-toolkit（防御の資料・道具。非公開） | セキュリティ（防御の資料・道具） | security-toolkit `AGENTS.md`・`README.md` | テスト付きの道具・手元の `sh run_tests.sh`（テストと gitleaks） | 資料の「調べた日」が古いものを見直す周期を決める |
| articles（公開記事） | 業務ツール | articles `AGENTS.md`・`README.md` | サイトの検査（QA：リンク・画像・フィード）・Site watch | 記事はメモアプリで直す。サイトの作り（tools/）だけを Issue にする |
| tenbin（天秤の書） | 学習アプリ | tenbin `CLAUDE.md`、スキル add-ronbun-questions・law-app-ui-check | 間隔反復の復習ドリル・一次資料での確認 | 問題を足すときに「思い出させる形（答える前に考えさせる）」になっているかを見る点に加える |
| carcassonne-research | 研究（ゲームAI） | carcassonne-research `CLAUDE.md`・`.claude/skills/steward/`・`docs/EXPERIMENTS.md` | シードを決めた先後入替の対戦・信頼区間・再現コマンド | 強さの判定に SPRT を使い、対戦数を減らしつつ誤りの率をそろえる |
| sandbox（許可申請ツール） | 業務ツール | sandbox `CLAUDE.md`・`docs/DEVELOPMENT_GUIDE.md`・`docs/routines/` | 小さな PR・多層の検査・運用エージェント | ダミー案件で端から端まで通す確認を定期の作業に入れ、詰まった所を Issue にする |
| 連載（カクヨム） | 執筆 | スキル kakuyomu-story-craft-guide・連載のプロジェクト | 予約切れのチェック | 書きためと筋書きの残りを見る点に加える。読者の反応（PV・コメント）を次の話の材料にする |

## 見直しの記録

| 日付 | プロジェクト | 見たもの | 変えたこと |
| --- | --- | --- | --- |
| 2026-10-18 | 全部（初回） | 上の出典 | この台帳を作り、土曜の見直しに F を追加 |
