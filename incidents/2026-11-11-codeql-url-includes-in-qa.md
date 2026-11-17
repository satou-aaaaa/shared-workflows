# 標識よみの PR #1 が、QA の出典 URL の検査を CodeQL が high と見て、赤のまま2日止まった

- 種類: 検査の見逃し
- 場所: satou-aaaaa/hyoshiki-yomi の PR #1（`qa/run.mjs`）
- 気づいた人: 週次まとめ #272 の「次にやること」
- 影響: 新作「標識よみ」の公開が2日おくれた。遊ぶ人への害は無い（QA の中の文字の検査で、公開する画面ではない）。

## 起きたこと
- 11-07 に PR #1 を出した。QA・Secret scan など自前の検査は全部 ✅ だったが、GitHub のコードスキャン「CodeQL」が high 1件で ✗ になった。
- 指摘は `qa/run.mjs` の `html.includes("https://laws.e-gov.go.jp/law/335M50004002003")`（Incomplete URL substring sanitization）。CodeRabbit も同じ所に直し方を書いていた。
- `sw.js` を含む PR で自動マージされないため、そのまま2日止まり、11-09 の週次まとめで見つかった。
- 11-11 に直そうとすると、2日のあいだに共通の決まり（保存できないときの帯・ヒント2・星・ここで降りる・maskable のアイコンなど）が7つ増えていて、drift-check にも出た。

## 原因
- 「ページに出典の URL があるか」を `includes` で見ていた。CodeQL は URL の文字を `includes`・`indexOf` で探す形を、どこにあっても通る「URL のチェックが不完全」として high にする。安全の穴ではないが、PR のチェックは赤になる。
- 作った会話は CodeRabbit を頼んだところで止まり、赤のチェックを直すところまで進まなかった。

## なぜ見つからなかったか
- CodeQL は GitHub の上でだけ動き、手元の `node qa/run.mjs`・drift-check・Lint にこの形を見るものが無かった。push の前に気づけない。
- 古いゲームの QA にはこの形が無く、写し元でも出たことがなかった（このゲームで初めて書いた形）。
- 止まった PR を再開してマージするときに、ひな形を写し直す手順が無かった。

## 対策
- [x] 直す: hyoshiki-yomi #1 で、出典の検査を `SRC` の定義を見る正規表現に変えた（CodeRabbit の案）。sync-template で写し直し、増えた7つの決まりに合わせて QA に検査を足した（古い形に戻すと落ちることを確かめた）
- [x] 防ぐ: drift-check に `qa:url-includes` を足した。ゲームの `qa/run.mjs` が URL を文字のまま includes・indexOf で探していれば出す（見分けは `scripts/game-patterns.mjs` の urlIncludes、検査は `scripts/check-game-patterns.mjs`。この PR）
- [x] 防ぐ: `routines/game-dev.md` の QA の行に「出典の URL は定義を正規表現で見る」、PR #1 の手順に「1日以上止まったあとでマージするときは sync-template と drift-check をやり直す」を足した（この PR）
