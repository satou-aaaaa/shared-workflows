# 押せる所の高さの検査が、出てくる動きの途中で 43.98px と測り、ときどきだけ落ちていた

- 種類: 公開・CI
- 場所: 各ゲームの `qa/run.mjs`（「押せる所は高さ44px以上」）
- 気づいた人: 一括で直すスレッド（shokuhin-hyoji #8 の QA が CI でだけ落ちた）
- 影響: shokuhin-hyoji の QA が main でも PR でもときどき赤になり、ひな形を配る PR が止まった。遊ぶ人には影響なし（リンクの高さは 44px ある）。同じ書き方のゲームが 86 本ある。

## 起きたこと
- 答えたあとの説明（`.verdict`）は下から出てくる動き（translateY）で出る。動きの途中で測ると、出典のリンク（min-height 44px）の高さが 44 より少しだけ小さく返った。
- 検査は `getBoundingClientRect().height < 44` と丸めずにくらべていたので、そのときだけ落ちた。

## 原因
- 動きの途中で端数のずれ（8.18px など）があると、四隅の位置がそれぞれ 1/64px に丸められ、高さが 43.98… になることがある。検査がその端数を見ていた。

## なぜ見つからなかったか
- 手元では3回に1回ほど、CI でも毎回ではなく、落ちたときの値（44.0 と表示）からは分からなかった。測ったときの親の動き（`getAnimations()`）を出して初めて分かった。
- ゲームごとの QA は写し合いで広がり、同じ書き方を見つける仕組みが無かった。

## 対策
- [x] 直す: shokuhin-hyoji #8 で高さを `Math.round` で丸めてくらべる
- [x] 見つける: `scripts/game-patterns.mjs` の `heightRaw` と drift-check の `qa:height-raw` が、丸めずに 44 とくらべる QA を週次まとめに出す（`scripts/check-game-patterns.mjs` で検査。この PR）
- [x] 直す: 11/17 に gogen-suiri の main の QA が同じ理由で落ちたので丸めた（gogen-suiri #9）
- [x] 直す: 同じ書き方の残り 85 本は、11/17 夜に前倒しで直した。ゲームごとの手直しでなく、`scripts/sync-template.mjs` が qa/run.mjs の「丸めずに 44 とくらべる所」だけを `Math.round(…) < 44` に書きかえ、Template sync が全ゲームへ PR で配る（`game-patterns.mjs` の `roundSizes`。何度かけても同じ）
- [x] 見つける: 高さだけでなく幅（`.width < 44`）・測った箱を変数に入れた形（`r.height < 44`）・以上をたしかめる形（`>= 44`）も同じ穴なので、見つける検査（`heightRaw`）も書きかえも両方見る（この PR）。ひな形の `template/qa/transfer-check.mjs` にも3か所あったので丸めた
- [x] 防ぐ: Template sync は週1でも回るので、写し合いで丸めない書き方がまた入っても、次の配布で自動で丸まる（`scripts/check-game-patterns.mjs` が書きかえの結果と2回かけても同じかを検査）
