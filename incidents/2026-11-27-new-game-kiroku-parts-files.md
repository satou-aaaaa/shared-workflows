# 新作が kiroku/・parts/ をファイルで写し、drift-check が kiroku の esc を「手の写し」と数えた

- 種類: 検査の見逃し
- 場所: `scripts/new-game.mjs`（SKIP）・`scripts/game-patterns.mjs`（coreCopies）
- 気づいた人: 動画用の新作6本（抜け道ふさぎ・合格ラインのつまみ・助言に乗る？）を作ったエージェント3つが、同じことを別々に報告した
- 影響: 新作のフォルダに使われない `kiroku/kiroku.js`・`parts/` が入った（手で消したので PR には入っていない）。drift-check が kiroku を入れた全ゲームに「esc を手で写して持っている」を出していた（yatai-negasen でも出る）。遊ぶ人への害は無い。

## 起きたこと
- 2026-11-26 に kiroku、11-27 に parts をひな形に足したとき、どちらも index.html・data.js の印のあいだに sync-template.mjs で写す部品なのに、new-game.mjs の SKIP は store/・core/ のままだった。
- coreCopies は core:begin〜end だけを外して調べるので、kiroku の写しの中の `const esc = …` を、ゲームが手で写したものと数えた。

## 原因
- 「印のあいだに写す部品」を足すとき、new-game.mjs の SKIP と coreCopies の外し方を合わせる決まりが無かった。

## なぜ見つからなかったか
- check-game-wip.mjs は core/・store/ の2つだけを名前で見ていた。coreCopies の検査は「手の写しを見つける」側だけで、部品の写しを外す側を見ていなかった。

## 対策
- [x] 直す: `scripts/new-game.mjs` の SKIP に kiroku/・parts/ を足し、coreCopies が kiroku と part の印のあいだも外す（この PR）。
- [x] 防ぐ: `scripts/check-game-wip.mjs` が kiroku/・parts/ を写したら落とす。`scripts/check-game-patterns.mjs` が、kiroku・part の写しの中の esc・toast を数えたら落とす（わざと戻して落ちるのを確かめた）。
