# 枠の無い古い sw.js をひな形に写すと、国旗や文字を保存する働きが黙って消えるところだった

- 種類: 動作
- 場所: `scripts/sync-template.mjs`（`swRegion`・`makeSw`）
- 気づいた人: 一括で直すスレッド（kokki-shuto #5 の QA が「FLAGS が見つからない」で落ちた）
- 影響: 手で配ったひな形の PR のうち 3 本（kokki-shuto・batsu-doko・usotsuki-roppo）で、sw.js が国旗の保存（FLAGS・addFlag）や文字の保存（FONT_CACHE）を失う形になっていた。kokki-shuto は QA が止め、残り 2 本は QA が通っていた。どれもマージ前に sw.js を元に戻したので、公開中のゲームには出ていない。

## 起きたこと
- ひな形の配布で、`game:begin`〜`game:end` の枠がまだ無い sw.js を、写す道具が自動でひな形に置きかえた。
- 置きかえるときに古い sw.js から拾うのは `const CACHE` と `const SHELL` の 2 行だけで、ほかの定数・関数は捨てていた。

## 原因
- `swRegion` が、古い sw.js に CACHE・SHELL のほかの働きがあるかを見ずに写していた（SHELL が `...ASSETS` を使う形だけは止めていた）。

## なぜ見つからなかったか
- 文字の保存（FONT_CACHE）は、電波の無いときの文字の見た目にしか出ず、ゲームの QA も sw の検査も見ていなかった。国旗は kokki-shuto の QA が見ていたので止まった。
- 写す道具の検査（`scripts/check-sw-check.mjs`）は CACHE と SHELL だけの古い sw.js しか試していなかった。

## 対策
- [x] 直す: 3 本の PR で sw.js（kokki-shuto は qa/sw-check.mjs も）を main のものに戻した。この 3 本の sw.js をひな形に寄せるのは、その働きを枠に入れてから手で行う
- [x] 防ぐ: `swRegion` は、枠の無い古い sw.js に CACHE・SHELL のほかの `const`・`let`・`var`・`function` があれば写さず、手で枠を作るよう知らせる（この PR）
- [x] 見つける: `scripts/check-sw-check.mjs` に、FLAGS・FONT_CACHE のある古い sw.js を写さないことと、枠のある sw.js はこれまでどおり写すことを足した（この PR）
- [x] 直す: これまでに枠を入れたゲームすべてで、枠を入れる前の sw.js に CACHE・SHELL のほかの定数が無かったことを確かめた（消えたものは無い）
