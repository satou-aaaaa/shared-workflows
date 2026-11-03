# shared-workflows の Lint が、手元で分かる指摘で push のあとに落ち続けた

- 種類: 手順の抜け
- 場所: shared-workflows の Lint（actionlint・bootstrap・zizmor・routines）
- 気づいた人: satou さん（CI 失敗の一覧 10/20〜11/3）
- 影響: 10/20〜10/28 に PR で5回失敗。直す push が1〜2回ずつ増えた。

## 起きたこと
- 10/20・10/21 routines: incidents の対策の書き方（`- [ ] …は「- [x] 防ぐ: …」の形にする`）。
- 10/22 bootstrap と zizmor: `bootstrap/checks.md に watch-failures.yml が載っていない`、`workflow_run is almost always used insecurely`。
- 10/28 actionlint（2回）: `SC2153:info … Possible misspelling: CONCLUSION may not be assigned`。
- どれも `bash scripts/check.sh` を回せば push の前に分かるものだった。

## 原因
- `scripts/check.sh`（CI の Lint と同じ中身）はあったが、回すかどうかは人と AI に任されていて、push の前に自動で回る仕組みが無かった。
- クラウドのセッションには shellcheck が無く、`scripts/setup.sh` は「入っているか」を確かめるだけだったので、準備の段階で止まり、check.sh を回せなかった（2026-11-03 にこのセッションでも `✗ shellcheck が要る` で止まることを確かめた）。
- 手元と CI で shellcheck の版がそろっていなかった（CI は機械に入っている版）。

## なぜ見つからなかったか
- 手順書（AGENTS.md）に書いてあるだけの「push の前に回す」は、回されなかったことが CI で落ちるまで分からない。

## 対策
- [x] 直す: `scripts/setup.sh` が shellcheck 0.11.0 を版とチェックサムを決めて `.tools/bin` に入れるようにした。クラウドのセッションでも準備と check.sh が通る（この PR）
- [x] 防ぐ: `scripts/setup.sh` が git の pre-push フック（`.githooks/pre-push`）を登録し、push の前に `scripts/check.sh` を自動で回して、通らなければ push を止める。わざと壊したワークフローで push が止まることを確かめた（この PR）
- [x] 防ぐ: CI の Lint も setup.sh が入れた同じ版の shellcheck を使う（`.github/workflows/lint.yml`、この PR）
- [x] 防ぐ: AGENTS.md の「push する前の確認」に、フックが止めたら `--no-verify` で飛ばさず直すと書いた（この PR）
