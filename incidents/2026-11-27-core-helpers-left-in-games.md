# Core にある小部品を、ほとんどのゲームが手で写したまま持っていた

- 種類: 検査の見逃し
- 場所: ゲーム210本の index.html（toast 207本・untilNext 205本・buzz 197本・esc 169本・num 102本が自前）
- 気づいた人: Claude（satou さんの「他に、共通化されていないパーツはありますか？」で全ゲームを数えた）
- 影響: 不具合はまだ出ていないが、Core.toast・Core.untilNext を使うゲームは0本で、toast は17通り・buzz は13通り・num は16通りに分かれていた。Core の直し（読み上げ・重ねて出さない・「動きを減らす」）が届かない。

## 起きたこと
- 2026-11-27、210本の関数を名前と中身で数えた（一覧は共有フォルダ common-parts/not-shared-yet-2026-11-27.md）。
- 2026-11-22 の game-core への切り替え（migrateCore）のあとも、上の5つは各ゲームの手書きのままだった。

## 原因
- migrateCore（CORE_SWAPS）が替えたのは、不具合のある古い形だけだった。不具合の無い手書きの写しは「直す理由が無い」として残した。
- 替える形は1文字まで同じものだけで、行のあとの説明（// …）がちがうと替わらなかった（num は説明だけちがう形が10通り以上）。

## なぜ見つからなかったか
- drift-check の core:* は不具合のある形だけを探し、Core にあるのに手で持っている写しそのものは数えていなかった。

## 対策
- [x] 直す: `scripts/sync-template.mjs` の CORE_LINES が、決まった形の toast・untilNext・buzz・esc・num を行ごと Core.* に替える（説明の // はあってもよい）。Template sync が全ゲームへ配る（この PR。替わるのは204本）
- [x] 防ぐ: `scripts/check-core.mjs` が、手書きの5つが Core.* に替わること・形のちがう行は触らないこと・何度かけても同じことを確かめる（この PR）
- [x] 見つける: drift-check の core:copy（`scripts/game-patterns.mjs` の coreCopies）が、Core にある小部品を手で持つゲームを毎週出す。形がちがって替えられなかった25本はここに出るので、ゲームごとの PR で替える（この PR）
