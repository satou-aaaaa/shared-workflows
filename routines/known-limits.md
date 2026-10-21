# つまずき台帳（できないと分かっていること・回り道）

エージェントが同じ壁に何度もぶつからないための一覧。**試す前にここを見る。** 書いてある壁に当たったら、再実行を繰り返さず「回り道」に進む。
新しい壁に当たったら、同じ PR か次の PR でこの表に1行足す（再発防止の記録 `incidents/` を書くほどでない小さなものもここへ）。直ったら行を消す。
考え方: 原因と回り道が分かっている問題を1か所に集め、まずそこを引く（ITIL の Known Error Database。例: [KEDB のひな形](https://www.trupeer.ai/doc-template/kedb-template)）。

- 「確かめた日」が 30 日より古い行は、次に当たったときに今も同じか確かめて日付を直す（環境はよく変わる）。
- 個人情報が絡むもの（転職先のサイトなど）はここに書かない（公開リポジトリ）。

## ネットワーク・外のサイト

| 壁（症状） | 原因 | 回り道 | 確かめた日 |
| --- | --- | --- | --- |
| `laws.e-gov.go.jp` がクラウドのセッションから 403 | e-Gov 側がクラウドの IP を拒む。許可ドメインに足しても直らない | GitHub Actions からは読める（sandbox の Law watch は取得失敗 0 件）。このリポジトリの `fetch-page.yml` を workflow_dispatch で起こし、ログか成果物で中身を読む。急ぎなら satou さんの PC のフォルダ（device_bash）で | 2026-10-21 |
| `docs.github.com` を WebFetch すると `ENOTFOUND` | クラウドの名前解決で引けない | WebSearch の要約で要点をとり、出典にその URL を書く。全文が要るときは `fetch-page.yml` | 2026-10-22 |
| `*.github.io`（公開ページ）がクラウドから開けない | 同上 | 公開の確認は Post-deploy check と Site watch に任せる（`onboarding.md`） | 2026-10-18 |
| 許可ドメインを足したのに届かない | 環境の設定は、そのあとに始まったスレッドにだけ効く | 新しいスレッドで試す（コーディネーターに頼む） | 2026-10-21 |
| `playwright install` が失敗する・時間がかかる | クラウドにはブラウザが入っている | `CHROMIUM_PATH`（/opt/pw-browsers/chromium）を使う。各リポジトリの `scripts/setup.sh` が設定する | 2026-10-19 |

## GitHub

| 壁（症状） | 原因 | 回り道 | 確かめた日 |
| --- | --- | --- | --- |
| リポジトリを作れない（create_repository が 403） | Claude の GitHub アプリにその権限が無い | satou さんに作ってもらう（作り方を1行で頼む）。作ったあとは `onboarding.md` | 2026-10-15 |
| `GITHUB_TOKEN` の push・マージのあと、ほかのワークフローが動かない | GitHub の仕様（GITHUB_TOKEN が起こしたイベントはワークフローを起こさない） | 続きのワークフローを `gh workflow run` で起こす。`actions: write` が要る（`incidents/2026-10-21-automerge-dispatch-403.md`） | 2026-10-21 |
| `.github/` を変える PR を Auto merge がマージしない | `GITHUB_TOKEN` は workflows の権限を持てない | CI が緑なら担当のエージェントが GitHub の道具でマージする | 2026-10-16 |
| 自分が作った PR に自分をレビュアーに指名できない | GitHub の仕様 | 担当者（assignee）だけ付ける | 2026-10-18 |
| `git clone --depth 1` のあと push しても「push していない」と出る | 浅い clone では追跡ブランチが作られない | `git config --add remote.origin.fetch +refs/heads/<branch>:refs/remotes/origin/<branch>` → `git fetch` | 2026-10-18 |
| ファイルが `Permission denied`（exit 126）でワークフローから動かない | git に実行の印（100755）が無い | `git update-index --chmod=+x <file>`。sandbox は `test/workflowScripts.test.js` が見る | 2026-10-22 |

## claude.ai・Claude の道具

| 壁（症状） | 原因 | 回り道 | 確かめた日 |
| --- | --- | --- | --- |
| コーディネーター（プロジェクトのチャット）で ArtifactData が使えない | チャンネルのセッションには無い | ボードのカードはスレッドに直させる | 2026-10-18 |
| スレッドに紐づくルーティンのプロンプトを別のスレッドから直せない | そのスレッドのセッションからしか update_trigger できない（他からは時刻・名前・有効/無効だけ） | そのスレッドに頼む | 2026-10-14 |
| 無人の回で Artifact の type_url publish が止まる | 毎回確認のプロンプトが出る | 無人の回では使わない。Claude Docs のコネクタで直接作る | 2026-10-16 |
| カードで選んだ答えが PC（Remote Control）に届かない | PC 側は本人の言葉が要る | satou さんの「進めて」の一言をもらってそのまま渡す（`common.md`「対応漏れを防ぐ」） | 2026-10-16 |
| Chrome でフォームに入力・送信できない | 安全の仕組みが止める | 下書きに入れる中身を書き、satou さんが「📋 コピーして送り先を開く」で入れる | 2026-10-21 |
| メールを AI が送れない | 送るのは本人だけ（決まり） | 下書きを作り、ボードの「📋 コピーして Gmail で返信」→「✓ 送った」 | 2026-10-21 |
| ルーティンを1時間より短い間隔にできない | ルーティンの最短は1時間 | イベントで起こす（[events.md](events.md)） | 2026-10-22 |
| CodeRabbit のレビューが付かない | 無料枠は1時間に10回、同じ PR は5コミットまで自動 | push をまとめる。もう一度は PR に `@coderabbitai review` | 2026-10-18 |
| Gemini Code Assist のレビューが付かない | 個人向けの無料版は 2026-07-17 に終わった | CodeRabbit を使う | 2026-10-18 |
