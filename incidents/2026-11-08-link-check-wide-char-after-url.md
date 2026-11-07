# Link check が、AGENTS.md の「Ko-fi（URL）へ…」を全角の続きまで URL と読んで2本とも落ちた

- 種類: 検査の見逃し
- 場所: rosen-hitofude・seiza-tsunagi の Link check（共通部品 link-check.yml）
- 気づいた人: 監督の巡回
- 影響: 2本の main の Link check が赤になり、「CI失敗: Link check（main）」の Issue（rosen-hitofude #30・seiza-tsunagi #28）が開いた。リンク先の Ko-fi は無事で、遊ぶ人への影響は無い。

## 起きたこと
- 2026-11-08 3:20〜3:24 JST、2本の Link check を手で動かした実行が、どちらも AGENTS.md 32行目の1件（404）で落ちた。
- lychee が調べた URL は `https://ko-fi.com/satouaaaaa）へのただのリンクだけ。…（共有フォルダ` で、本物の URL の後ろの全角の字まで URL に入っていた。
- 外のサイトの不調ではなく、同じ日に2本落ちたのは、2本が同じ古い呼び出しの写しを持っていたため。

## 原因
- lychee は Markdown の地の文の URL を、空白か `<>` が来るまで続けて読む。全角の「）」やひらがなは URL の字として読まれる。
- 2本の呼び出し（2026-11-03 の最初の形）は `files: '*.html *.md'` で AGENTS.md まで調べていた。ひな形はその後 `*.html README.md` に直され、「AGENTS.md は全角かっこの続きまで URL と読まれて落ちる」と書いてあったが、写しには届いていなかった。
- 11-04 に AGENTS.md へ「Ko-fi（https://…）へ」の行を足したが、Link check は週1と link-check.yml を変えた PR でしか動かず、行を足した PR では調べなかった。

## なぜ見つからなかったか
- URL の書き方を PR で見る検査が無かった。ひな形のコメントで知っていた落とし穴を、検査にしていなかった。
- 写しのずれを見る drift-check は、link-check の push の有無は見ていたが、調べるファイル（files）の中身は見ていなかった。

## 対策
- [x] 直す: 2本の link-check.yml をひな形 `template/.github/workflows/link-check.yml` の形にそろえた（files を `*.html README.md` に、main への push と自分の公開ページの除外を足した）。AGENTS.md の Ko-fi の URL も `<https://…>` で囲んだ（rosen-hitofude・seiza-tsunagi の PR）
- [x] 防ぐ: ゲームの PR の QA（`.github/workflows/game-qa.yml`）に「リンクの書き方」を足した。Link check が調べる .md に、すぐ後ろに全角の字が続く URL があれば PR で落とす（`scripts/link-text.mjs`、この PR）
- [x] 防ぐ: 写しの元になる手順書 `routines/game-dev.md` の Ko-fi の書き方を `<https://ko-fi.com/satouaaaaa>` にした（この PR）
- [x] 見つける: `scripts/drift-check.mjs` が、全リポジトリの Link check が調べる .md にこの書き方があれば週次まとめに出す（link-check:bare-url、この PR）。見分けそのものは `scripts/check-link-text.mjs`（Lint）が確かめる
- [x] 見つける: この PR でLink check のある全リポジトリを同じ見分けで調べた。当たったのはこの2本だけ
