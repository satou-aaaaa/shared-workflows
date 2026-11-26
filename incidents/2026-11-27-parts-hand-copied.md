# カレンダー・実績の画面と決まった乱数を、多くのゲームが手で写して持っていた

- 種類: 検査の見逃し
- 場所: ゲーム210本の index.html（カレンダー cal 192本・実績 achView 190本ほか）と data.js（決まった乱数 rng・seedOf・shuffle・pickN・ri 135本）
- 気づいた人: Claude（satou さんの「他に、共通化されていないパーツはありますか？」で全ゲームを数えた）
- 影響: 不具合はまだ出ていないが、cal は32通り・achView は16通りに分かれ、直すには1本ずつ手で直す必要があった。決まった乱数は変わるとその日の問題が人ごとに変わるのに、同じ数が出るかを見る検査が無かった。

## 起きたこと
- 2026-11-27、210本の関数を名前と中身で数えた（共有フォルダ common-parts/not-shared-yet-2026-11-27.md）。多数派と1字も同じ写しが cal 125本・achView 172本・rng 130本などあった。

## 原因
- 新作は近いゲームを写して作り、画面の関数（カレンダー・実績）と乱数は各ゲームの手書きのまま残っていた。ひな形（template/）で配る仕組みは、ファイル1つ（transfer.js など）か、決まった枠（core・store）にしか無かった。

## なぜ見つからなかったか
- drift-check と Common check は、共通部品が入っているか・不具合の形があるかを見るだけで、同じ関数が何本で手書きになっているかは数えていなかった。

## 対策
- [x] 直す: `template/parts/`（index：cal・lateDays・playedDays・achView・nextAch・achGot、data：rng・seedOf・shuffle・pickN・ri）に1か所だけ置き、`scripts/sync-template.mjs` の migrateParts が、1字も同じ関数に part:<名前>:begin〜end の印を付け、以後は印のあいだをひな形どおりに写す（中身は変えない。この PR）
- [x] 防ぐ: `scripts/check-parts.mjs`（check.sh・Lint）が、部品が読める・決まった乱数が今までと同じ数を出す・印を外すと元どおり・形のちがう関数は触らない、を確かめる。bootstrap/checks.md に1行（この PR）
- [x] 見つける: 新作は近いゲームを写すので、印ごと写り、以後もひな形に合わせて直る。形のちがう写し（cal 67本など）はゲームごとの手直しのときに印の形へ寄せる（この PR）
