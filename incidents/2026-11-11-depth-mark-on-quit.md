# まちがえてから「ここで降りる」と、その問題が復習に入らなかった

- 種類: 動作
- 場所: satou-aaaaa/dema-tashikame・dashisugi-check・kenko-minuki・gurafu-minuki・kokoku-minuki・okane-kihon・kippu-10 の `index.html`（`Depth.mark`）
- 気づいた人: dema-tashikame #8 の CodeRabbit
- 影響: とことん・練習でまちがえた（ヒントを使った）あと、解かずに降りる・閉じると、その問題が復習に戻らなかった。公開済みの4本（広告みぬき・お金のきほん・きっぷで10）は 11/11 から直すまで。記録は壊れない。

## 起きたこと
- 復習へ入れる `Depth.mark` を、問題を解き終えたとき（`finish`・`solved`・`complete`）にだけ呼んでいた。
- とことんは「ここで降りる」でいつでも終われるので、まちがえたまま降りた問題は mark が呼ばれず、復習に入らなかった。

## 原因
- template/depth.js の使い方の説明が「問題が終わったら Depth.mark」で、解き終えずにやめる道を書いていなかった。7本とも説明どおりに作った。

## なぜ見つからなかったか
- QA の深さの検査は、解き終えたあとに復習の中身を見ていた。まちがえた直後に見る検査が無かった。

## 対策
- [x] 直す: 7本の途中保存 `keep` の頭で `early()` を呼び、まちがい・ヒントがあればその時に `Depth.mark(鍵, 1, 名前)` する。QA に「まちがえた（ヒントを使った）その時に復習へ入る」を足した（dema-tashikame #8・dashisugi-check #5・kenko-minuki #7・gurafu-minuki #7 と、kokoku-minuki・okane-kihon・kippu-10 の新しい PR）
- [x] 防ぐ: drift-check に `depth:early` を足した。`Depth.mark` を1か所でしか呼ばないゲームは週の点検で出る。新作の TODO（`scripts/new-game.mjs`）と `routines/game-dev.md`「1問を深くする」の復習の行にも書いた（この PR）
