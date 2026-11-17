# つまずき台帳（できないと分かっていること・回り道）

エージェントが同じ壁に何度もぶつからないための一覧。**試す前にここを見る。** 書いてある壁に当たったら、再実行を繰り返さず「回り道」に進む。
新しい壁に当たったら、同じ PR か次の PR でこの表に1行足す（再発防止の記録 `incidents/` を書くほどでない小さなものもここへ）。直ったら行を消す。
考え方: 原因と回り道が分かっている問題を1か所に集め、まずそこを引く（ITIL の Known Error Database。例: [KEDB のひな形](https://www.trupeer.ai/doc-template/kedb-template)）。

- 「確かめた日」が 30 日より古い行は、次に当たったときに今も同じか確かめて日付を直す（環境はよく変わる）。
- 個人情報が絡むもの（転職先のサイトなど）はここに書かない（公開リポジトリ）。
- サイトに拒まれた（401・403・429、robots.txt で不可）ときは、再試行・名乗り（User-Agent）の変更・別の経路での回り込みをしない。ここに1行足し、回り道（satou さんの PC で読む・公式の API や配布物を使う）に進む。

## ネットワーク・外のサイト

| 壁（症状） | 原因 | 回り道 | 確かめた日 |
| --- | --- | --- | --- |
| `laws.e-gov.go.jp` がクラウドのセッションからも GitHub Actions からも 403（「ただいまシステムメンテナンス中です」の画面） | e-Gov 側が海外のサーバー（クラウド・Actions）を拒んでいるとみられる。日本の家の回線からは同じ時刻に開けた。Actions からは 10/19 までは読めていた。10/22 は夜（2:14）も朝（9:30）も 403 で、時間帯では変わらない。許可ドメインに足しても直らない | satou さんの PC で読む（Remote Control のセッション、または PC のフォルダ＋device_bash）。sandbox の Law watch の e-Gov の行が「取得失敗」になるのはこのため（10/21 の回で 19 件）。`fetch-page.yml` は e-Gov を `DENIED_HOSTS` に入れて送らずに止める（拒まれたサイトを Actions から叩き直さない。`incidents/2026-11-03-fetch-page-egov-refused.md`） | 2026-10-22 |
| `docs.github.com` を WebFetch すると `ENOTFOUND` | クラウドの名前解決で引けない | WebSearch の要約で要点をとり、出典にその URL を書く。全文が要るときは `fetch-page.yml` | 2026-10-22 |
| `www.gsi.go.jp`（国土地理院）を Fetch page で読むと `UNSAFE_LEGACY_RENEGOTIATION_DISABLED` | サーバーが古い TLS の再ネゴシエーションしか話さず、OpenSSL 3 が断る。クラウドのセッションからはそもそも届かない | `fetch-page.yml` の `LEGACY_TLS_HOSTS` に挙げたサイトだけ許す。成果物はクラウドから落とせない（blob が 403）ので、全文が要るときは入力 `max_chars` を大きくしてログで読む。古い TLS で落ちるサイトが増えたら、そこに1行足す（証明書の検証などほかは弱めない） | 2026-11-07 |
| `*.github.io`（公開ページ）がクラウドから開けない | 同上 | 公開の確認は Post-deploy check と Site watch に任せる（`onboarding.md`） | 2026-10-18 |
| 許可ドメインを足したのに届かない | 環境の設定は、そのあとに始まったスレッドにだけ効く | 新しいスレッドで試す（コーディネーターに頼む） | 2026-10-21 |
| GitHub Actions の QA で `npx playwright install --with-deps` が `Temporary failure resolving 'archive.ubuntu.com'` で落ちる | GitHub の機械から Ubuntu の置き場が引けない一時的な障害（コードのせいではない） | 何も直さず、しばらくして Re-run。game-qa.yml は apt の .deb を取り置くので、main で一度通ったリポジトリは置き場に届かなくても入れられる（`incidents/2026-11-11-qa-apt-dns-outage.md`） | 2026-11-11 |
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
