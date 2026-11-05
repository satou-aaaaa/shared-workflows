# 見やすさの設定が操作のあとに消える・「🔊 読む」で何も読まれない画面があった

- 種類: 検査の見逃し
- 場所: shared-workflows template/a11y/a11y.html・template/qa/a11y.mjs（写したゲーム全部）
- 気づいた人: CodeRabbit（おつかいメモ PR #1 のレビュー）
- 影響: ゲームの JS が html の class を丸ごと書き換えると、「読みやすい文字」などの設定がその場で消えた。data-a11y-say の無い画面では「🔊 読む」を押しても読まれず、設定の画面が開くだけだった

## 起きたこと
- おつかいメモで `document.documentElement.className = …` が a11y- の class を消していた（d131ea0 で直した）。
- 実績・カレンダーなど、問題文の無い画面に data-a11y-say が無く、読み上げる文が空だった。

## 原因
- 設定の印を html の class に置くのに、ゲーム側が class を丸ごと書き換えてよいかの決まりが無かった。
- 読む文を data-a11y-say だけから取り、無いときの代わりが無かった。

## なぜ見つからなかったか
- 検査は読み込んだ直後の画面だけを見ていて、操作のあとに class が残っているかを見ていなかった。
- 読み上げは声が出るかを試せないので、読む文があるかも見ていなかった。

## 対策
- [x] 直す: data-a11y-say が無い画面では見出しと知らせの場所を読む（`template/a11y/a11y.html` v4 の sayText）。全ゲームへ v4 を写し直す
- [x] 見つける: 画面ごとに操作したあと、html に a11y- の class が残るか・読む文があるかを見る。`className =` で html の class を書き換えるコードも見つける（`template/qa/a11y.mjs`）
- [x] 防ぐ: `routines/game-dev.md` の A7 に「html の class は classList で足し引きする・問題文に data-a11y-say」を足した
