# 新しいゲームの main で、週1のリンク検査が「リンク0件」で落ちた

- 種類: 公開・CI
- 場所: kasane-zome の Link check（週1）
- 気づいた人: 全リポジトリ巡回
- 影響: kasane-zome で「CI失敗: Link check（main）」の Issue（#3）が開いた。リンク切れは無く、遊ぶ人への影響も無い。

## 起きたこと
- 2026-11-03 kasane-zome を作ったとき、main に README と `.github/workflows/` を置き、ゲームの本体（`index.html`）は PR #1 に分けた。
- 2026-11-04 10:37 JST、週1の Link check が main で動いた。main には `*.html` がまだ無く、lychee が「No links were found」で落ちた。
- 同じ日に PR #1 がマージされ、main に `index.html` が入った。

## 原因
- ひな形の Link check は `files: '*.html'` だけを調べる。HTML が無い main（立ち上げ直後）や、画面を JS で組み立てて静的なリンクが少ないアプリでは、調べるリンクが0件になり、lychee の failIfEmpty で落ちる。
- 2026-10-24 local-kanban でも同じ型（[2026-10-24-link-check-no-links.md](2026-10-24-link-check-no-links.md)）。そのときはひな形にコメントを足しただけで、既定の値は `'*.html'` のままだった。

## なぜ見つからなかったか
- Link check は定期と、このファイルを変えた PR でだけ動く。はじめの commit は PR を通らないので、main で初めて動くまで分からなかった。

## 対策
- [x] 直す: kasane-zome ほか新しいゲーム11本の Link check を `files: '*.html *.md'` にした（kasane-zome #4 ほか各リポジトリの PR）
- [x] 防ぐ: ひな形 `template/.github/workflows/link-check.yml` の既定を `'*.html *.md'` にした。README には必ず出どころなどのリンクがあるので、HTML が無くても0件にならない（この PR）
- [x] 防ぐ: `*.md` を調べると README の公開ページの URL も調べる。初めて公開する前の PR では 404 で落ちた（mannaka-kanji #2・kippu-10 #1・bento-zume #1）。自分たちの公開ページ（`satou-aaaaa.github.io`）は各リポジトリの site-watch が毎日見張っているので、Link check では `exclude` で外した（ひな形と各リポジトリ）
- [x] 見つける: `ci-failure-issue.yml` が main の失敗で Issue を開き、巡回が拾う仕組みが今回そのまま働いた（[repo-patrol](../routines/repo-patrol.md)）
