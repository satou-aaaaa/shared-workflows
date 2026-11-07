# ゲームの記録が保存できなくても黙っていて、開き直すと記録が消えた

- 種類: 検査の見逃し
- 場所: 暑さ指数よみ・節電のコツ・きっぷで10 など localStorage に記録を置くゲーム14本
- 気づいた人: 暑さ指数よみの PR #1 を作り込むときの見直し
- 影響: 容量いっぱい・保存を切ったブラウザで遊ぶと、記録は開いているあいだだけ残り、開き直すと消えた。遊ぶ人には何も知らされなかった。消えたと分かった報告は無い。

## 起きたこと
- 2026-11-07、暑さ指数よみの `save` を読み直していて、`localStorage.setItem` が失敗したとき `catch (e) { mem = j; }` で黙って続けているのに気づいた。
- 同じ1行を中身で全リポジトリから探すと、ほかにゲーム13本が同じ作りだった（どれも同じ見本から写していた）。

## 原因
- 最初のゲームの `save` が「保存できない環境でも画面は止めない」ことだけを考えて作られ、遊ぶ人に知らせる所が無かった。新しいゲームはそれを写して作るので、全部に広がった。
- `routines/game-dev.md` の「共通の形」に、保存に失敗したときの決まりが無かった。

## なぜ見つからなかったか
- 各ゲームの QA は保存が成功する場合だけを見ていて、`setItem` が失敗する場合を作って確かめていなかった。
- CodeRabbit のレビューは1本ずつを見るので、写して広がった作りをまとめて見る所が無かった。

## 対策
- [x] 直す: 保存に失敗したら遊んでいる途中でも1回だけ知らせるようにし、QA に検査を足した（atsusa-shisu #1・setsuden-kotsu #4・jitensha-rule #3・kotowaza-awase #5・mukashi-narabe #4・seiza-tsunagi #21・otsukai-memo #10・kimari-sagashi #7・kippu-10 #23・jobun-tobatsu #14・machi-michijun #8・kasane-zome #26・rosen-hitofude #23・bento-zume #21）
- [x] 直す: 1回目の直しの toast は1.8秒で消え、2回目からは知らせなかった（CodeRabbit が atsusa-shisu #1 で指摘）。保存できるまで消えない帯に替えた（atsusa-shisu #1・ほか13本の PR）
- [x] 防ぐ: `routines/game-dev.md`「共通の形」に「記録の保存」の行を足した（この PR）
- [x] 見つける: `scripts/drift-check.mjs` に `save:silent` を足し、黙って続ける `save` が残るゲームを週次まとめに出す（この PR）
