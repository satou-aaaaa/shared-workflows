# ゲームの QA が、Ubuntu の置き場の名前が引けず Playwright を入れる段階で全部落ちた

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows `.github/workflows/game-qa.yml`（各ゲームの QA が `@main` で呼ぶ）
- 気づいた人: やりくり商店街を作っていたスレッド
- 影響: 2026-11-11 13:56 UTC から、yarikuri-shotengai の main の QA と PR #2・#3・#4 の QA が赤になり、マージが止まった。同じ時間に QA を回したほかのゲームは無かった。遊ぶ人への害は無い。

## 起きたこと
- `npx playwright install --with-deps chromium` の apt の段階で、`Temporary failure resolving 'archive.ubuntu.com'`（azure.archive・security も）が並び、字の部品（fonts-ipafont-gothic など9個・21.9MB）を落とせずに止まった。1回に約10分かかって落ちた。
- 14:38 の試しでは名前の待ちがさらに長くなり、入れる段階のまま20分の時間切れで取り消された。
- 13:41 の同じ PR の QA は、同じ機械の版（ubuntu-26.04、20261101.186.1）で通っていた。packages.microsoft.com は引けていた。

## 原因
- GitHub の機械から Ubuntu の置き場の名前が引けなかった（GitHub か Ubuntu の側の一時的な障害）。共通部品 game-qa.yml は 2026-11-07（#266）から変わっていない。13:56 の直前に main が 67ec441 → 3119d47 になったのは自動マージの直し（#287）で、QA の手順には触れていない。
- QA は毎回、Ubuntu の置き場から字の部品を落とし直していて、置き場に届かないと1本も回せなかった。

## なぜ見つからなかったか
- 2026-11-05 の時間切れ（incidents/2026-11-05-qa-timeout-slow-install.md）は「遅い」だけで、置き場に全く届かない日を考えていなかった。落ちたときのログも apt の行が数百行で、コードのせいかどうかがすぐ分からなかった。

## 対策
- [x] 直す: 障害が明けたあと、赤だった QA を動き直した（yarikuri-shotengai）
- [x] 防ぐ: game-qa.yml が、apt が落とした .deb を actions/cache に取っておき、次からはそれを使う（main の実行で保存。置き場に届かない日も、取り置きがあれば dpkg で入れ、ブラウザだけ入れて続ける）。入れる段階は10分で打ち切り、時間切れまで止まらない（この PR）
- [x] 見つける: 入れる段階で落ちたら「Ubuntu の置き場が引けていないならコードのせいではない、しばらくして Re-run」と注釈を出す。つまずき台帳（routines/known-limits.md）にも1行（この PR）
