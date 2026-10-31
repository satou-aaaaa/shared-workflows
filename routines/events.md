# 巡回より受信（イベントで動かす選び方）

「定期的に見に行く」仕組みを作る前に読む。見に行かなくても、起きたことが知らせとして届く形があれば、そちらを先に考える（`common.md` まず守ること 8「ほかのやり方も比べる」の、巡回の場合の早見表）。
きっかけ: 2026-10-21 カンバンのアプリ版の同期を定期の巡回だけで考え、satou さんに「イベントを受信する形もありませんか？」と聞かれた（`incidents/2026-10-21-alternatives-not-proposed.md`）。

## なぜ受信を先に考えるか

- 巡回は、何も起きていない回でも利用枠を使い、起きてから気づくまで最大で巡回の間隔だけ遅れる。
- 受信は、起きたときだけ動くので速く、空振りが無い。ただし知らせが落ちることがある（GitHub トリガーは上限を超えると捨てられる）ので、**受信を主にして、知らせに頼らず元の一覧を読む見回りを安全網に残す**。今ある安全網は、監督の巡回（`supervisor.md`。開いた PR・ci-failure Issue を API の一覧で読む。9:41 の回は全件を見る＝`common.md`「見回りは止まったものを見る」）と、月曜の週次まとめ Issue（`weekly-summary.yml`）。新しく受信を作るときは、表の「安全網」の列に、そのどれが拾うかを書く。表に無いものを受けるなら、一覧を読む見回りも一緒に作る。
- 出典: GitHub は、すぐ知りたいもの・数が多いものはイベント（Webhook）、たまにしか見ないもの・数が少ないものは API で見に行くのでよい、としている（[About webhooks](https://docs.github.com/en/webhooks/about-webhooks)）。受け取る側は、届かなかった知らせに備える（[Hookdeck: Webhook vs API Polling](https://hookdeck.com/webhooks/faq/webhook-vs-api-polling)）。

## 早見表（何が起きたら、何で受けるか）

| 起きること | 受け方 | 費用・条件 | 落ちたときの安全網 |
| --- | --- | --- | --- |
| 自分の PR のコメント・レビュー・CI の結果・マージ | スレッドで `subscribe_pr_activity`（PR を作ったら必ず） | 無料。届くのは1つのセッションだけ | 週次まとめ Issue・監督の巡回 |
| PR が開いた・ラベルが付いた・マージされた（だれの PR でも） | ルーティンの **GitHub トリガー**（Pull request / Release だけ。作者・ラベル・ブランチで絞れる） | 利用枠を使う。1時間あたりの上限を超えた知らせは捨てられる。設定は claude.ai の画面（★ satou さん、または Chrome で Claude） | 監督の巡回 |
| Issue・Issue コメント・CI の失敗・決まった時刻（PR 以外のイベント） | GitHub Actions で受ける。決まった処理だけなら Actions の中で済ませる（Claude は使わない） | 無料（公開リポジトリ） | CI failure issue |
| 上の Actions から Claude に判断を頼みたい | ルーティンの **API トリガー**（`/fire` に POST）を Actions から呼ぶ | 利用枠を使う。トークンを satou さんが1回作り、リポジトリのシークレットに置く（★ 本人）。研究プレビューで形が変わることがある。1ルーティン1時間30回まで | 監督の巡回 |
| ボードのカードが動いた・コメントが付いた | ボードの db の購読（開いている画面）、アプリ版は GitHub のイベント（local-kanban の同期の案） | 無料 | ボードの見回り（2時間ごと） |
| 決まった時刻にもう一度見る（1回だけ） | `send_later`（自分のスレッドを起こす） | 無料 | なし。大事な約束は `notes/todo.md` にも書く |
| 外のサイトの更新（法令・料金ページなど） | GitHub Actions の定期実行で差分をとり、変わったときだけ Issue（sandbox の Law watch の形） | 無料 | Issue が立たないこと自体を CI failure issue で見る |

★ は satou さん本人の操作が要るもの。シークレットを置く操作は `autonomy.md` で「satou さんに聞くこと」。

## 新しく作るときの手順

1. 上の表で「起きること」に当たる行を探す。
2. 当たる行があれば、その受け方で作る。巡回は、安全網として1日1回の全件の見回りだけ残す。
3. 当たる行が無いときだけ巡回で作り、PR 本文に「受信の形は〇〇だが、××なので外した」と1行書く。
4. 新しい受け方を見つけたら、この表に1行足す。

## 調べた要点と出典

- ルーティンは、時刻のほかに GitHub のイベント（PR・Release）と API の呼び出しでも起こせる。GitHub のイベントは1時間あたりの上限を超えると捨てられる。API の `/fire` に渡す文は「信用しない文」として渡る。[Claude Code Docs: Automate work with scheduled tasks](https://code.claude.com/docs/en/routines)
- 定期のチェックは、GitHub Actions・ルーティン・端末のどこで動かすかを、何に触る必要があるかで選ぶ。[Claude Code Docs: Common workflows（Run Claude on a schedule）](https://code.claude.com/docs/en/common-workflows)
