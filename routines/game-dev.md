# ゲームを作る・磨く（新作は毎日 10:37 JST の game-factory.md から／磨くのは週1・水曜 10:17 JST）
<!-- style: v1 -->

先に `common.md` と `autonomy.md` を読むこと。（satou さんの依頼 2026-11-04「それぞれのゲームを、さらにおもしろく」「やりこみ要素も」「ゲームとしてのおもしろさも」「ゲーム作成agentも良いですね」）

この手順書は要点だけ。表・研究の出典・手順の詳しい注意は [game-dev-detail.md](game-dev-detail.md) の同じ見出しにある（その作業をするときだけ読む）。

## 目的

satou さんのブラウザゲーム（GitHub Pages で公開・無料）を、企画から公開まで同じ形で作り、公開したあとも1本ずつおもしろくし続ける。

## satou さんの好み（変えない）

- 文字少なめ・一画面一問・ほどよい難しさ・見た目リッチ。説明なしで目的が分かる遊び。
- 時間制限・無理なお笑い・人狼の仕組み・クセを読む系は入れない（2026-10-31〜11-03 の感想）。頼まれない限り本物っぽさを優先する。
- 漢字・言葉を答えるゲームは、選択肢でなく入力して答える形にする（satou さん 2026-11-04）。変換中の Enter で送らない（`e.isComposing || e.keyCode === 229`）・`normalize("NFKC")` と空白のゆれを許す・かなだけはまちがいに数えない・別解も正解。候補から選ぶのはヒントの最後の段だけ（[Chrome: IME セーフな Enter 送信](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/ime-safe-enter-submit?hl=ja)）。
- ほかの作品の名前・キャラ・見た目・既存ゲームの再現は使わない。実在の会社名・ロゴもまねない。
- お金をかけない。外へ通信しない（外から読むのは Google Fonts の文字だけ）。記録は遊ぶ人のブラウザ（localStorage）だけ。名前・メールを聞かない。
- 応援は Ko-fi（<https://ko-fi.com/satouaaaaa>）へのただのリンクを、結果の画面に1行だけ（共有フォルダ `kofi/app-guide.md`）。有料版は置かない。

## 考え方（調べた要点と出典）

- まず遊びそのもの（手ごたえ・難しさの山・迷ったときの助け）を良くし、やりこみはその上に足す。やりこみだけ足しても、遊びが退屈なら続かない。
- 遊んだ人の声は「何が困ったか」を集めるのに使い、直し方はこちらで考える（[game-feedback.md](game-feedback.md)）。
### 研究の要点（ゲーミフィケーションの論文。satou さん 2026-11-05「論文も広く参照して」）

決まり 1〜13（できた感と自分で選べる感を大事に・ごほうびでつらない・他人と比べない・連続は途切れても責めない など）。表と出典は [game-dev-detail.md](game-dev-detail.md)。

### 勉強になるゲームの要点（教育ゲームの論文。satou さん 2026-11-05「勉強になるようなゲームをたくさん」）

決まり 14〜19（中身そのものを遊びに・思い出して答える・間をあけてくり返す）。中身は一次資料で確かめ、出どころを書く。

### 1問を深くする（ゲームデザインの要点。satou さん 2026-11-11「各ゲームがシンプルすぎる。もう少し複雑にしたほうが面白いかも」）

決まり 20〜27：文字を増やさず1問の中の判断を増やす。共通の部品は `template/depth.js`（自信をかける・復習）。ゲームごとに2段の判断・ひねりの1問・挑戦条件のどれかを足す。

## 共通の形（どのゲームもこれにそろえる）

今日のお題・上級と練習・帳・実績・カレンダー・取りこぼした日・感想・深さ・PWA と OGP・見やすさ・引き継ぎ・遊び方・ホームの題・記録の保存・ヒント・星・好きなだけ・QA の表。中身と見本は [game-dev-detail.md](game-dev-detail.md)（全部の行を照らす）。

## 好きなだけ遊べるように（寄付で成り立たせる。satou さん 2026-11-06）

F1〜F7：遊ぶ量を縛らない（チケット・ライフなし）・遊ぶ前の鍵なし・今日のお題と上級は1日1回で選び方を変えない・登録を聞かない・応援は結果に1行・問題は300種類以上で1回の中で重ねない。表と検査は [game-dev-detail.md](game-dev-detail.md)。

## だれでも遊べるように（色覚・ディスレクシア・弱視・キーボード・動き・ジェンダー。satou さん 2026-11-05）

共通の部品（`template/a11y/a11y.html`・`template/qa/a11y.mjs`）を写し、A1〜A12（色だけで分けない・コントラスト 4.5:1・キーボードで遊べる・性別を決めつけない・やさしい日本語 など）を守る。表と出典は [game-dev-detail.md](game-dev-detail.md)。

