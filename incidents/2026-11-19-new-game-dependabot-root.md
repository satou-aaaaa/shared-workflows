# 新作を new-game.mjs で始めると、Dependabot の npm がリポジトリの根（/）を見ていた

- 種類: 手順の抜け
- 場所: `scripts/new-game.mjs`（新作をひな形から始める道具）
- 気づいた人: 新作「献血できる？」（kenketsu-dekiru #1）を作った毎日の新作の回
- 影響: kenketsu-dekiru #1 の `.github/dependabot.yml` が `directory: "/"` のままだった（PR を出す前に直した）。遊ぶ人には影響なし。そのままなら qa/ の依存の更新が来なかった。

## 起きたこと
- `node scripts/new-game.mjs ../kenketsu-dekiru` が `template/.github/dependabot.yml` をそのまま写した。ひな形はゲーム以外のリポジトリにも使うので、npm の `directory` は `"/"`。
- ゲームの `package.json` は `qa/` にあるので、`drift-check.mjs` が「qa/package.json の依存を Dependabot が見ていない」と出した。

## 原因
- new-game.mjs の「このあと書くもの」にも、写すときの書きかえにも、Dependabot の `directory` が無かった。

## なぜ見つからなかったか
- new-game.mjs の検査（`check-game-wip.mjs`）は「写せたか」だけを見ていて、写したあとの中身がゲームに合うかを見ていなかった。drift-check では PR #1 の前に見つかった（手順どおり回したので公開には出ていない）。

## 対策
- [x] 直す: kenketsu-dekiru #1 の `dependabot.yml` を `/qa` にした
- [x] 防ぐ: `new-game.mjs` が写すときに npm の `directory` を `"/qa"` に書きかえる（Actions の `"/"` は変えない）（この PR）
- [x] 見つける: `check-game-wip.mjs` が、写した `dependabot.yml` の npm が `/qa`・Actions が `/` かを見る（直す前は落ちることを確かめた）（この PR）
