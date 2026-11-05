# ゲームの QA が、Playwright を入れる段階の遅さで10分の時間切れになった

- 種類: 公開・CI
- 場所: todofuken-relay・shiritori-saitan の QA（.github/workflows/qa.yml）
- 気づいた人: とことんを全ゲームに入れていたスレッド
- 影響: 2026-11-05 に PR 2本と main 1回の QA が「cancelled」で止まり、マージが遅れた。動き直しで全部緑になった。遊ぶ人への影響は無い。

## 起きたこと
- 2026-11-05、todofuken-relay の PR と main、shiritori-saitan の PR で QA が10分で止まった。
- ログでは `npx playwright install --with-deps chromium` の apt の段階だけで約9分かかり、検査を回す前に時間が尽きた。
- 同じジョブを動き直すと、入れる段階は1分ほどで終わり、緑になった。

## 原因
- ゲームの qa.yml は `timeout-minutes: 10` で、検査の時間（×はどこだ は手元で約8分）に余裕がほとんど無かった。GitHub 側で apt が遅い日に、入れる段階だけで使い切った。
- qa.yml はひな形（template/）に無く、ゲームどうしで写し合っていたので、短い時間切れが16本に広がっていた。

## なぜ見つからなかったか
- ふだんは入れる段階が1分ほどで、10分で足りていた。時間の決まりを見る検査が無かった。

## 対策
- [x] 直す: ゲーム15本の qa.yml の `timeout-minutes` を 20 にした（各リポジトリの PR）
- [x] 防ぐ: ひな形 `template/.github/workflows/qa.yml`（20分）を置き、新しいゲームはここから写す（routines/game-dev.md。この PR）
- [x] 見つける: `scripts/drift-check.mjs` が、Playwright を入れるジョブの timeout-minutes が20分より短いリポジトリを週次まとめに出す（この PR）