## 引き継ぎコード（別の端末へ記録を移す。satou さん 2026-11-05）

`template/transfer.js` と `template/qa/transfer-check.mjs` を写す（ゲームでは直さない）。取り込みは確認の画面を出し、コードは他人から届くものとして扱う。守ることの表は [game-dev-detail.md](game-dev-detail.md)。

## トークンを節約する（satou さん 2026-11-07「トークンを節約するための改善も」）

`index.html`・`preview.html` は丸ごと読まず grep と `sed -n` で要る所だけ。QA は `node qa/run.mjs 2>&1 | grep -v '^✓' | tail -40`。手順書も要る節だけ読む。全文は [game-dev-detail.md](game-dev-detail.md)。

## 使う道具

- GitHub の道具（PR を作る・読む・マージ）。検索は `gh api -X GET search/...`。
- Playwright（クラウドに入っている Chromium。`playwright install` はしない）で、幅320px・390px の画面を撮って自分で見る。
- 報告は元のスレッドへの message_thread（ほかの AI は [tool-map.md](tool-map.md) の「スレッドへの返信」）。
- 並列にするときは [parallel.md](parallel.md)（同時に3つまで・1つのエージェントは1つのリポジトリ）。

## 手順

### A. 新しいゲームを作る（satou さんに頼まれたとき）

手順ごとの理由・過去の事故・細かな確かめ方は [game-dev-detail.md](game-dev-detail.md)「A. 新しいゲームを作る：手順ごとの詳しい注意」。止まったとき・初めての手順のときはそこを読む。

1. 案を3つ出し、「好み」に当てはまるか表で確かめる。題材がもう無いかを [project-practices.md](project-practices.md) のゲームの表で**日本語の題材**で探す（ローマ字で探さない。表にあれば作らない）。
   題材を決めたら shared-workflows に Issue「題材: <日本語の題名>（<題材の言葉>）」を立てる。同じ題材の言葉の「題材:」Issue（not planned を除く）のうち**番号のいちばん小さいものが担当**。一覧（`gh api "repos/satou-aaaaa/shared-workflows/issues?state=all&per_page=100" --paginate`。検索は使わない）で自分より小さい番号があれば、自分の Issue を not planned で閉じて作らない。公開したら公開先を書いて completed、やめたら not planned で閉じる。
2. 動く見本（単体の HTML）を Artifact で出し、satou さんに選んでもらう（カード）。
3. リポジトリは [onboarding.md](onboarding.md) 手順0で AI が作る（A：Actions「Create repo」を、担当の Issue 番号 `claim` と題材の言葉 `topic` を付けて起こす。先の担当・公開済みの表にあれば止まる。だめなら B：Chrome。そのときはこのスレッドに satou さんの一言を頼む）。リンクを渡すのは両方使えないときだけ。
4. はじめの commit は README だけ。workflows・`qa/`・本体は同じ PR #1 で入れる（incidents/2026-11-04-new-repo-main-qa-without-qa-dir.md）。PR #1 の中身は `node scripts/new-game.mjs ../<名前>` で、いまのひな形から始める（古いゲームのフォルダから写さない。出た「このあと書くもの」の順に書く）。
5. 上の「共通の形」と「だれでも遊べるように」を全部入れる。AGENTS.md は既存のゲーム（kippu-10 など）を写して直す。写したときは写し元ごとの言葉を `qa/run.mjs` に登録し、残っていれば落とす。
   `.github/workflows/` は `template/.github/workflows/` から写す（QA は `template/.github/workflows/qa.yml`、検査の名前 `qa / qa` を必須チェックと `require_checks` に書く）。PR #1 を出す前に `LOCAL_ROOT=<clone の親> REPOS=<リポジトリ> node scripts/drift-check.mjs` を回し、出た行を直す。PR #1 が1日以上止まったあとでマージするときは、shared-workflows を `git pull origin main` → `node scripts/sync-template.mjs <ゲームのフォルダ>` → drift-check をやり直す。
   shared-workflows を `git pull` してから `node scripts/sync-template.mjs --check ../<ゲーム>` を回し、ちがえば `node scripts/sync-template.mjs ../<ゲーム>` で写す。
   CodeRabbit がひな形の写しに指摘したら、ゲームでは直さず、その日のうちに shared-workflows でひな形を直す PR を出して全部のゲームへ配る（ゲームの PR は待たずに進めてよい）。
