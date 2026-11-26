# 足した画面の検査が一度も動かないまま配られかけた

- 種類: 検査の見逃し
- 場所: `template/qa/core-check.mjs`（game-core 版5の「？ 遊び方」と不具合の帯の検査。#637）
- 気づいた人: Claude（共有の作業のスレッドが、main のひな形を震度よみに写して QA を回し、落ちるのを見つけた）
- 影響: 「『不具合を知らせる』は感想フォーム（不具合・最後のエラー入り）のリンク」が、checkCore を呼ぶゲームで必ず落ちる形だった。Template sync が配る前に直した（#642）ので、遊ぶ人には届いていない。

## 起きたこと
- 2026-11-27、#637 で core.js（版5）と core-check.mjs に検査を足し、手元の4本（著作権のきほん・どこの裁判所？・あみだ配達・対戦表づくり）に写して QA が全部通ったのを見てマージした。
- 足した検査は、リンクの中のエラーの文を `decodeURIComponent` で戻して探していた。URLSearchParams は空白を `+` にするので、「core-check のわざと」が見つからなかった。

## 原因
- 試した4本は、qa/run.mjs から checkCore（core-check.mjs）を呼んでいないゲームだった。足した検査は一度も動いておらず、「QA が全部通った」は検査が通った証拠にならなかった。
- はじめての案内を入れていないゲーム（first: false）では、checkCore が最初の段で戻り、そのあとの検査を全部飛ばしていた。

## なぜ見つからなかったか
- core-check.mjs そのものを動かす検査が無かった。ひな形の検査は、ゲームに写して初めて動いた。

## 対策
- [x] 直す: リンクのエラーの文を `new URL(href).searchParams` で読む（#642）
- [x] 防ぐ: `scripts/check-core-qa.mjs`（Selftest）が、game-core を入れた作り物のゲームで core-check を回し、正しい画面で全部通ること・「？」や帯を消した画面で落ちることを見る（この PR）
- [x] 防ぐ: checkCore の first: false でも、「？ 遊び方」と不具合の帯の検査は飛ばさない（`template/qa/core-check.mjs`。この PR）
- [x] 防ぐ: `routines/game-dev-detail.md` の「全ゲームへ写す前」に、core-check.mjs を変えたら checkCore を呼ぶゲーム（例 shindo-yomi）で回すと書いた（この PR）
