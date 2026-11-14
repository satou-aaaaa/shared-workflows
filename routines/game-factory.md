# 新作ゲームを毎日1本ずつ進める（毎日 10:37 JST・毎回新しい会話）
<!-- style: v1 -->

先に `common.md` と `game-dev.md` の「A. 新しいゲームを作る」を読むこと（表・研究・手順の詳しい注意は `game-dev-detail.md`。要る節だけ読む）。（satou さん 2026-11-11「ゲームをどんどん作っていってほしい」）

## 目的

新作ゲームを、止まらずに一定の速さで作り続ける。同時に作るのは2本まで（`WIP_LIMIT`）。毎回まず作りかけを先に進め、空きがあるときだけ次の候補を始める。

## なぜこの形か（調べた要点と出典）

- 作りかけの数を絞るほど、1本が仕上がるまでの日数が短くなる（リトルの法則：仕上がるまでの日数 ＝ 作りかけの数 ÷ 1日に仕上がる数）。[Businessmap: Little's Law](https://businessmap.io/continuous-flow/littles-law)・[ProKanban: Don't just limit WIP](https://prokanban.org/blog/https-prokanban-org-blog-dont-just-limit-wip-optimize-it)
- 長く続く AI の作業は、1回に1つずつ進め、回の初めに進み具合の記録と検査を読んで続きから始めるのがよい。[Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- ひな形から作ったものは、あとからひな形の直しを取り込める形で始める。[Copier: Updating a project](https://copier.readthedocs.io/en/latest/updating/)
- 2026-11-07〜11 に十数本を並行で作ったとき、ひな形に取り残される・CodeQL で止まる・公開後に止まる・題材がかぶる・QA が同時に4本以上で落ちる、が続いた（`incidents/2026-11-07-new-game-old-template.md`・`2026-11-07-new-game-stopped-after-publish.md`・`2026-11-11-codeql-url-includes-in-qa.md`・`2026-11-07-topic-claim-overwritten.md`）。

## 使う道具

- `node scripts/game-wip.mjs`（作りかけと候補の列から、今日することを出す。`GH_TOKEN` が要る。読めないときは `gh api "repos/satou-aaaaa/shared-workflows/issues?state=open&per_page=100" --paginate` で「題材:」Issue を見て、同じ見方を手でする）
- `node scripts/new-game.mjs ../<名前>`（新作のフォルダを、いまのひな形から始める）
- `node scripts/sync-template.mjs`・`node scripts/drift-check.mjs`（game-dev.md A 手順5〜7）
- GitHub の道具（PR を作る・読む・マージ、Issue を書く）。報告はスレッドへの message_thread（ほかの AI は [tool-map.md](tool-map.md) の「スレッドへの返信」）

## 候補の列と作りかけの決まり

- 候補も作りかけも、shared-workflows の「題材: <日本語の題名>（<題材の言葉>）」Issue だけで持つ（担当の決まりは game-dev.md A 手順1）。
- 本文に `repo: <リポジトリ名>` の行が無い Issue は候補、ある Issue は作りかけ。始めるときに `repo:` の行を足す。候補の Issue がそのまま担当の Issue になる（game-dev.md A 手順1の Issue を新しく立てない）。
- 途中で止めてブランチだけ push したときは、本文に `branch: <ブランチ名>` の行を足す。次の回の `game-wip.mjs` が「そのブランチから続ける」と出す。
- ラベル needs-decision の付いた作りかけは止めているものとし、2本の数に入れない（`game-wip.mjs` が数えない）。
- 公開したら Issue に公開先を書いて completed で閉じる。やめたら not planned で閉じる。

## 手順

1. 節約モード（common.md）なら何もせず、update_status に1行書いて終える。
2. `cd shared-workflows` で shared-workflows のフォルダに入る（このあとのコマンドは全部ここで動かす）。
3. `git pull origin main` で手順書と道具を新しくする。
4. `node scripts/game-wip.mjs` を実行する。
5. 出た行を上から順に1行ずつ行う。作りかけの Issue を閉じたら（公開済み）、`node scripts/game-wip.mjs` をもう一度回し、出た行の続きを行う（空きができていれば、その回のうちに次の候補を始める）。1行は次の表のとおり。

   | 出た行 | すること |
   | --- | --- |
   | 「作りかけ … PR #N を進める」 | game-dev.md A 手順5〜7（pull → sync-template → drift-check → 赤い検査を直す → 緑ならマージ）。sw.js を含む PR は CodeRabbit のレビューを読んでから手でマージ |
   | 「作りかけ … ブランチ X を checkout して続ける」 | `git -C ../<名前> fetch origin X` と `git -C ../<名前> checkout X` をしてから、続きを作る。PR を出したら Issue の `branch:` の行を消す |
| 「作りかけ … needs-decision を付ける」 | 止まっている理由を Issue に書き、ラベル needs-decision を付ける。そのあと手順5のとおり `game-wip.mjs` を回し直す |
| 「止めている …」 | 何もしない（satou さんの答えを待つ） |
| 「作りかけ … PR #1 を作る」 | game-dev.md A 手順4〜6。始めは `node scripts/new-game.mjs ../<名前>` で、古いゲームから写さない |
   | 「作りかけ … リポジトリを作る」 | game-dev.md A 手順3（onboarding.md 手順0） |
   | 「作りかけ … 公開済み」 | Post-deploy check が緑か見る。緑なら game-dev.md A 手順8（一覧の PR）をし、Issue を completed で閉じ、報告する（手順6） |
   | 「空きあり … 候補 #N を始める」 | Issue #N の本文に `repo: <名前>` を足す。Issue #N を担当の Issue として、game-dev.md A 手順1の重なりの確かめ（表と小さい番号の Issue）だけを行い、手順3の `claim` に N を渡す。見本を選んでもらう手順2は省き、案は1つに決めて進める（2026-11-11 satou さん「どんどん作って」） |
   | 「空きなし」 | 新しい候補は始めない |
   | 「候補が N 本」 | 出典のある新案を「題材:」Issue で足す（game-dev.md A 手順1。プロジェクトのメモリ game-queue の残りの案から先に） |

6. 1つの行に30分以上かかり、まだ終わらないときは、そこまでを PR かブランチに push し、PR が無ければ Issue の本文に `branch: <ブランチ名>` の行を足して、次の回に回す。
7. マージして公開したゲームがあるときだけ、報告先のスレッドへ「公開：<題名> <URL>」を1行ずつ送る。無ければ報告しない。

## 迷ったとき

| もし | すること |
| --- | --- |
| PR が3日以上動いていない（`game-wip.mjs` が「needs-decision を付ける」と出す） | 手順5の表のとおり。数えるのはスクリプトで、回の数を覚えておかなくてよい |
| 遊び方・お金・外への通信を変える案になった | 作らない。satou さんにカードで1件だけ聞く（game-dev.md B 手順6の表と同じ） |
| どれにも当たらない | 止めて、Issue（ラベル needs-decision）に状況を書く |

## 完了条件

- `node scripts/game-wip.mjs` を回し直しても、することの行（作りかけ・空きあり・候補が N 本）が残っていないか、手順6で次の回に回した。
- needs-decision の無い作りかけは2本以下。

## やってはいけないこと

- 作りかけが2本あるのに、新しい候補を始める。
- 新作を古いゲームのフォルダから写して始める（ひな形の直しが届かない）。
- 検査を飛ばす・弱める・消して緑にする。
- 公開を確かめる前（Post-deploy check が緑になる前）に、公開したと報告する。
- 1回の中で、同じゲームを2つの PR で同時に直す。