6. `node qa/run.mjs` が全部通ってから PR。記録のキー（localStorage）は `<短い名>-v1` のように短くし、`gh api -X GET search/code -f q='"<キー>" user:satou-aaaaa'` と各ゲームの `data-keys` の `*` で終わる名前（前方一致）とも重ならないことを確かめる（探せなかったら先へ進まない）。決めたキーは「題材:」Issue に書き、開いている「題材:」Issue のキーとも比べる。Secret scan がキーを鍵と読み違えたら、キーを短く替えて確かめ直す（古いコミットの分は [game-dev-detail.md](game-dev-detail.md)）。`sw.js` を含む PR は `@coderabbitai review` とコメントし、レビューを読んでから手でマージする。
   - 印刷用の紙（`print.html` など、A4 の `.page`）を持つゲームは、QA で「はみ出さない」だけでなく「下に 5mm 以上の空きがある」も見る。字の形は手元と CI でちがい、手元でぎりぎり入っても CI ではみ出す（`incidents/2026-11-11-yarikuri-print-overflow-ci.md`）。
7. マージの直前にもう一度 `node scripts/sync-template.mjs --check ../<ゲーム>` を回す（ちがえば写して push し直す）。Pages を main のルートで公開する（[onboarding.md](onboarding.md) 手順5の1）。`node scripts/drift-check.mjs` に `pages` の行が出ないこと、Post-deploy check が緑になったことを見るまで、X などで紹介しない。
8. shared-workflows に PR を1つ出し、一覧に足す（[onboarding.md](onboarding.md) 手順3）。次の3か所に、どれも**名前の ABC 順の位置**に1行入れる（末尾に足さない）。
   - [repos.txt](../repos.txt) に `<名前> game`（ワークフロー・巡回・監督・週次まとめはここを読む。ほかのファイルに一覧を書かない）
   - [project-practices.md](project-practices.md) の「ゲーム」の表に1行
   - 中身に事実・出典があり、巡回で特に照らすことがあれば [repo-patrol.md](repo-patrol.md) の「ゲームで特に照らすこと」に1行（無ければ足さない）
   Lint（`node scripts/check-repo-lists.mjs`）が、並び・ゲームの表の抜け・ほかのファイルに書いた一覧を見る。
9. 公開を知らせたら、同じターンで次の候補（「題材:」Issue の候補の列の番号順。作りかけが2本あれば始めない：game-factory.md）の手順1に入る。satou さんの返事を待たない。レビュー待ちなどで止まるときは、再開の予約（send_later など。ほかの AI は [tool-map.md](tool-map.md)）を入れてからターンを終える。予約なしで終えない。

### B. 公開中のゲームを1本磨く（週1・水曜）

1. 節約モード（common.md）なら何もせず、update_status に1行書いて終える。
2. 下の一覧を1つずつ `git clone --depth 1 https://github.com/satou-aaaaa/<リポジトリ>` し、`git -C <リポジトリ> log -1 --format=%cs` で最後に直した日を見る。
3. いちばん日がたったゲームを1つ選ぶ。開いている PR があるゲームは飛ばす。
4. `bash scripts/setup.sh` と `node qa/run.mjs` を回し、スマホ幅で3回遊ぶ。
5. 「退屈・分かりにくい・手ごたえが薄い」所を3つ書き出す。
6. 下の表で直すものを1つ決める。

   | もし | すること |
   | --- | --- |
   | 「共通の形」に足りない部品がある | それを足す |
   | 手ごたえ・難しさ・迷ったときの助けに困りごとがある | いちばん効くものを1つ直す |
   | 上の「研究の要点」「勉強になるゲームの要点」の決まりに合っていない所がある | 番号を PR に書いて、1つ直す |
   | 遊び方を変える案（ルール・世界観・お金・外への通信） | 直さない。satou さんにカードで1件だけ聞く（質問の先頭に「satouさんにお願い：」） |
   | どれにも当たらない | 止めて、Issue（ラベル needs-decision）に状況を書く |

7. 直し、`qa/run.mjs` に検査を足す。そのリポジトリの AGENTS.md と [pr.md](pr.md) に従う。
8. PR 本文に「遊んで気づいたこと」「なぜそれを直したか」「調べた要点と出典」を書く。
9. CI が緑ならマージする（`sw.js`・`manifest.webmanifest` を変えたら CodeRabbit を待つ）。

## 一覧（磨く対象）

[repos.txt](../repos.txt) の種類が `game` の行（`node scripts/repos.mjs game` で出る）。新しく作ったら A の手順8で足す。

## 完了条件

- A：PR #1 がマージされ、Pages の Post-deploy check が緑。project-practices.md の表に1行ある。
- B：選んだゲームの PR が1つマージされたか、止まった理由が Issue かメモリに書いてある。

## 報告

- マージした PR があるときだけ、元のスレッドに1〜3行（どのゲームの・何を・PR のリンク）。
- 何も無ければ update_status を1行更新して no_reply_needed で終える。

## やってはいけないこと

- 今日のお題の作り方（種・乱数・データ）を、理由を PR に書かずに変える（過去の日の問題が変わる）。
- 記録（localStorage）の形を壊す・古い記録を消す。
- 検査を飛ばす・弱める・消して緑にする。
- 1回の実行で2本以上のゲームを直す（どれが壊したか分からなくなる）。
