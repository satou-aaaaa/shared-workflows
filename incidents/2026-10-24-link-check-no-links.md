# local-kanban の Link check が「リンク0件」で初回から落ち、Issue が3日だれにも直されなかった

- 種類: 見回りの見落とし
- 場所: satou-aaaaa/local-kanban の Link check（週1）・監督の巡回
- 気づいた人: 監督の巡回（3日以上開いた ci-failure Issue として）
- 影響: 10/21 の初回から赤（local-kanban #43）。リンク切れは無く、README の外へのリンク（モデルの置き場・公開ページ）が一度も調べられていなかった。

## 起きたこと
- local-kanban に Link check を入れたとき、ひな形のまま `files: '*.html'` にした。
- `index.html`・`notes/index.html` は JS で画面を組み立てるのでリンクが0件で、lychee の failIfEmpty（既定 true）で落ちた。
- 入れた PR では一度も動かさず（schedule と手動だけ）、10/21 の初回で初めて落ちた。
- Issue #43 は 10/24 まで、コメントも直す PR も付かなかった。

## 原因
- 定期だけで動くワークフローは、入れた PR では動かないので、設定の誤りがマージ後の初回まで分からない。
- ひな形の `files` に「リンクが0件だと落ちる」ことが書かれておらず、画面を JS で作るアプリに合わない値のまま使われた。

## なぜ見つからなかったか
- 監督の手順3は local-kanban などの担当の無いリポジトリを「修正スレッドか、いなければ Issue 起票」としていた。Issue はすでに CI が立てているので、起票では誰も動かず、3日の段階（next-actions の「直されていない」）まで待つ形になっていた。
- 同じ「見回りの見落とし」が30日に3件目（10/22 Law watch・10/24 selfplay）。日数の目安を短くするだけでなく、担当の無いところへすぐ渡す決まりにした。

## 対策
- [x] 直す: local-kanban の Link check で `notes/*.html *.md vendor/*.md` も調べる（local-kanban #74）。手元の lychee で9件見つかることを確かめた
- [x] 防ぐ: ひな形（template/）と local-kanban の Link check を、このファイルを変えた PR でも動かす（`pull_request.paths`）。設定の誤りをマージ前に見つける。ひな形の `files` に0件で落ちることを書いた
- [x] 見つける: 監督の手順3で、担当の無いリポジトリの CI 失敗はその回のうちにコーディネーターへ直すスレッドを頼む。`scripts/next-actions.mjs` は main の CI 失敗を1日で「直されていない」に上げる
