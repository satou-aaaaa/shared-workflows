# ひな形の自動マージが Secret scan の結果を待たず、QA が通ればマージする形だった

- 種類: 検査の見逃し
- 場所: shared-workflows の template/.github/workflows/automerge.yml、mizu-mamoru
- 気づいた人: CodeRabbit（mizu-mamoru #1）
- 影響: ひな形から作ったゲームは、鍵がコミットに入って Secret scan が失敗・実行中でも、QA が先に通るとマージされる形だった。手元にある既存のゲームは scan / scan を入れていて、抜けていたのはひな形と、そこから作った mizu-mamoru #1（マージ前に直した）だけ。鍵が入ってマージされた例は無い。

## 起きたこと
- 2026-11-11 にひな形の automerge.yml の workflows に Secret scan を足した（2026-11-11-automerge-secret-scan-trigger.md）。require_checks は「Secret scan を入れたリポジトリは scan / scan も足す」というコメントだけで、qa / qa のままだった。
- ひな形は secret-scan.yml も配るので、ひな形から作ると必ず「Secret scan はあるのに必須ではない」形になる。
- 2026-11-17 mizu-mamoru #1 で CodeRabbit が指摘した。

## 原因
- ひな形が「足すこと」をコメントで頼み、値に入れていなかった。足すのを忘れても何も落ちない。
- drift-check の automerge:scan は「scan / scan があるのに workflows に Secret scan が無い」向きだけを見て、逆向きを見ていなかった。

## なぜ見つからなかったか
- 既存のゲームは前の形から写していて scan / scan があり、ひな形から作った新作だけがこの形になる。新作の PR #1 を読むのは CodeRabbit だけだった。

## 対策
- [x] 直す: mizu-mamoru #1 の require_checks に scan / scan を足した（mizu-mamoru #1）
- [x] 防ぐ: ひな形の require_checks に scan / scan を最初から入れ、外すときに消す書き方にした（この PR）
- [x] 見つける: drift-check に automerge:scan-required（secret-scan.yml と workflows の Secret scan があるのに require_checks に scan / scan が無い）を足した（`scripts/drift-check.mjs`、この PR）
