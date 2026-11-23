# 共通部品 game-core の文が、ゲームごとの QA の決まりにかかった（数字 188・行末が } のコメント・ゲームの名前）

- 種類: 検査の見逃し
- 場所: `template/core/core.js`・`template/store/store.js`（#568 の手元の試し）
- 気づいた人: Claude（#568 を配る前に、手元と公開リポジトリのゲームで sync-template をかけて QA を回したとき）
- 影響: 配る前に見つけたので、遊ぶ人への影響は無い。そのまま配っていれば、funka-level と jobun-tobatsu の Template sync の PR が QA で落ちていた。

## 起きたこと
- funka-level の QA は「写し元（健康情報みぬき）の言葉が残っていない」を `/…|188|…/` で見ている。core.js の感想フォームの欄の番号 `entry.241861188` に 188 が入っていて落ちた。
- shigaisen-yomi の QA は「写し元（震度よみ）の言葉」を `shindo` で探す。core.js のコメントの例 `shindo-yomi-v12` で落ちた（store.js にも別のゲームの名前があった）。
- jobun-tobatsu の QA は「行の途中の // のあとが ; { } ) で終わればコードの途中にコメントを足した」と見る。core.js・store.js の説明のコメントが `}` で終わっていて落ちた。

## 原因
- 共通部品は全ゲームの index.html に入るのに、ゲームごとに足した QA の決まり（言葉・形の禁止）を、共通部品の側で知らなかった。

## なぜ見つからなかったか
- check-core.mjs はブラウザなしで core.js の動きと形を見るだけで、ゲーム側の決まりを当てていなかった。全ゲームでの試しは、配る前の手作業でしか回していなかった。

## 対策
- [x] 直す: 番号を `241861100 + 88` の足し算で書き、2つのコメントを `}` で終わらない文にし、core.js・store.js からゲームの名前を消した（#568）
- [x] 防ぐ: check-core.mjs が core.js・store.js・migrateCore で足す行に、3つの決まり（コメントの行末・相談窓口の番号・repos.txt のゲームの名前）を当てる。check.sh と CI の Lint で落ちる（#568）
- [x] 見つける: 共通部品を変えた PR は、配る前に手元のゲームで sync-template をかけて QA を回す（`routines/game-dev-detail.md` の「全ゲームへ写す前」。#568）

## 追記（2026-11-22 朝、同じ種類の4本目）
- 起きたこと: Template sync の PR を自動でマージしたとき、inshi-ikura #2 だけ QA で止まった。QA の「写し元（ひらく？とじる？）の言葉が残っていない」が、core.js の吹き出しのボタン「案内をとじる」にかかった。
- なぜ見つからなかったか: check-core.mjs は決まった3つの形しか見ない。ゲームごとに書く「写し元」の言葉は何でもありうるので、手元の40本だけで試したときは当たらなかった。
- [x] 直す: ボタンと説明を「案内を閉じる」にした（core-check.mjs の見出しも）。
- [x] 防ぐ: `copyWordHits`（scripts/game-patterns.mjs）が、各ゲームの qa/run.mjs の「写し元」検査（`!/…/.test(`）の正規表現を、core.js・store.js・migrateCore が足す行に当てる。drift-check が全ゲームを見て `qa:copy-words` で知らせる。Lint（check-game-patterns.mjs）が「いまの core は とじる にかからない」と、見分けの動きを確かめる。全198本の qa/run.mjs に当てて、直したあとはかかる所が無い。
