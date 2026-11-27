# 新作をひな形から始めると kiroku/・parts/ がファイルで入り、drift-check が全ゲームに esc の手写しを出した

- 種類: 検査の見逃し
- 場所: shared-workflows の scripts/new-game.mjs・scripts/game-patterns.mjs（coreCopies）、新作 life-mikata
- 気づいた人: Claude（新作「見方をかえる」life-mikata の PR #1 の前の drift-check で）
- 影響: 新作に使われない kiroku/kiroku.js・parts/*.js（10ファイル）が入りかけた。drift-check は、ひな形どおりのゲーム（fuuryoku-yomi など）にも「esc を手で写して持っている」と出した

## 起きたこと
- 2026-11-27、`node scripts/new-game.mjs ../life-mikata` が kiroku/ と parts/ をファイルで写した。どちらも index.html・data.js の印のあいだに sync-template.mjs が写す部品で、ファイルは使われない。
- 同じ日の drift-check が、写したばかりの life-mikata にも fuuryoku-yomi にも core:copy（esc）を出した。esc は kiroku の印のあいだ（ひな形の写し）にあった。

## 原因
- 印で写す部品の一覧が、new-game.mjs の SKIP（store・core）と coreCopies（core だけ外す）に別々に手で書いてあった。kiroku（#638）と parts（#643）を足したとき、どちらにも足されなかった。

## なぜ見つからなかったか
- check-game-wip.mjs は core/・store/ が写らないことだけを名前で見ていて、印で写す部品が増えたかは見ていなかった。coreCopies の検査も、印のあいだに同じ名前の関数がある形を持っていなかった。

## 対策
- [x] 直す: new-game.mjs の SKIP に kiroku/・parts/ を足し、coreCopies は印のあいだ（core・kiroku・store・a11y）を全部外して見る（この PR）
- [x] 防ぐ: `scripts/check-game-wip.mjs` が sync-template.mjs の印（`<!-- 名前:begin`・template/parts/）を読み、印で写す部品が全部 SKIP にあるかを見る。部品を足して SKIP を忘れると Lint が落ちる（この PR）
- [x] 見つける: `scripts/check-game-patterns.mjs` に、kiroku の印のあいだの esc を手写しに数えず、印の外の手写しは見つける場合を足した（この PR）
