# Claude が使えないときの運転マニュアル
<!-- style: v1 -->

## 目的

Claude（claude.ai のスレッドとルーティン）が急に使えなくなっても、公開中のアプリと CI を止めず、壊れたら気づけるようにする。
戻ってきたら、止まっていた作業をもとどおりに再開する。

## 使う道具

- GitHub の画面か `gh` コマンド（Issue・PR・Actions）
- ほかの AI（使えるときだけ。下の「ほかの AI で動かす」）
- [tool-map.md](tool-map.md)（Claude 専用の道具の置き換え表）
- `node scripts/next-actions.mjs`（全リポジトリの「次にやること」を出す。Node.js 20 以上。`GH_TOKEN` があれば使う）

## 手順

### A. 使えなくなったと気づいたら（1回だけ）

1. shared-workflows に Issue「Claude 停止中（YYYY-MM-DD から）」を作る。ここに気づいたこと・やったことを書いていく。
2. 下の「止まるものと続くもの」の表を見て、止まるものを確かめる。
3. お金のかかる代わり（有料プラン・有料 API）は使わない（common.md「お金と利用枠」）。
4. satou さんのボード（カンバン）は止まる。代わりに **ローカル版ボード**（PC・スマホにインストールしたカンバン https://satou-aaaaa.github.io/local-kanban/ 。データは satou-aaaaa/ops-backup（非公開）の `local-board/cards.json`）で TODO・答える確認を続ける。手順は ops-backup の `local-board/README.md`、ほかの AI に直させるときは `local-board/AGENTS.md` を読ませる。ローカル版が使えないときは `board/BOARD.md` を読み、答えや新しい TODO は ops-backup の Issue「Claude 停止中（YYYY-MM-DD から）」に書く（個人のことが入るので、公開リポジトリの Issue には書かない）。

### B. 週1回（satou さんが15分、またはほかの AI）

1. `node scripts/next-actions.mjs` を実行する（GitHub にログインした `gh` があれば `GH_TOKEN=$(gh auth token) node scripts/next-actions.mjs`）。
2. 出た行を上から順に、次の分岐表で対応する。

   | 出た行 | すること |
   | --- | --- |
   | 自動マージ停止 | そのリポジトリでは新しい機能をマージしない。直す PR だけ |
   | CI 失敗（main） | Issue を開き、失敗したワークフローのログを見る。直せなければそのままにする（公開中の版は自動の差し戻しで守られる） |
   | PR の CI が赤 | 直せるなら直す。直せなければ PR を下書きに戻す |
   | 3日以上止まっている PR | CI が緑なら squash マージ、要らなければ閉じる |
   | needs-decision | 読んで選ぶ |
   | 何もない | 何もしない |

3. 公開ページを1回ずつ開いて、動くか見る（死活監視が毎日見ているので、見られない週は飛ばしてよい）。
4. shared-workflows の Issue「Claude 停止中」に「YYYY-MM-DD 確認、対応 N 件」と1行書く。

### C. 戻ってきたら

1. shared-workflows と ops-backup の Issue「Claude 停止中」を Claude のスレッドに渡し、止まっていたあいだに起きたことを読ませる。
2. ルーティンが全部有効か `list_triggers` で確かめる（無効になっていたら有効に戻す。消えていたら satou-aaaaa/ops-backup の README「作り直し」で戻す）。
3. 止まっていたあいだの約束（Issue に期限を書いたもの）と、ops-backup の Issue に書いた確認の答え・TODO を、まず共有フォルダの `notes/todo.md` に戻す（todo.md が正）。ボードへは手で足さず、いつもの同期（ボードを受け持つスレッドか監督の巡回）に任せる。
4. shared-workflows と ops-backup の Issue「Claude 停止中」を閉じる。

## 止まるものと続くもの

