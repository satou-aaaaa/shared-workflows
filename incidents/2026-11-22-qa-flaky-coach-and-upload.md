# main の QA が、遊びに関係ない所で赤くなった（震度よみ：吹き出しの検査の順番・医療費いくら：控えの置き場の時間切れ）

- 種類: 検査の見逃し
- 場所: `template/qa/core-check.mjs`（練習の1問を最後まで進める所）・`.github/workflows/game-qa.yml`（qa-report の控えを置く段）
- 気づいた人: 監督の巡回（ci-failure の Issue 震度よみ #8・医療費いくら #7 に直す PR が無かった）
- 影響: 震度よみの main の QA が2回、医療費いくらの main の QA が1回赤になり、ci-failure の Issue が立った。ゲームそのものは正しく動いていた（遊ぶ人への影響なし）。

## 起きたこと
- 震度よみ：「game-core の検査が最後まで動く（[練習の1問を最後まで（1つ目の吹き出し）] locator.click: Timeout 30000ms exceeded.）」。印（core-coach-on）が、正解のあとで押せなくなった目安のボタン（disabled）に付いたまま押しにいき、30秒待って止まった。手元では通り、GitHub の上でだけ落ちた。
- 医療費いくら：QA は「172項目すべて通過」なのに、そのあとの upload-artifact が `Failed to CreateArtifact: Unable to make request: ETIMEDOUT` で失敗し、仕事ごと赤になった。次の main の QA は通った。

## 原因
- 吹き出し（Core.coach）は requestAnimationFrame の中で次の段へ移る。検査は正解の直後、まだ移る前の「印の付いた所」を押しにいった。Playwright はつかんだ要素が押せるようになるまで待ち続けるので、印があとで「次へ」に移っても、押せないままの古いボタンを30秒待った。遅い機械ほど、この一瞬に当たりやすい（版3で9回中1回残っていた失敗。incidents/2026-11-22-coach-bubble-stale-place.md）。
- 控えの upload-artifact は見返す用なのに、ほかの段と同じく失敗で仕事を赤にしていた。GitHub の置き場の時間切れはコードと関係なく起きる。

## なぜ見つからなかったか
- core-check は「押す所を隠さない」は見ていたが、「印が押せる所を指しているか」を確かめずに押していた。どこで止まったかは前の対策で1行目に出るようになっていたので、今回すぐ分かった。
- upload-artifact の失敗を許すかどうかを、段ごとに決める決まりが無かった。

## 対策
- [x] 直す: `template/qa/core-check.mjs` は、印が押せる所（disabled でない所）を指すまで最大3秒待ってから押す。わざと吹き出しが移るのを0.8秒遅らせた震度よみで、直す前は同じ「2 × waiting for element to be visible, enabled and stable」で止まり、直したあとは「次へ」を押して進んだ（この PR）。
- [x] 直す: `game-qa.yml`・`game-explore.yml`・`mutation.yml` の控えの upload-artifact に `continue-on-error: true` を付けた（この PR）。
- [x] 防ぐ: `scripts/check-upload-artifact.mjs`（check.sh と Lint）が、upload-artifact の段に continue-on-error（控えなら true、成果そのものなら false）が書かれていないと落とす。
- [x] 見つける: core-check に「練習の1問を進めるあいだ、吹き出しが押せない所（disabled）を3秒より長く指したままにしない」を足した。ゲームの側で印が押せないボタンに残る不具合が出ても、30秒の Timeout でなく、何番目の吹き出しがどのボタンを指していたかで出る（この PR）。
