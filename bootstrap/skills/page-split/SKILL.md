---
name: "page-split"
description: "ゲーム・アプリ・紹介ページ・Artifact など画面のあるページを作る・直すとき、1ページに全部を詰めず、目的ごとに # で画面を分ける（U10〜U12）。"
---

# ページを目的ごとに画面に分ける

AI が作るページが「全部を1ページに縦に積んで見づらい」のを防ぐ（2026-11-23 satou さん）。決まりの正は satou-aaaaa/shared-workflows の `routines/ui-rules.md`（U10〜U12「ページの分け方」）。ここはどのプロジェクトでも同じ形で作るための短い手順。

## 決まり（数）

| 番号 | 決まり | 根拠 |
| --- | --- | --- |
| U10 | 1つの画面に目的は1つ。見出し（h2）は1画面5つまで。ホームは「今日の〇〇」と入口だけ | NN/g Progressive Disclosure |
| U11 | 1つの画面の長さはスマホ（390×844）で画面3つ分まで | NN/g Content Dispersion・Accordions for Complex Content |
| U12 | ホームのほかの画面は5まで。畳む（details）のは1段まで。全部読む手順・答えは畳まない | Android Layouts and navigation patterns・Apple HIG Tab bars |

## 手順

1. 中身を目的で分ける（例：遊ぶ・記録・帳・このゲームについて／調べる・備える・地図）。目的が1つなら分けない（細切れにしない）。
2. 部品 `screens.js` を使う。画面の切り替えを自分で書かない。
   - リポジトリがあるとき：shared-workflows の `template/screens/screens.js` を写して `<script src="screens.js">` で読む（ゲームは game-core の `Core.screens` に同じ物が入っている）。
   - 1ファイルの Artifact など：同じファイルの中身を script タグの中に貼る。
3. `<section data-screen="home">` を最初に置き、ほかは `<section data-screen="kiroku" data-title="記録" hidden>` と並べる。入口は `<a href="#kiroku">記録</a>`（大きめのカード3〜5個）、各画面に `<a href="#">ホームへ</a>`。
4. フッター（見やすさ・感想・応援など共通の入口）は section の外に置き、どの画面にも出す。
5. 画面が替わったときの描き直しは `document.addEventListener("core:screen", (e) => …e.detail.id…)`。
6. 1つの画面の中で拾い読みされる所（出典・細かい説明・よくある質問）だけ `details` で畳む。

| 中身 | 使うもの |
| --- | --- |
| 目的のちがう中身が2つ以上 | 画面を分ける（data-screen） |
| 1画面の中の、長い並びの区分が2〜4 | 画面の中のタブ |
| 短い項目がたくさんで必要な所だけ読む | details（1段まで） |
| 上から順に全部読む1つの話 | 分けずに1画面（3画面分まで） |

## 確かめる

- リポジトリでは一番上で `node <shared-workflows>/scripts/ui-check.mjs --default`（PR では共通部品 `ui-check.yml`）。data-screen があれば # を順に開いて画面ごとに測り、U10〜U12 を超えたら落とす。前からあるペライチは ⚠ で知らせるだけ。
- リポジトリの無い Artifact は、スマホ幅（390px）で各画面を開き、見出しの数・画面の数・長さ（scrollHeight ÷ 画面の高さ）を数えて上の表と比べる。

## やってはいけないこと

- 目的のちがう中身を1つの画面に縦に積まない。
- 画面の切り替えを自分で書かない（戻る・フォーカス・題の扱いがばらばらになる）。
- 畳んだ中にさらに畳まない。全部読む中身を畳んで隠さない。