| 種類 | 例 | Claude が止まると |
| --- | --- | --- |
| CI の共通部品（GitHub Actions） | CI 失敗 Issue・死活監視・Lighthouse・リンク切れ・秘密の混入検査・自動マージ・公開後の確認と自動の差し戻し・成績表・週次まとめ・CI時間・ブランチ片付け | **続く**（Claude を使わない） |
| リポジトリ独自の CI | カルカソンヌ自己対戦・LAST TELL 自動対戦・sandbox のバックアップや法令の見張り | **続く** |
| sandbox の agent-cycle・agent-on-ready（Actions の中で Claude を使う） | Issue の自動処理 | 止まる（ほかに影響しない） |
| CodeRabbit のレビュー | PR へのレビュー | **続く**（CodeRabbit の GitHub アプリ） |
| 判断が要るルーティン | 監督・巡回・見直し・CI の時間短縮・ダンジョン issue・sandbox の Issue 対応 | 止まる。B の週1の確認で代える。ほかの AI で手順書を回してもよい |
| satou さんのボード（カンバン。claude.ai の Artifact） | TODO・依頼・答える確認・todo.md との同期・2時間おきの見回り | 止まる。ローカル版ボード（local-kanban の PWA。データは ops-backup の `local-board/`）で続け、戻ったら取り込む（`local-board/README.md`）。最後の写しは `board/BOARD.md`（毎日書き出し）。作り直し方はそこの README「作り直し」 |
| 個人の作業のルーティン | 朝のタスク整理・転職・連載・動画など | 止まる。プロンプトの全文は satou-aaaaa/ops-backup（非公開）の `routines/triggers.json` にある。ほかの AI に渡せば動かせるものもある |

## ほかの AI で動かす

どの AI にも、[tool-map.md](tool-map.md) の「ほかの AI に頼むときの1行」を渡す。各 AI はリポジトリの `AGENTS.md` を自動で読む（Gemini CLI は `.gemini/settings.json` で AGENTS.md を読むように設定してある）。

| AI | 使い方の入口 | 注意 |
| --- | --- | --- |
| CodeRabbit（GitHub アプリ） | PR に自動でレビューが付く | 公開リポジトリは Open source プランで無料（[プラン表](https://docs.coderabbit.ai/management/plans)） |
| Gemini Code Assist（GitHub アプリ） | PR に自動でレビューが付く | 個人向けの無料版は 2026-07-17 に終了していて、今は反応しない（[Google の案内](https://developers.google.com/gemini-code-assist/docs/deprecations/consumer-code-review)） |
| Gemini CLI / Antigravity CLI | 手元でリポジトリを開いて動かす | 無料枠の条件が 2026-06 に変わった。使う前に公式の料金ページで、今も無料か確かめる |
| OpenAI Codex | 手元か ChatGPT から | 無料で使えるかはその時点の公式ページで確かめる |
| GitHub Copilot のコーディングエージェント | Issue に割り当てる | 無料プランで使えるか、その時点の公式ページで確かめる |

お金がかかるなら使わない。どれも使えないときは B を人が行う。

## 完了条件

- A: Issue「Claude 停止中」がある。
- B: その週の行が Issue に1行ある。`next-actions.mjs` の出力で、自動マージ停止と main の CI 失敗に手が打たれている（直した・待つと決めた）。
- C: ルーティンが全部有効で、Issue「Claude 停止中」が閉じている。

## やってはいけないこと

- お金のかかる代わり（有料プラン・有料 API・超過利用）を使う。
- テストを外す・弱めて CI を通す。
- 公開済みのものを消す、リポジトリの公開範囲を変える。
- 分岐表に無いことを推測で進める（止めて Issue に書く）。

## 調べた要点と出典

- AGENTS.md は Codex・Gemini・Copilot・Cursor などが読む共通の指示ファイル。2025-12 に Linux Foundation（Agentic AI Foundation）に寄贈された。[OpenAI](https://openai.com/blog/agentic-ai-foundation)・[GitHub Changelog](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions)・[Gemini CLI](https://geminicli.com/docs/cli/gemini-md/)
- 無料枠は変わりやすい（Gemini CLI は 2026-06-18 に無料の個人向けの扱いが変わった）。[Gemini CLI: Quotas and pricing](https://geminicli.com/docs/resources/quota-and-pricing/)・[cubic](https://www.cubic.dev/blog/gemini-cli-vs-claude-code)
- 手順書は訓練で回して直す。[OneUptime: Game Day](https://oneuptime.com/blog/post/2026-08-06-on-call-runbook-game-day-validation/markdown)
