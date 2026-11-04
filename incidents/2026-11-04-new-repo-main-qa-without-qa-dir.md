# 新しいゲーム3本で、main の QA が初めから赤になり「CI失敗」の Issue が開いた

- 種類: 手順の抜け
- 場所: kasane-zome・rosen-hitofude・seiza-tsunagi（新しいリポジトリの受け入れ）
- 気づいた人: 全リポジトリ巡回
- 影響: 3つのリポジトリで main の QA が失敗し、「CI失敗: QA（main）」の Issue が3件開いた。遊ぶ人への影響は無い（Pages はまだ公開前）。

## 起きたこと
- 2026-11-03 リポジトリを作ったとき、main に「はじめの形」として README と `.github/`（QA などの workflows）を直接置き、ゲームの本体と `qa/` は PR #1 に分けた。
- main への push で QA が動き、`qa/` が無いので落ちた。`ci-failure-issue.yml` が Issue を開いた。
- 2026-11-04 巡回が見つけ、PR #1 をマージして main に `qa/` が入り、緑に戻った。

## 原因
- `routines/onboarding.md` の手順2は「workflows をコピーして PR で入れる」とだけ書き、main に直接置くはじめの commit に何を入れてよいかを書いていなかった。workflows だけ先に main へ入れると、呼ばれる検査のスクリプトがまだ無い。

## なぜ見つからなかったか
- はじめの commit は PR を通らないので、CI の結果を見る場面が無かった。PR #1 の CI は `qa/` を含むので緑で、main だけが赤だった。

## 対策
- [x] 直す: 3つのリポジトリの PR #1 をマージし、main に `qa/` を入れた（rosen-hitofude #1・seiza-tsunagi #1・kasane-zome #1）
- [x] 防ぐ: `routines/onboarding.md` 手順2に「main に直接置くはじめの commit は README だけ。`.github/workflows/` は、それが呼ぶ `qa/` などと同じ PR で入れる」を足した（この PR）
- [x] 見つける: `ci-failure-issue.yml` が main の失敗で Issue を開き、巡回が拾う仕組みが今回そのまま働いた（[repo-patrol](../routines/repo-patrol.md)）
