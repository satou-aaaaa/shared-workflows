# 新作を一覧に足す PR どうしが、毎回ぶつかっていた

- 種類: 手順の抜け
- 場所: shared-workflows のリポジトリの一覧（週次まとめ・成績表・CI 時間・ひな形のずれの検査・README・手順書）
- 気づいた人: コーディネーター（新作を並行で作るスレッドの PR が止まっていた）
- 影響: 2026-11-07 に新作を足す #184 が #181・#183・#185 とぶつかり、マージのたびに作り直しが要った。#187 も同じ所を直していた。一覧の足し忘れも出ていた（kengen-check は README と手順書にはあるのに、ワークフローの一覧から抜けていて、週次まとめ・成績表・CI 時間・ずれの検査に出ていなかった）。遊ぶ人への影響は無い。

## 起きたこと
- 新作を1本足すたびに、ワークフロー3つ（weekly-summary・scorecard・ci-time-report）の `REPOS`、`scripts/drift-check.mjs` の `REPOS`、README の冒頭、game-dev.md の一覧、supervisor.md の2か所、repo-patrol.md、project-practices.md の表を直していた。
- 名前を並べた行はどれも1行で、末尾に足すので、並行の PR は必ず同じ行を書きかえる。1本マージされると残りが全部ぶつかった。
- 一覧が多いので足し忘れも出た（kengen-check、2026-11-05 の CI time report）。

## 原因
- 「全リポジトリ」の一覧の正が無く、同じ名前の並びが7か所に書かれていた。2026-11-05 の対策（incidents/2026-11-05-ci-time-report-missing-repos.md）は、ずれを Lint で見つける仕組みで、一覧を1つにはしなかった。
- 足す場所が末尾（1行の終わり・表の最後）に決まっていたので、並行の PR が同じ所を書きかえた。
- GitHub の PR は `.gitattributes` の `merge=union` を見ないので、ぶつかりを Git の設定で消すことはできない（[GitHub Community #9288](https://github.com/orgs/community/discussions/9288) で要望のまま）。

## なぜ見つからなかったか
- 新作を1本ずつ作っていたあいだは、PR が重ならなかった。2026-11-07 に並行で作り始めて初めて重なった。
- Lint の一覧の検査は CI time report の `REPOS` だけを drift-check と比べていて、README・手順書・ほかのワークフローの抜けは見ていなかった。

## 対策
- [x] 直す: 一覧を `repos.txt`（1行に「名前 種類」、名前の ABC 順）にまとめ、ワークフロー3つと drift-check・next-actions は `scripts/repos.mjs` で読むようにした。README・supervisor.md・pr.md・game-dev.md は repos.txt を指すだけにし、repo-patrol.md のゲームは1つの決まりと「特に照らすこと」（名前の順）にまとめた。開いていた #184・#187 の chikei-ate・okane-kihon と、抜けていた kengen-check も入れた（この PR）
- [x] 防ぐ: 足す場所を「名前の ABC 順の位置」にした（repos.txt・project-practices.md の「ゲーム」の表・repo-patrol.md）。並行の PR はちがう行に入るので、となり合う名前でなければぶつからない。手順は game-dev.md A の手順8と onboarding.md 手順3（この PR）
- [x] 防ぐ: `scripts/check-repo-lists.mjs`（Lint・check.sh）が、repos.txt の形と並び、ほかのファイルに名前を6つ以上並べた行、repos.txt の game と project-practices.md の「ゲーム」の表の食い違い・並びを落とす（この PR）
- [x] 見つける: `scripts/drift-check.mjs` が、公開リポジトリなのに repos.txt に無いもの（新作の足し忘れ）を週次まとめの「ひな形からのずれ」に出す（この PR）
- [ ] 弱める: incidents/README.md の「一覧」も新しい順で先頭に足すので、同じ日の記録の PR どうしがぶつかる。一覧をファイルから作る形にするか決める（担当: ルーティンとスキルの定期見直し、期限: 2026-11-14）
