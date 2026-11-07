# 新作が、古いひな形の写しのまま公開された

- 種類: 手順の抜け
- 場所: `routines/game-dev.md` の「A. 新しいゲームを作る」と、共通部品 `game-qa`
- 気づいた人: 監督（2026-11-07、版10を配っているとき）
- 影響: saibanin-shikumi（裁判員のしくみ）が、引き継ぎの版9・古い sw.js・見やすさの設定のまま公開された。版10の直し（#252）が入っていない。記録が消えた報告は無い。

## 起きたこと
- 2026-11-07 14:06（UTC）に版10（#252）がマージされた。saibanin-shikumi の PR #1 は 14:18 にマージされたが、写しは版9のままだった。
- `node scripts/sync-template.mjs --check ../saibanin-shikumi` で、写した11のファイルがすべてひな形とちがった。

## 原因
- 新作は作り始めたときに写しを取る（ひな形か、既存のゲームから）。作っているあいだにひな形の版が上がっても、写し直す決まりが無かった。
- 手順 5 は「PR #1 を出す前に drift-check」だけで、drift-check は sw.js と版の行の一部しか見ない。写した全部のファイルを比べる `sync-template.mjs --check` は手順に無かった。

## なぜ見つからなかったか
- ゲームの QA（`game-qa`）は、写しがひな形と同じかを見ていなかった。ひな形とのちがいは週1の drift-check で、公開のあとにしか出ない。

## 対策
- [x] 直す: saibanin-shikumi を最新のひな形に写し直す（版11を配るときにいっしょに。このスレッド）
- [x] 防ぐ: 共通部品 `game-qa` に「ひな形の写し」の段を足した。PR で足したファイル（新作の PR #1 は全部）と、直接直した写し（transfer.js・qa/*.mjs・setup.sh）が main のひな形とちがうと落ちる（`sync-template.mjs --check --only=`）。中身だけの PR は止めない（この PR）
- [x] 防ぐ: `routines/game-dev.md` 手順 5・7 に、PR #1 の前と公開の前に `node scripts/sync-template.mjs --check ../<ゲーム>` を回し、ちがえば写す、を足した（この PR）
- [x] 見つける: 公開中のゲームのずれは、これまでどおり週1の `scripts/drift-check.mjs` が出す
