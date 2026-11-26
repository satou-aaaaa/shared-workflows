# Ko-fi 応援の一文を、200本のゲームが手で写して持っていた

- 種類: 検査の見逃し
- 場所: ゲーム201本の index.html の結果の画面（showKofi の一文）と、196本のフッターの「Ko-fi で応援」
- 気づいた人: Claude（satou さんの「他に、共通化されていないパーツはありますか？」で全ゲームを数えた）
- 影響: 不具合はまだ出ていないが、一文は「役に立ったら」「楽しめたら」と、続きのことばで8通り、class の有無で分かれていた。応援先や「任意・遊ぶのはずっと無料」の説明を直すには200本を1本ずつ直す必要があった。

## 起きたこと
- 2026-11-27、210本の結果の画面を数えた（共有フォルダ common-parts/not-shared-yet-2026-11-27.md）。応援先の URL と一文が各ゲームに手書きで入っていた。

## 原因
- routines/game-dev.md は「結果の画面に1行だけ」と決めていたが、その1行を出す部品が無く、新作は近いゲームの一文を写していた。

## なぜ見つからなかったか
- 共通部品の点検（Common check・drift-check）は、部品が入っているかを見るだけで、部品にすべき同じ文が各ゲームにあるかは見ていなかった。

## 対策
- [x] 直す: game-core に `Core.kofi(lead, what)` と `Core.KOFI` を足した（版7）。`scripts/sync-template.mjs` が一文を `Core.kofi("…", "…")`（ゲームのことばのまま）、フッターの応援先を `Core.KOFI` に替え、Template sync が配る（この PR。替わるのは200本・フッター193本）
- [x] 防ぐ: `scripts/check-core.mjs` が、Core.kofi がもとの一文と同じ形を返すこと・替えたあとに ko-fi.com の手書きが残らないことを確かめる。routines/game-dev-detail.md の F5 に「一文は Core.kofi で、手で書かない」を足した（この PR）
- [x] 見つける: drift-check の core:copy（`scripts/game-patterns.mjs` の coreCopies）が、Ko-fi の一文を手で持つゲームを毎週出す（この PR）
