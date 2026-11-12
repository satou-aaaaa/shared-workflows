# 研究を毎日1件ずつ進める（毎日 14:23 JST・毎回新しい会話）
<!-- style: v1 -->

先に `common.md` と `pr.md` を読むこと。（satou さん 2026-11-12「研究を継続して進める仕組みを整えてください」）

## 目的

ボードゲーム AI の研究リポジトリ（carcassonne-research・gem-merchant-research・isle-routes-research）の研究を、人が頼まなくても止まらずに進める。
1回に1リポジトリの1件だけを進め、結果（効かなかった結果も）を記録に残し、次にやることを一覧に足す。

## なぜこの形か（調べた要点と出典）

- 長く続く AI の作業は、回の初めに進み具合の記録（一覧と実験の記録）を読み、1回に1つずつ進めて記録を残すのがよい。[Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- 作りかけを絞るほど1件が早く仕上がる（リトルの法則）。だから作業中は各リポジトリ1件まで。[Businessmap: Little's Law](https://businessmap.io/continuous-flow/littles-law)
- 効かなかった実験も記録する（同じ実験の繰り返しと、効いた結果だけが残る偏りを防ぐ）。[Wikipedia: Publication bias](https://en.wikipedia.org/wiki/Publication_bias)
- 決まった計算は Claude でなく CI で回す（common.md「Claude が要らない作業は CI へ」）。重い対局は `research-run.yml`。

## 使う道具

- 各研究リポジトリの `docs/BACKLOG.md`（研究の「次にやること」一覧。書き方は一覧の先頭）・`docs/EXPERIMENTS.md`（実験の記録）・`AGENTS.md`（そのリポジトリの決まり）
- `node scripts/research-next.mjs`（今日の1件を選ぶ。shared-workflows のフォルダで動かす）
- 重い計算: 各研究リポジトリの `research-run.yml`（中身は shared-workflows の `.github/workflows/research-run.yml`）。起こすのは GitHub の道具の workflow の実行（Claude 以外は `gh workflow run research-run.yml -R satou-aaaaa/<名前> -f name=<名前> -f command=<コマンド>`）。結果はブランチ `research-results` の `runs/<名前>/`
- GitHub の道具（PR を作る・読む・マージ）
- 報告: 報告先スレッドへの message_thread（スレッドはルーティンのプロンプトに書いてある。Claude 以外は [tool-map.md](tool-map.md) の「スレッドへの返信」）
- プロジェクトメモリ（Claude 以外は tool-map.md の置き換え先）

## 手順

1. 節約モード（common.md）なら何もせず、update_status に1行書いて終える。
2. 3つの研究リポジトリを shared-workflows と同じ階層に `git clone --depth 1 https://github.com/satou-aaaaa/<名前>` する（あれば `git -C <名前> pull`）。作業場に無いリポジトリは add_repo（access push）で足す。
3. GitHub の道具で各リポジトリの開いた PR を見る。題か本文に `R-` の番号がある PR のうち、この回が作ったもの（ブランチが `research/` で始まる）でないものを「ほかの人が進めている項目」として控える。
4. `cd shared-workflows` で shared-workflows のフォルダに入り、`node scripts/research-next.mjs` を実行する。手順3の項目があれば `--skip <リポジトリ>:<R-番号>` を付ける。
5. 出た「今日:」の行の1件を、下の表のとおり進める（1回に1件だけ）。

   | 出た行 | すること |
   | --- | --- |
   | 「…を始める」 | 手順6から |
   | 「…を続ける」で「実行:」がある | `git -C <名前> fetch --depth 1 origin research-results` のあと `git -C <名前> show FETCH_HEAD:runs/<実行の名前>/status.txt` を見る。無ければ（まだ動いている）何もせず手順12へ。あれば結果を読んで手順8から |
   | 「…を続ける」で「PR:」がある | その PR を pr.md のとおり緑にしてマージする（手順10から） |
   | 「することなし」 | 各リポジトリの `docs/ROADMAP.md` と `docs/EXPERIMENTS.md` の「次」から、出典のある候補を1リポジトリ3件まで `docs/BACKLOG.md` に足す PR を出してマージし、終える |
   | 「書き方の誤り」「注意」 | 今日の PR の中で一覧を直す |

6. そのリポジトリの `AGENTS.md`・`docs/ROADMAP.md`・`docs/EXPERIMENTS.md` の関係する所と、プロジェクトメモリの関係するファイルを読む。同じ実験をしていないか確かめる。
7. main から `research/<r-番号>-<YYYYMMDD>` のブランチを切り、項目の「完了条件」を満たすまで作る・測る。
   コンテナで回す計算は合計60分まで。それを超える対局・学習は、計算のコード（結果を `$RESEARCH_OUT` に書く）と、一覧の項目を「状態: 作業中」「実行: <実行の名前>」にした変更を PR でマージしてから、`research-run.yml`（ref は main、実行の名前は `<r-番号>-<YYYYMMDD>`）を起こし、手順12へ。
8. 結果を `docs/EXPERIMENTS.md` に書く（そのリポジトリの書き方・並び順に合わせる。表・局数・95%区間・再現のコマンド）。効かなかった結果も書く。
9. `docs/BACKLOG.md` の項目を「状態: 済み」にし、「結果: PR #N、1行の結論」を書く。分かった次の候補は新しい番号で足す（1回3件まで、それぞれ「完了条件」つき）。
10. そのリポジトリの「push する前の確認」（`python scripts/check.py --quick`）を通し、PR を作る。題の頭に項目の番号（例「R-003 …」）を書く。
11. pr.md のとおり CI が緑になったら squash マージする。AI の強さを変えたときは、そのリポジトリの決まり（対戦ページ・学習ページの作り直し・UI の点検など）も同じ PR で行う。
12. プロジェクトメモリの、そのリポジトリの研究のファイルに1〜3行足す（マージ済みの事実と PR 番号だけ）。
13. 報告する（下の「迷ったとき」の表の報告の行）。

## 迷ったとき

| もし | すること |
| --- | --- |
| 項目を済みにした | 報告先へ「<リポジトリの日本語名> <R-番号>: <結論1行>（PR のリンク）」を1〜2行。数字を1つ入れる |
| 重い計算を起こしただけ・まだ動いている | 報告しない |
| 項目が大きすぎて1回で終わらない | 小さい項目（新しい番号）に分けて一覧を直し、最初の1つを進める |
| 実験は終わったが効果が無かった | 済みにする。結果に「効果なし（数字）」と書き、AI の設定は変えない |
| 重い計算が失敗した（終了コードが0でも124でもない） | `log.txt` を読んで1回だけ直して起こし直す。2回目も失敗したら「状態: 保留」にし、理由を「保留の理由:」に書いて報告する |
| 採るかどうかに satou さんの方針が要る（遊び方・名前・権利・公開の範囲・お金） | 作らずに「状態: 保留」にし、message_coordinator でカードを頼む（1件だけ） |
| テストが落ち、原因が分からない | 2回試してだめなら、ブランチを push して PR に状況を書き、「状態: 保留」にして報告する |
| 利用上限で止まった | 終わったところまで push し、一覧に「ブランチ:」を書いて終える。報告しない |
| どれにも当たらない | 止めて、そのリポジトリに Issue（ラベル needs-decision）で状況を書く |

## 完了条件

- 選んだ1件が、済み・作業中（重い計算を起こした）・保留のどれかになり、一覧（main の `docs/BACKLOG.md`）にそう書いてある。
- 済みにしたときは、`docs/EXPERIMENTS.md` に結果があり、PR がマージされている。
- 開いたまま残した PR が無い（「PR:」を一覧に書いたものを除く）。

## やってはいけないこと

- 1回に2件以上を進める。各リポジトリで作業中を2件以上にする。
- ほかの人が進めている項目（手順3）に手を出す。
- 対局数の少ない差（95%区間が基準をまたぐ）で、AI の設定や「最強」を変える。
- テストを飛ばす・弱める・消して緑にする。
- お金のかかる計算（有料の GPU・クラウド）を使う。
- GPL など取り込めないライセンスのコードを入れる・市販ゲームの名前や絵を使う（各リポジトリの AGENTS.md）。
- main に直接 push する。
