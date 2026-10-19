# 道具の置き換え表（Claude 以外の AI・人が手順書を使うとき）

手順書は Claude の道具（claude.ai のプロジェクト・スレッド・ルーティン）を前提に書いてあるところがある。
Claude が使えないときや、ほかの AI（Codex・Gemini・Copilot など）や人が手順書を使うときは、左の道具を右に置き換える。
どれも GitHub だけで済み、お金はかからない（公開リポジトリの Actions と Issue）。

| 手順書に出てくる道具 | 何のためのものか | 置き換え先 |
| --- | --- | --- |
| `reply`（スレッドへの返信） | satou さんに結果を知らせる | shared-workflows の Issue「運用メモ」にコメントする（無ければラベル `運用メモ` で作る） |
| `ask_decision`（カード） | satou さんに選んでもらう | Issue を作り、ラベル `needs-decision` を付け、本文に選択肢をチェックボックス（`- [ ] 案A（おすすめ）`）で書く。satou さんが印を付けたら進める |
| 「satouさんにお願い：」 | satou さんにしかできないことを頼む | 上と同じ Issue（ラベル `needs-decision`）。題の先頭に「satouさんにお願い：」 |
| `update_status`（進み具合） | 今どこまで進んだかを見せる | 作業中の Issue か PR の本文のチェックリスト（`- [x]`）を書き換える |
| `send_message`（ほかのスレッドへの連絡） | 担当に頼む | 担当のリポジトリに Issue を作り、手順書の名前と頼みたいことを書く |
| ルーティン（`create_trigger`・`list_triggers`） | 決まった時刻に動かす | 決まった手順だけなら GitHub Actions の `schedule`。判断が要るものは、人かほかの AI が [catalog.md](catalog.md) の時刻に手で回す |
| `send_later`（あとで確かめる） | 忘れないようにする | Issue に期限を書いて作る（約束の台帳 `notes/todo.md` の代わり） |
| `/mnt/project-files/`（共有フォルダ） | スレッド間でファイルを共有する | 非公開リポジトリ satou-aaaaa/ops-backup の `projects/<名前>/files/`（毎日の控え）。共有の中身は個人情報を含むので、この非公開リポジトリにだけ置く（公開リポジトリのブランチには書かない） |
| プロジェクトメモリ | 前の回で分かったことを残す | 非公開リポジトリ satou-aaaaa/ops-backup の `projects/<名前>/memory/`。公開してよい決まりは common.md・autonomy.md にすでにある |
| `subscribe_pr_activity`（PR の見張り） | CI の結果やレビューに気づく | GitHub の通知（Watch）。CI 失敗は `ci-failure` Issue が自動で立つ |
| `list_project_prs`・`list_sessions` | 進んでいる作業を見る | `node scripts/next-actions.mjs`（全リポジトリの「次にやること」を出す）と、Issue「週次まとめ」 |
| Artifact（状況ページ・レポート） | まとめを見せる | Issue「週次まとめ」「成績表」「CI時間」（Actions が毎週作る） |
| スキル（pr-flow など） | 決まった手順の作業 | スキルの `SKILL.md` はただの Markdown なので、ほかの AI もそのまま手順書として読める。共通スキルの控えはこのリポジトリ（立ち上げ直しの手順と同じ場所）、リポジトリだけのものは各リポジトリの `.claude/skills/<名前>/SKILL.md` |
| GitHub の MCP（`mcp__github__*`） | PR・Issue を扱う | `gh` コマンド（`gh pr list`・`gh pr merge --squash` など）か GitHub の画面 |
| サブエージェント | 調べものを分ける | 使わない。1つずつ順に行う |

## ほかの AI に頼むときの1行

> satou-aaaaa/shared-workflows の `AGENTS.md`・`routines/common.md`・`routines/tool-map.md` を読み、続けて `routines/<名前>.md` の手順どおりに1回実行してください。Claude 専用の道具は tool-map.md の置き換え先を使ってください。分岐表に無いことが起きたら止めて、Issue（ラベル needs-decision）に状況を書いてください。

ほかの AI の動かし方は [without-claude.md](without-claude.md) の「ほかの AI で動かす」。
