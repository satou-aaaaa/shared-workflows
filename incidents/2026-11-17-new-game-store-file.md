# 新作を new-game.mjs で始めると、使われない store/store.js がゲームに入っていた

- 種類: 手順の抜け
- 場所: `scripts/new-game.mjs`（新作をひな形から始める道具）
- 気づいた人: 新作「切手いくら？」（kitte-ikura #1）を作ったスレッド
- 影響: kitte-ikura #1 に `store/store.js` が入った（公開前に消した）。遊ぶ人には影響なし。同じ夜に並行で作った新作にも入るおそれがあった。

## 起きたこと
- `node scripts/new-game.mjs ../kitte-ikura` が `template/` の全部のファイルを写し、`template/store/store.js` もゲームの `store/store.js` として置いた。
- 保存の共通部品は index.html の `<!-- store:begin -->`〜`end` に `sync-template.mjs` が写すもので、ファイルは読まれない。
- 道具の「このあと書くもの」に、印を置いて load() を GameStore.load にすることが無く、drift-check の `store:load` で初めて分かった。

## 原因
- store.js（2026-11-17 #355）を `template/` に足したとき、new-game.mjs の「全部写す」に除外が無かった。

## なぜ見つからなかったか
- drift-check はファイルが余計にあることを見ていなかった。new-game.mjs は「写せたか」だけを出し、写してはいけない物を見ていなかった。

## 対策
- [x] 直す: kitte-ikura #1 から `store/store.js` を消した
- [x] 防ぐ: `new-game.mjs` に写さない物の一覧 `SKIP`（`store/`）を足し、「このあと書くもの」に store の印と GameStore.load を足した（この PR）
- [x] 見つける: `drift-check.mjs` の `store:file` が、ゲームに `store/store.js` があれば出す（この PR）
