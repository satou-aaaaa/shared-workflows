# ゲームを作る・磨く（新作は頼まれたとき／磨くのは週1・水曜 10:17 JST）
<!-- style: v1 -->

先に `common.md` と `autonomy.md` を読むこと。（satou さんの依頼 2026-11-04「それぞれのゲームを、さらにおもしろく」「やりこみ要素も」「ゲームとしてのおもしろさも」「ゲーム作成agentも良いですね」）

## 目的

satou さんのブラウザゲーム（GitHub Pages で公開・無料）を、企画から公開まで同じ形で作り、公開したあとも1本ずつおもしろくし続ける。

## satou さんの好み（変えない）

- 文字少なめ・一画面一問・ほどよい難しさ・見た目リッチ。説明なしで目的が分かる遊び。
- 時間制限・無理なお笑い・人狼の仕組み・クセを読む系は入れない（2026-10-31〜11-03 の感想）。頼まれない限り本物っぽさを優先する。
- 漢字・言葉を答えるゲームは、選択肢でなく入力して答える形にする（satou さん 2026-11-04）。変換中の Enter で送らない（`e.isComposing || e.keyCode === 229`）・`normalize("NFKC")` と空白のゆれを許す・かなだけはまちがいに数えない・別解も正解。候補から選ぶのはヒントの最後の段だけ（[Chrome: IME セーフな Enter 送信](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/ime-safe-enter-submit?hl=ja)）。
- ほかの作品の名前・キャラ・見た目・既存ゲームの再現は使わない。実在の会社名・ロゴもまねない。
- お金をかけない。外へ通信しない（外から読むのは Google Fonts の文字だけ）。記録は遊ぶ人のブラウザ（localStorage）だけ。名前・メールを聞かない。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクを、結果の画面に1行だけ（共有フォルダ `kofi/app-guide.md`）。有料版は置かない。

## 考え方（調べた要点と出典）

- まず遊びそのもの（手ごたえ・難しさの山・迷ったときの助け）を良くし、やりこみはその上に足す。やりこみだけ足しても、遊びが退屈なら続かない。
- 遊んだ人の声は「何が困ったか」を集めるのに使い、直し方はこちらで考える（[game-feedback.md](game-feedback.md)）。

### 研究の要点（ゲーミフィケーションの論文。satou さん 2026-11-05「論文も広く参照して」）

