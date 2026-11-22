# 毎日の新作の回が、ゲームではない題材（AI向け言語）を「候補を始める」と出した

- 種類: 手順の抜け
- 場所: `scripts/game-wip.mjs`・`scripts/new-game.mjs`（ルーティン「新作ゲームを毎日1本ずつ進める」）
- 気づいた人: Claude（11/22 の毎日の回）
- 影響: 11/21 と 11/22 の回で、akashi-lang（AI向け言語）の題材 #535 が候補の先頭に出た。回が手で飛ばしたので、まちがって作り始めたものは無い。kawagoe-bousai（#560）・games（#562）も候補に数えられ、候補の本数が多く見えていた。別に、新作のひな形を写すとき core/core.js がファイルのまま入りかけた（kikikuru-yomi #1、push 前に消した）

## 起きたこと
- Create repo は担当を決めるために「題材:」Issue を要るので、ゲーム以外のリポジトリ（言語・アプリ・一覧サイト）も「題材:」Issue を立てた（onboarding.md 手順0）。
- game-wip.mjs は「題材:」Issue のうち `repo:` の行が無いものを全部ゲームの候補と読み、番号の小さい #535 を「始める」と出した。
- 11/22 の回で `new-game.mjs` を回すと、2026-11-21 に足した共通部品の元 `template/core/core.js` もファイルとして写った。

## 原因
- 「題材:」Issue に、ゲームかどうかを書く場所が無く、game-wip.mjs も見分けていなかった。
- new-game.mjs の写さない一覧（SKIP）は store/ だけで、あとから足した core/ を入れていなかった（部品の元を足すたびに一覧を直す作りになっていた）。

## なぜ見つからなかったか
- check-game-wip.mjs の作った答えに、ゲームではない題材が無かった。
- 11/21 の回は手で飛ばして記録（共有メモリ）にだけ書き、仕組みを直さなかった。
- check-game-wip.mjs は store/store.js が写らないことだけを見ていた。

## 対策
- [x] 直す: #535・#560・#562 の本文に `kind: app` の行を足した
- [x] 防ぐ: game-wip.mjs が `kind: app`（と「ゲームではない」と書いた題材）を候補にも作りかけにも数えず「触らない」と出す。check-game-wip.mjs で確かめる（この PR）
- [x] 防ぐ: onboarding.md 手順0・game-factory.md に、ゲーム以外の題材は `kind: app` の行を書くと足した（この PR）
- [x] 防ぐ: new-game.mjs の SKIP に core/ を足し、check-game-wip.mjs が core/core.js を写さないことを見る（この PR）
