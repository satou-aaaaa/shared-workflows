# 天秤の書の Check が、Playwright を入れる段階の遅さで10分の時間切れになった

- 種類: 公開・CI
- 場所: tenbin の Check（.github/workflows/check.yml）
- 気づいた人: 監督の巡回（CI 失敗の Issue tenbin #111）
- 影響: 2026-11-06 に main の Check が3回（#106・#107・#110 のマージ）、PR が2本、時間切れで止まった。検査の中身はどれも通っていた。公開ページと学ぶ人への影響は無い。

## 起きたこと
- 2026-11-06 16:52 UTC、#110 をマージした main の Check が10分で止まり、CI 失敗の Issue（#111、timed_out）が立った。
- ログでは `npx playwright install --with-deps chromium` の apt（日本語フォントなど9個）が 43 kB/s しか出ず、入れる段階だけで7分35秒。ふだんは16秒ほど。
- 残りの2分半で検査の大半が OK になったところで時間が尽きた。

## 原因
- tenbin の check.yml の `timeout-minutes` が10分で、apt が遅い日には入れる段階だけで使い切る（2026-11-05 にゲームで起きたのと同じ）。
- 11/5 の直しは、ゲームの `qa.yml` を写し合っている16本だけを直した。tenbin は同じ `playwright install` を `check.yml` という別の名前で持っていて、直す範囲から漏れた。

## なぜ見つからなかったか
- 11/5 に drift-check へ足した `qa:timeout` は、全部のワークフローを中身で見るので tenbin も拾えた。ただし drift-check は週1（月曜朝）の週次まとめでしか回らず、足した日から次の月曜までの間に今ある違反が出なかった。
- drift-check はファイル全体の最小の時間切れを見ていたので、last-tell（Playwright のジョブは60分、まとめのジョブが15分）を誤って出していた。誤りが混じると、出た行を読み流しやすい。

## 対策
- [x] 直す: tenbin の check.yml を20分にした（tenbin #112）。同じ形で15分だった sandbox の Test も20分にした（sandbox #322）。
- [x] 防ぐ: `routines/common.md`「問題が起きたら」に、ほかのリポジトリへ広げるときはファイル名でなく中身で全部を探すこと、drift-check に決まりを足したらその PR で全リポジトリに回して今ある違反を同じ日に直すことを書いた（この PR）
- [x] 見つける: `scripts/drift-check.mjs` の `qa:timeout` をジョブごとに見るようにし、ジョブ名も出す（last-tell の誤りが消え、直す前の tenbin は出る。この PR）
