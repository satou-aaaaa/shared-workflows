# tenbin の Playwright を Dependabot が見ておらず、古いまま残っていた

- 種類: 手順の抜け
- 場所: satou-aaaaa/tenbin の `.github/dependabot.yml`
- 気づいた人: 手入れの少ないリポジトリを整える作業（全リポジトリの Playwright の版を並べたとき）
- 影響: 本番の不具合は出ていない。tenbin だけ Playwright が 1.63.0 のままで、ほかのリポジトリ（1.64.1）と版がずれていた。直したい不具合や脆弱性が出ても、更新の PR が来ない状態だった。

## 起きたこと
- 2026-11-04 tenbin の `package.json` に Playwright（作り直しと検査の道具）があるのに、`.github/dependabot.yml` は `github-actions` しか見ていなかった。

## 原因
- `package.json` を足したとき（PWA の作り直しの道具を入れたとき）、Dependabot の設定に `npm` を足す手順が無かった。onboarding.md の手順は「最初に入れるとき」だけで、あとから依存の置き場が増えたときを書いていなかった。

## なぜ見つからなかったか
- ひな形からのずれの検査（drift-check）は、Dependabot の設定があるかも、置き場ごとに見ているかも見ていなかった。

## 対策
- [x] 直す: tenbin の Dependabot に `npm`（`/`）を足し、Playwright を 1.64.1 にした（tenbin #64）
- [x] 見つける: `scripts/drift-check.mjs` が、`package.json`・`requirements.txt`・`pyproject.toml` のあるフォルダを Dependabot が見ていなければ週次まとめに出す。直す前の tenbin で出て、直したあと出ないことを確かめた（この PR）
