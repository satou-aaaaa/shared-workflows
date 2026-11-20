# Create repo の直後の空のリポジトリを、game-wip が「公開済み」と読んだ

- 種類: 動作
- 場所: shared-workflows `scripts/game-wip.mjs`（毎日の新作の回 game-factory.md）
- 気づいた人: 毎日の新作の回（2026-11-20）
- 影響: 「題材:」Issue #523（kaminari-mamoru）は README だけで PR も無いのに、game-wip の見方では「公開済み：Issue を completed で閉じる」になる状態だった。この回は手で has_pages と中身を確かめて PR #1 を作ったので、作らずに閉じたゲームは無い。

## 起きたこと
- 2026-11-19 の回が Actions「Create repo」で kaminari-mamoru を作った。Create repo は README だけの main で Pages も入れる。
- 2026-11-20 の回でリポジトリを見ると `has_pages: true`・開いている PR 0・ブランチは main だけ。`nextStep` は「PR が無く Pages がある」を公開済みと読む。

## 原因
- `game-wip.mjs` が「公開済み」を `has_pages` だけで決めていた。Create repo が Pages を先に入れるようになってから、作りかけの最初の日はいつも同じ形になる。

## なぜ見つからなかったか
- `check-game-wip.mjs` の答えは、Pages のあるリポジトリを試していなかった（どれも has_pages: false）。

## 対策
- [x] 直す: kaminari-mamoru の PR #1 を出した（satou-aaaaa/kaminari-mamoru#1）
- [x] 防ぐ: `scripts/game-wip.mjs` は、PR が無く Pages があるとき、main に index.html があるかも見て、あるときだけ公開済みにする（この PR）
- [x] 見つける: `scripts/check-game-wip.mjs` に「Pages だけ・index.html 無し」と「index.html あり」を足した。直す前の game-wip.mjs では落ちることを確かめた（この PR）
