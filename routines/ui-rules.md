# 画面の決まり（UI/UX。ゲームもアプリも、画面を作る・直す・共通部品を足すたび）
<!-- style: v1 -->

（2026-11-23 satou さん「ホーム画面がごちゃごちゃになることがよくある」「共通の、UI/UX のルールもあったほうがよさそう」）

## 目的

どのゲーム・アプリでも、ホームを「いちばんやりたいことが一目で分かり、重ならず、同じ入口が二重に出ない」形にそろえる。
共通部品を足すたびにホームが散らかるのを、決まりと検査で止める。

## 使う道具

- 検査：`node <shared-workflows>/scripts/ui-check.mjs --default`（リポジトリの一番上で。ホームを 390×844 と 1366×768 で測る）。PR では共通部品 `ui-check.yml` が、毎日は `common-check.yml` が同じものを回す。
- 見やすさ・色・文字の検査：ゲームの `qa/a11y.mjs`（`template/qa/a11y.mjs` の写し）。
- 許すときの書き方：リポジトリの `qa/ui-check.json` の `"allow": [{ "rule": "home-max", "screen": "home@390", "reason": "…" }]`（rule は covered・dup・home-max・overflow・unnamed。理由の無い許しは置かない）。

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
| U9 | はじめての人に長い説明の窓を先に出さない。練習の1問とその場の吹き出しで教える | — | NN/g・Andersen ら CHI 2012（[game-dev-detail.md](game-dev-detail.md)「遊び方」） | drift-check `first:howto`・game-explore |

### ホームの並び（ゲーム）

上から次の順。新しい共通部品の入口は「6. フッター」に足し、1〜5 の段には足さない。

1. 題と1行の説明
2. 今日の〇〇（目立つ色の大きなボタン。1つだけ）
3. ほかの遊び方（上級・とことん・練習）
4. 帳・カレンダー・実績
5. 記録（遊んだ日・正解した数・続けた日）
6. フッター（遊び方・このゲームについて・見やすさ・引き継ぎ・感想を送る・Ko-fi で応援）

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
| それでも直せない・直すと遊びが壊れる | `qa/ui-check.json` の allow に理由つきで書き、PR 本文にも書く |
| どれにも当たらない | 止めて、shared-workflows に Issue（ラベル needs-decision）で状況を書く |

## 完了条件

- 手順1の検査が ✓（決まりを守っています）で終わる。
- 足した allow には理由が書いてある。

## やってはいけないこと

- 共通部品の入口を、ホームの上の段（2〜5）や浮いたボタンで足さない。
- 検査を通すためだけに allow を足さない（理由は「遊びの中身として要る」ものだけ）。
- ゲームの写しで見やすさの部品（a11y:begin〜end）を直さない。直すのはひな形（`template/a11y/a11y.html`）。

## 出典

- WCAG 2.2 Understanding SC 2.4.11 Focus Not Obscured (Minimum)：https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Apple Human Interface Guidelines, Buttons：https://developer.apple.com/design/human-interface-guidelines/buttons
- Nielsen Norman Group, Progressive Disclosure：https://www.nngroup.com/articles/progressive-disclosure/
- Material Design 3, Buttons：https://m3.material.io/components/buttons/guidelines
