# 画面の切り替え（Core.screens）の「# の名前で関数を呼ぶ」所を、配ったあとのゲームの CodeQL が見つけた

- 種類: 検査の見逃し
- 場所: `template/core/core.js`・`template/screens/screens.js`（Core.screens.route）、Template sync の PR（bousai-handan #20 など）
- 気づいた人: CI（ゲームの CodeQL。2026-11-23 Template sync の PR）
- 影響: 全ゲームへ写す PR で CodeQL が「user-controlled な名前でメソッドを呼ぶ」を出した。#constructor のような # で開くと、画面の関数でなく Object の関数を呼べた（画面は変わらず、害は小さい）。

## 起きたこと
- shared-workflows #591 で、# の名前から画面の関数を `views[名前]` で引いて呼ぶ形を入れ、Template sync で全ゲームへ配った。
- ゲームの PR の CodeQL（js/unvalidated-dynamic-method-call）が初めて指摘した。

## 原因
- # から来た名前を、ふつうのオブジェクトのキーとして引いていた（Object.prototype の名前も当たる）。

## なぜ見つからなかったか
- shared-workflows 自身では CodeQL を回しておらず、ひな形の JavaScript は配ったあとのゲームで初めて CodeQL にかかっていた。
- check-screens.mjs は「知らない # はホーム」を見ていたが、Object の名前（constructor など）を試していなかった。

## 対策
- [x] 直す: 画面の表を Map にした（`views.get`）。両方の部品で同じ中身。この PR
- [x] 見つける: `.github/workflows/codeql-self.yml`。template/・scripts/ を変える PR で CodeQL を回し、見つかれば止める（配る前に分かる）。この PR
- [x] 防ぐ: `scripts/check-screens.mjs` に「#constructor でも Object の関数を呼ばずにホームへ」を足した。この PR
