# 画面の決まり（UI/UX。ゲームもアプリも、画面を作る・直す・共通部品を足すたび）
<!-- style: v1 -->

（2026-11-23 satou さん「ホーム画面がごちゃごちゃになることがよくある」「共通の、UI/UX のルールもあったほうがよさそう」。
U10〜U12 は同じ日の「AI が作るページはペライチが多く、情報をすべて同じページに入れようとするため、見づらい」）

## 目的

どのゲーム・アプリでも、ホームを「いちばんやりたいことが一目で分かり、重ならず、同じ入口が二重に出ない」形にそろえる。
共通部品を足すたびにホームが散らかるのを、決まりと検査で止める。

## 使う道具

- 検査：`node <shared-workflows>/scripts/ui-check.mjs --default`（リポジトリの一番上で。ホームを 390×844 と 1366×768 で測る）。PR では共通部品 `ui-check.yml` が、毎日は `common-check.yml` が同じものを回す。
- 見やすさ・色・文字の検査：ゲームの `qa/a11y.mjs`（`template/qa/a11y.mjs` の写し）。
- 画面の切り替え：単体の部品 `template/screens/screens.js`（どのリポジトリ・Artifact でも。`window.Screens`）。ゲームは game-core の `Core.screens`（`template/core/core.js`）に同じ中身がある（check-core が同じかを見る）。`<section data-screen="…">` を並べると、URL の `#` で1つだけ見せる。動きの検査は `scripts/check-screens.mjs`（Selftest）。
- 許すときの書き方：リポジトリの `qa/ui-check.json` の `"allow": [{ "rule": "home-max", "screen": "home@390", "reason": "…" }]`（rule は covered・dup・home-max・overflow・unnamed・page-h2・page-tall・page-nest・page-dest。理由の無い許しは置かない）。

## 決まり

| 番号 | 決まり | 数 | 根拠 | 検査 |
| --- | --- | --- | --- | --- |
| U1 | 浮いた部品（position: fixed・sticky のボタン・帯）で、押せる所を隠さない | 0 | WCAG 2.2 SC 2.4.11 Focus Not Obscured | ui-check（落とす） |
| U2 | 同じ働きの入口は1つの画面に1つ（見やすさ・引き継ぎ・感想・応援）。共通部品の入口はフッターにまとめる | 1つ | WCAG SC 3.2.4 Consistent Identification | ui-check（落とす）・qa/a11y.mjs |
| U3 | ホームで開いてすぐ見える押せる物は、スマホの幅で18まで。目立つ色の大きなボタンは「今日の〇〇」の1つだけ | 18 | Hick の法則・段階的に見せる（NN/g Progressive Disclosure）・Material Design 3 Buttons（強いボタンは1画面に1つ） | ui-check（落とす） |
| U4 | 横にはみ出さない（横スクロールを出さない） | 0 | WCAG SC 1.4.10 Reflow | ui-check（落とす） |
| U5 | 押す所は 44×44px 以上（文の中のリンクは除く） | 44px | Apple HIG Buttons（44×44pt）・Material（48×48dp）・WCAG SC 2.5.5／2.5.8（最低 24px） | ゲームの qa/run.mjs・ui-check（24px 未満を基準と比べる） |
| U6 | 本文の字は 16px 以上、12px 未満は使わない | 16px・12px | Apple HIG Typography（本文 17pt） | ui-check（基準と比べる） |
| U7 | 字と背景のコントラストは 4.5:1 以上。色だけで分けない | 4.5:1 | WCAG SC 1.4.3・1.4.1 | qa/a11y.mjs |
| U8 | 名前の無いボタンを置かない（記号だけなら aria-label） | 0 | WCAG SC 4.1.2 | ui-check・qa/a11y.mjs |
| U10 | 1つの画面に目的は1つ。目的が2つ以上（遊ぶ・記録・帳・調べる・備える など）なら画面を分け、ホームは入口と「今日の〇〇」だけにする。1つの画面の見出し（h2）は5つまで | 5 | NN/g Progressive Disclosure（最初は大事な数個だけ）・デジタル庁ウェブサイトの改善事例（件数に上限） | ui-check（分けたページは落とす・ペライチは ⚠） |
| U11 | 1つの画面の長さは、スマホの幅で画面3つ分まで。超えたら画面を分けるか、拾い読みの所（出典・細かい説明）だけ畳む | 3画面分 | NN/g Accordions for Complex Content・Content Dispersion | ui-check（同上） |
| U12 | 主な行き先（ホームのほかの画面）は5まで。畳む（details）のは1段まで。全部読む手順・答えは畳まない | 5・1段 | Android Layouts and navigation patterns（ナビは3〜5）・Apple HIG Tab bars・NN/g（2段を超えると迷う） | ui-check（同上） |
| U9 | はじめての人に長い説明の窓を先に出さない。練習の1問とその場の吹き出しで教える | — | NN/g・Andersen ら CHI 2012（[game-dev-detail.md](game-dev-detail.md)「遊び方」） | drift-check `first:howto`・game-explore |

### ページの分け方（U10〜U12。ゲームもアプリも紹介ページも）