| # | 分かっていること | このゲームたちでの決まり | 出典 |
| --- | --- | --- | --- |
| 1 | ゲームの要素を足すと、学び・やる気・行動にそれぞれ小〜中くらいの良い効果がある。物語（フィクション）や、ほかの人との関わりがあると行動への効果が安定する | 世界観を一言でそえる（例：切符・お弁当・乗車記録）。要素は飾りでなく遊びの意味と結びつける | [Sailer & Homner 2020（メタ分析）](https://doi.org/10.1007/s10648-019-09498-w) |
| 2 | 効果は「どんな場面・どんな人か」で大きく変わる。足せば効くわけではない | 1回に1つずつ足し、何を良くしたいのかを PR に書く | [Hamari, Koivisto & Sarsa 2014（文献レビュー）](https://research.aalto.fi/fi/publications/does-gamification-work-a-literature-review-of-empirical-studies-o/)・[Koivisto & Hamari 2019](https://doi.org/10.1016/j.ijinfomgt.2018.10.013) |
| 3 | 物めずらしさの効果は時間とともに薄れる | 同じ実績を増やすより、週ごとに変わる目当て（今週のお題など）や新しい種類の問題で変化を出す | [Koivisto & Hamari 2019](https://doi.org/10.1016/j.ijinfomgt.2018.10.013) |
| 4 | ゲームの楽しさは「できた感（有能感）」「自分で選べる感（自律性）」「人とのつながり」で説明できる | 正解・まちがいのたびに理由が分かる知らせを出す。モード（今日・上級・練習）は自分で選べ、強制しない | [Ryan, Rigby & Przybylski 2006](https://doi.org/10.1007/s11031-006-9051-8) |
| 5 | 先に約束した「ごほうび」はやる気を下げることがある。ほめ言葉や「どれだけできたか」の知らせは下げない | 実績・★は「できたことの知らせ」として出す。Ko-fi やお金を、遊んだごほうびに結びつけない | [Deci, Koestner & Ryan 1999（メタ分析）](https://doi.org/10.1037/0033-2909.125.6.627) |
| 6 | 点数・レベル・ランキングは「量」を増やすが、内側からのやる気は増やさない | 点・回数だけの実績を増やさない。腕前（ヒントなし・一発）と集めることを混ぜる | [Mekler ほか 2017](https://doi.org/10.1016/j.chb.2015.08.048) |
| 7 | バッジ（実績）は、条件が見えると行動を増やす | まだの実績は条件と「いま/目標」を出す | [Hamari 2017（フィールド実験）](https://doi.org/10.1016/j.chb.2015.03.036) |
| 8 | 他人と比べるランキング・バッジを授業に入れたら、やる気・満足・成績が下がった | 全国ランキングは置かない。比べるのは自分のベストと、遊ぶ人が自分で選んだ挑戦状だけ | [Hanus & Fox 2015](https://doi.org/10.1016/j.compedu.2014.08.019) |
| 9 | ランキングは「目標」として働き、むずかしくても届く目標がいちばん効く | 目安（★3・メダル・最短の数）は「がんばれば届く」所に置く | [Landers, Bauer & Callan 2017](https://doi.org/10.1016/j.chb.2015.08.008) |
| 10 | 連続（ストリーク）はやる気を上げるが、途切れると、そのあと続ける人が大きく減る | 連続より合計の日数を主にする。途切れても責めず、取りこぼした日をあとから遊べるようにし、戻った人を迎える言葉を出す | [Silverman & Barasch 2023](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions) |
| 11 | 最初から少し進んだ状態で始まると、最後までやりとげる人が増える（与えられた進み） | はじめての1回で取れる実績を置き、進み具合のバーは0からでなく「もう1つ進んだ」所から見せる | [Nunes & Drèze 2006](https://doi.org/10.1086/500480) |
| 12 | ゴールに近いほど人はがんばる（ゴール勾配） | 結果の画面で「あと少しの実績」を1つだけ見せる（「あと1日で○○」） | [Kivetz, Urminsky & Zheng 2006](https://doi.org/10.1509/jmkr.43.1.39) |
| 13 | 実績は「腕前」「集める」「続ける」などを混ぜ、運だけ・回数だけのものは避ける | 実績は10〜14個で種類を混ぜる | [Hamari & Eranti 2011（DiGRA）](https://dl.digra.org/index.php/dl/article/view/545) |

- 1日1回のゲームは「1回で終わり」になりやすい（[PeerPush](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game)・[GameGrin](https://www.gamegrin.com/articles/do-streaks-and-leaderboards-still-work)）。上の 3・10・12 で手当てする。

## 共通の形（どのゲームもこれにそろえる）

| 部品 | 中身 | 見本 |
| --- | --- | --- |
| 今日のお題 | 日本時間の日付の種から作り、だれでも同じ。1日1回・途中で閉じても続きから | kippu-10 |
| 上級・練習 | 上級は今日のお題と重ねない。練習は記録を増やさない | kasane-zome |
| 帳・図鑑 | 遊んだお題が集まる | kippu-10 の切符帳 |
| 実績 | 10〜14個。記録から毎回数え、まだのものは「いま/目標」を出す | seiza-tsunagi #4・batsu-doko の `ACH` |
| カレンダー | 遊んだ日に★の印。連続日数は1以上のときだけ | seiza-tsunagi #4 |
| 取りこぼした日 | 過去7日のお題をあとから。連続・今日の記録・Ko-fi に数えない | wagamama-burger #5・seiza-tsunagi #4 |
| 感想 | Issue フォームへのただのリンク | [game-feedback.md](game-feedback.md) |
| PWA・OGP | `sw.js`・`manifest.webmanifest`・アイコン・`og.png`（答えを入れない） | どのゲームも |
| QA | `qa/run.mjs`。乱数で作る所は何百日分も作って確かめる。押せる所は44px以上、幅320px。キーボードで選んだボタンに枠が出る（`all:unset` で消えるので、枠の規則は style の最後に `:is(button,a):focus-visible{outline:…!important}`） | どのゲームも |

## 使う道具

- GitHub の道具（PR を作る・読む・マージ）。検索は `gh api -X GET search/...`。
- Playwright（クラウドに入っている Chromium。`playwright install` はしない）で、幅320px・390px の画面を撮って自分で見る。
- 報告は元のスレッドへの message_thread（ほかの AI は [tool-map.md](tool-map.md) の「スレッドへの返信」）。
- 並列にするときは [parallel.md](parallel.md)（同時に3つまで・1つのエージェントは1つのリポジトリ）。

## 手順

### A. 新しいゲームを作る（satou さんに頼まれたとき）

1. 案を3つ出す。どれも上の「好み」に当てはまるか表で確かめる。
2. 動く見本（単体の HTML）を Artifact で出し、satou さんに選んでもらう（カード）。
3. リポジトリは [onboarding.md](onboarding.md) の手順で作る（作れないときは satou さんに `https://github.com/new?name=<名前>&visibility=public` のリンクを渡す）。
4. はじめの commit は README だけ。workflows・`qa/`・本体は同じ PR #1 で入れる（incidents/2026-11-04-new-repo-main-qa-without-qa-dir.md）。
5. 上の「共通の形」を全部入れる。AGENTS.md は既存のゲーム（kippu-10 など）を写して直す。
6. `node qa/run.mjs` が全部通ってから PR。`sw.js` を含む PR は `@coderabbitai review` とコメントし、レビューを読んでから手でマージする。
7. Pages を main のルートで公開する（[onboarding.md](onboarding.md) 手順5の1）。`node scripts/drift-check.mjs` に `pages` の行が出ないこと、Actions の Post-deploy check が緑になったことを見るまで、X などで紹介しない（2026-11-04 3本が 404 のまま紹介された。incidents/2026-11-04-pages-never-enabled.md）。
8. 新しいリポジトリを [project-practices.md](project-practices.md) の表と README.md の一覧に足す。

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
   | 上の「研究の要点」の決まりに合っていない所がある | 番号を PR に書いて、1つ直す |
   | 遊び方を変える案（ルール・世界観・お金・外への通信） | 直さない。satou さんにカードで1件だけ聞く（質問の先頭に「satouさんにお願い：」） |
   | どれにも当たらない | 止めて、Issue（ラベル needs-decision）に状況を書く |

7. 直し、`qa/run.mjs` に検査を足す。そのリポジトリの AGENTS.md と [pr.md](pr.md) に従う。
8. PR 本文に「遊んで気づいたこと」「なぜそれを直したか」「調べた要点と出典」を書く。
9. CI が緑ならマージする（`sw.js`・`manifest.webmanifest` を変えたら CodeRabbit を待つ）。

## 一覧（磨く対象）

usotsuki-roppo・wagamama-burger・kabu-news・batsu-doko・kasane-zome・rosen-hitofude・seiza-tsunagi・mannaka-kanji・kippu-10・bento-zume・todofuken-relay・shiritori-saitan・madori-puzzle・tenkizu-yomi・bushu-tashizan（新しく作ったら足す）

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
