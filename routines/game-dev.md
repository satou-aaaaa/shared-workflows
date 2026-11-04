# ゲームを作る・磨く（新作は頼まれたとき／磨くのは週1・水曜 10:17 JST）
<!-- style: v1 -->

先に `common.md` と `autonomy.md` を読むこと。（satou さんの依頼 2026-11-04「それぞれのゲームを、さらにおもしろく」「やりこみ要素も」「ゲームとしてのおもしろさも」「ゲーム作成agentも良いですね」）

## 目的

satou さんのブラウザゲーム（GitHub Pages で公開・無料）を、企画から公開まで同じ形で作り、公開したあとも1本ずつおもしろくし続ける。

## satou さんの好み（変えない）

- 文字少なめ・一画面一問・ほどよい難しさ・見た目リッチ。説明なしで目的が分かる遊び。
- 時間制限・無理なお笑い・人狼の仕組み・クセを読む系は入れない（2026-10-31〜11-03 の感想）。頼まれない限り本物っぽさを優先する。
- ほかの作品の名前・キャラ・見た目・既存ゲームの再現は使わない。実在の会社名・ロゴもまねない。
- お金をかけない。外へ通信しない（外から読むのは Google Fonts の文字だけ）。記録は遊ぶ人のブラウザ（localStorage）だけ。名前・メールを聞かない。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクを、結果の画面に1行だけ（共有フォルダ `kofi/app-guide.md`）。有料版は置かない。

## 考え方（調べた要点と出典）

- まず遊びそのもの（手ごたえ・難しさの山・迷ったときの助け）を良くし、やりこみはその上に足す。やりこみだけ足しても、遊びが退屈なら続かない。
- 実績は「腕前」「集める」「続ける」を混ぜ、まだのものは条件と進み具合を見せる。運だけ・回数だけの実績は避ける。[Hamari & Eranti 2011, Framework for Designing and Evaluating Game Achievements（DiGRA）](https://dl.digra.org/index.php/dl/article/view/545)
- 1日1回のゲームは「1回で終わり」になりやすい。続けた日数は見せるが0のときは出さず、休んだ日を責めない（連続が義務になると疲れる）。[PeerPush: How we fixed a one-and-done problem on a daily puzzle game](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game)・[GameGrin: Do streaks and leaderboards still work?](https://www.gamegrin.com/articles/do-streaks-and-leaderboards-still-work)
- 遊んだ人の声は「何が困ったか」を集めるのに使い、直し方はこちらで考える（[game-feedback.md](game-feedback.md)）。

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
| QA | `qa/run.mjs`。乱数で作る所は何百日分も作って確かめる。押せる所は44px以上、幅320px | どのゲームも |

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
7. Pages を main のルートで公開し、Post-deploy check が緑か見る。
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