1. 中身を「目的」で分ける（例：遊ぶ・記録・帳・このゲームについて／調べる・備える・地図）。目的が1つなら分けない（細切れにしない）。
2. 1つ目の `<section data-screen="home">` をホームにし、ほかは `<section data-screen="kiroku" data-title="記録" hidden>` のように並べる。画面を変えたときのゲームの描き直しは `document.addEventListener("core:screen", (e) => …e.detail.id…)`。
3. ホームの入口は `<a href="#kiroku">記録</a>`（大きめのカードの並び、3〜5個）。各画面に `<a href="#">ホームへ</a>` を置く。ブラウザの「戻る」でも戻れる。
4. フッター（共通部品の入口）は section の外に置き、どの画面にも出す。
5. 1つの画面の中で拾い読みされる所（出典・細かい説明・よくある質問）だけ `details` で畳む。手順・答え・遊びに要る説明は畳まない。
6. 画面を JS で描き替える前からのゲーム（`app.innerHTML = …`）は、data-screen に作り直さず、画面を描く関数の最初で `Core.screens.mark("dex")`（ホームは `mark("")`）、起動時に一度 `Core.screens.route({ dex: book, cal: () => cal(), ach: achView }, home)` を足す。スマホの「戻る」でゲームから出ずにホームへ戻る。
7. ゲーム以外（アプリ・紹介ページ・ほかのプロジェクト・Artifact）は `template/screens/screens.js` を写して読む（1ファイルの Artifact は中身を script タグに貼る）。claude.ai のほかのプロジェクトでは、スキル page-split（`bootstrap/skills/page-split/SKILL.md`）が同じ手順を持つ。

使い分け（NN/g Tabs vs. Accordions）：

| 中身 | 使うもの |
| --- | --- |
| 目的のちがう中身が2つ以上 | 画面を分ける（data-screen） |
| 同じ画面の中で、長い並びの区分が2〜4（例：今週・今月） | 画面の中のタブ（role="tablist"） |
| 短い項目がたくさんで、必要な所だけ読む | details で畳む（1段まで） |
| 上から順に全部読む1つの話 | 分けずに1画面（3画面分まで） |

### ホームの並び（ゲーム）

上から次の順。新しい共通部品の入口は「6. フッター」に足し、1〜5 の段には足さない。

1. 題と1行の説明
2. 今日の〇〇（目立つ色の大きなボタン。1つだけ）
3. ほかの遊び方（上級・とことん・練習）
4. 帳・カレンダー・実績
5. 記録（遊んだ日・正解した数・続けた日）
6. フッター（遊び方・このゲームについて・見やすさ・成績・引き継ぎ・感想を送る・Ko-fi で応援）。「成績」は共通部品 kiroku が見やすさの後ろに足す

## 手順

1. 画面を変えたら、リポジトリの一番上で `node <shared-workflows>/scripts/ui-check.mjs --default` を回す（設定ファイル `qa/ui-check.json` があればそれを渡す）。
2. ❌ の行を、下の表で直す。
3. 共通部品に入口（ボタン・リンク）を足すときは、ホームのフッターに置く形にし、全ゲームで手順1を回して ❌ が増えないことを確かめる。

| もし | すること |
| --- | --- |
| U1 固定の部品の下に隠れた押せる所 | 浮いた部品を消すか、隠れる側の画面に同じ入口を置いて浮いた部品を出さない（見やすさ v8 の形） |
| U2 同じ働きの入口が二重 | フッターの1つだけを残す |
| U3 ホームで押せる物が18を超える | 使う回数の少ないものを `details` に畳むか、別の画面（帳・設定）へ移す |
| U4 はみ出し | 幅の決まった部品に `max-width: 100%`・折り返し |
| U10・U11 見出しが多い・長い（⚠ ペライチ） | 「ページの分け方」で目的ごとに data-screen へ分ける。前からあるゲームは ⚠ のままでよいが、画面を大きく直すときに分ける |
| U12 畳みの入れ子・行き先が多い | 入れ子をやめて1段にする。行き先は似たものをまとめて5までにする |
| それでも直せない・直すと遊びが壊れる | `qa/ui-check.json` の allow に理由つきで書き、PR 本文にも書く |
| どれにも当たらない | 止めて、shared-workflows に Issue（ラベル needs-decision）で状況を書く |

## 完了条件

- 手順1の検査が ✓（決まりを守っています）で終わる。
- 足した allow には理由が書いてある。

## やってはいけないこと

- 共通部品の入口を、ホームの上の段（2〜5）や浮いたボタンで足さない。
- 新しく作るページで、目的のちがう中身を1つの画面に縦に積まない（U10）。画面の切り替えを自分で書かず `Core.screens` を使う。
- 畳んだ中にさらに畳まない。全部読む中身を畳んで隠さない（U12）。
- 検査を通すためだけに allow を足さない（理由は「遊びの中身として要る」ものだけ）。
- ゲームの写しで見やすさの部品（a11y:begin〜end）を直さない。直すのはひな形（`template/a11y/a11y.html`）。

## 出典

- WCAG 2.2 Understanding SC 2.4.11 Focus Not Obscured (Minimum)：https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Apple Human Interface Guidelines, Buttons：https://developer.apple.com/design/human-interface-guidelines/buttons
- Nielsen Norman Group, Progressive Disclosure：https://www.nngroup.com/articles/progressive-disclosure/
- Material Design 3, Buttons：https://m3.material.io/components/buttons/guidelines
- Nielsen Norman Group, Accordions for Complex Content：https://www.nngroup.com/articles/accordions-complex-content/
- Nielsen Norman Group, Content Dispersion：https://www.nngroup.com/articles/content-dispersion/
- Nielsen Norman Group, Tabs vs. Accordions：https://www.nngroup.com/videos/tabs-vs-accordions/
- Android Developers, Layouts and navigation patterns：https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- Apple Human Interface Guidelines, Tab bars：https://developer.apple.com/design/human-interface-guidelines/tab-bars
- GOV.UK Design Notes, One thing per page：https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- デジタル庁 利用者中心のアプローチ ガイドブック 事例3 デジタル庁ウェブサイト：https://www.digital.go.jp/resources/user-centered-approach-guidebook/case-study/digital-agency-website
