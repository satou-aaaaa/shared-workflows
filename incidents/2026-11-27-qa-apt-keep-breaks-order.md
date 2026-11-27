# ゲームの QA が apt の取り置きを入れる順で止まり、Link check は相手のサーバーの 503 で赤くなった

- 種類: 公開・CI
- 場所: `.github/workflows/game-qa.yml`（Playwright を入れる）・`.github/workflows/link-check.yml`（落とすかの判定）
- 気づいた人: 見回り（CI失敗 Issue hikari-michi#25・jidosha-shurui#15・baibai-kimari#16・jintai-shikumi#24・dento-kogei#26・kusuri-yomi#21）
- 影響: 2026-11-26 21:00〜22:15 UTC、main の QA 3件と Link check 3件が ❌。遊ぶ人への害は無い（公開はそれぞれの PR の QA で済んでいた）。同じ時間に動いていた共通パーツの配布（ひな形を写す PR）とは関係が無い（落ちたのは中身でなく、入れる段と外のサイト）。

## 起きたこと
- QA：apt の取り置き（actions/cache の .deb）に libasound2-data と libasound2t64 の 1.2.15.3-1ubuntu1.2 があり、機械には 1.1 が入っていた。`dpkg -i` は名前の順に入れるので、先に新しい -data が「古い libasound2t64 を Breaks」で断られ、そのあと本体だけ 1.2 になって設定できない（iU）半端な状態になった。続く `playwright install --with-deps` の apt が「満たせない依存」で止まり、QA が落ちた。
- Link check：jintai-shikumi（日本眼科学会）と dento-kogei（伝統的工芸品産業振興協会の PDF）が 2回続けて 503、kusuri-yomi（仙台市）が 404。どれも同じ日のうちに開けた（相手のサイトの一時的な不調）。

## 原因
- 取り置きを入れる `dpkg -i` に `--auto-deconfigure` が無く、Breaks のある組（-data と本体）の版が上がった日に、入れる順で必ず止まる形だった。失敗したあとも半端な状態を直さずに apt へ進んでいた。
- Link check の判定は時間切れだけを警告にしていて、相手のサーバーの不調（5xx）もリンク切れと同じく落としていた。

## なぜ見つからなかったか
- 取り置きは 2026-11-11 に入れた。そのときの部品は版が同じで、Breaks のある組の版が上がる日が来るまで、この順の問題は表に出なかった。dpkg の失敗は「警告にして apt で入れる」と書いていたが、半端な状態のまま apt に渡ると apt も止まることを試していなかった。
- 手元で再現できる：-data 1.1・本体 1.1 を入れたあと、1.2 の2つ（-data が本体 << 1.2 を Breaks）を `dpkg -i` で入れると本体が iU で残る。`--auto-deconfigure` を付けると両方 1.2 で入る（この PR で確かめた）。

## 対策
- [x] 直す: game-qa.yml の取り置きを `dpkg -i --skip-same-version --auto-deconfigure` で入れ、それでも失敗したら `apt-get -f install` で半端な状態を直してから進める（この PR）。落ちた3つは main の QA をやり直した。
- [x] 直す: link-check.yml の判定で、Errors が全部 5xx（相手のサーバーの不調）なら時間切れと同じく警告で通す。404 などは今までどおり落とす。`scripts/check-link-check-judge.sh` に 5xx だけ（通す）・5xx と 404（落とす）の見本を足した（この PR）。落ちた3つはやり直した。
- [x] 防ぐ: `scripts/check.sh`（Lint）が、ワークフローの `sudo dpkg -i` に `--auto-deconfigure` が無いと落とす（この PR）。
- [x] 見つける: `scripts/drift-check.mjs` が、ほかのリポジトリで取り置きを `dpkg -i` で入れるのに `--auto-deconfigure` が無いジョブを週次まとめに出す（qa:apt-keep-order。last-tell の自前 QA など。この PR）。
