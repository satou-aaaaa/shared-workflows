# 自動マージのあと公開や main の検査を起こせず、黙って止まっていた

- 種類: 権限・設定
- 場所: satou-aaaaa/articles・local-kanban・naitei-no-michi の Auto merge、共通部品 automerge
- 気づいた人: 記事を足したあと公開を確かめた担当（Notion の移行スレッド）
- 影響: articles #4 のマージ後に記事が公開されず、手で pages.yml を起こした。local-kanban と naitei-no-michi では、マージ後に main で QA を回し直す仕組み（recheck_main）が一度も動いていなかった。

## 起きたこと
- 2026-10-21、articles #4 が自動マージされたが、公開（pages.yml）を起こす段で 403 になり、記事が出なかった。
- 調べると local-kanban の Auto merge も毎回「qa.yml を main で起こせませんでした」の warning を出して緑で終わっていた。naitei-no-michi も同じ設定。

## 原因
- ワークフローを起こすには GITHUB_TOKEN に `actions: write` が要る。呼び出し側の permissions に無かった。
- ひな形（template/）の permissions にも `actions: write` が無く、そこから作ったリポジトリが同じ穴を持っていた。

## なぜ見つからなかったか
- main で回し直す段は失敗しても warning を出すだけで、実行は緑のまま終わる。warning は誰も見ない。
- 公開されたかどうかを、マージのあとに確かめる検査が articles には無かった（Post-deploy check は articles では入れない決まり）。

## 対策
- [x] 直す: articles の Auto merge に `actions: write` を足した（articles #5）。公開は手で起こした
- [x] 防ぐ: ひな形の Auto merge に `actions: write` を足した（shared-workflows #61）
- [x] 防ぐ: local-kanban と naitei-no-michi の Auto merge にも `actions: write` を足した（各リポジトリの PR）
- [x] 見つける: 共通部品 automerge が、ワークフローを起こすときに 403 になったら赤で落ちて「actions: write を足す」と出す（この PR）
