# 別のタブで先に答えると「自信あり」が2回数えられる形が、13本のゲームにあった

- 種類: 動作
- 場所: template/depth.js（深さの版4まで）と、それを使うゲームの index.html（dema-tashikame・funka-level・gurafu-minuki・hatsuden-kurabe・kenko-minuki・kenpo-shikumi・kokoku-minuki・kumo-namae・nemuri-kotsu・nenkin-shikumi・okane-kihon・taikyo-hiyo・toan-kumitate）
- 気づいた人: CodeRabbit（endaka-enyasu #1）。一覧は shared-workflows #352
- 影響: 2つのタブ（または開き直したあと）で同じ回の同じ問題に答えると、結果の画面の「自信ありの当たり」と通しの数が2つ数えられる。★・記録・復習は変わらない。

## 起きたこと
- 「この問題をもう数えたか」は depth.js の中の変数（judged）だけで覚えていて、タブごと・開き直すたびに初めからになる。
- ゲームは最初に答えたときに Depth.judge を呼び、自信ありなら回の数（ds.n）を足す。2つ目のタブでも同じことが起きる。

## 原因
- 自信の数え方の「1問に1回」を、保存に残さず開いているページの中だけで守っていた（記録の保存は読み直してから書くのに、ここだけ読み直していなかった）。
- 各ゲームは depth.js を写して同じ呼び方をするので、13本に同じ形が入った。endaka-enyasu だけはゲームの中で直したが、共通部品は直していなかった。

## なぜ見つからなかったか
- template/qa/depth-check.mjs は1つのページの中で「2回目は null」を見るだけで、2つのタブが同じ記録を使う道を通していなかった。

## 対策
- [x] 直す: depth.js（深さの版5）で、Depth.bindSure(鍵, 回の印) の回の印を記録（at）に残し、judge の前に読み直してほかのタブ・開き直す前に数えていたら null にする（この PR）
- [x] 見つける: `template/qa/depth-check.mjs` の tabs が、2つのタブ・開き直したあと・別の回・回の印なしを毎回見る（直す前の depth.js では落ちる）
- [x] 防ぐ: `scripts/game-patterns.mjs` の playerBugs に depth:twice（回の印の無い Depth.bindSure）を足し、ゲームの PR が新しく持ち込んだら game-qa で落とす。new-game.mjs と routines/game-dev-detail.md の書き方も回の印つきに
- [ ] 直す: 13本で depth.js・qa/depth-check.mjs を写し、Depth.bindSure(tag, cur.id + "|" + cur.i) にする（担当: 一括で直すスレッド、期限: 2026-11-24）
