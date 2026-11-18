# 写して作った新作の共有画像に、写し元のゲームの場面が残っていた

- 種類: 検査の見逃し
- 場所: 各ゲームの `tools/make-og.cjs`（共有画像 og.png を作る）
- 気づいた人: CodeRabbit（baibai-kimari#1 のレビュー）
- 影響: baibai-kimari・irai-kimari の og.png（SNS に貼ったときの絵）に、消費者契約のきまりの「帰らせてくれず、契約した」の場面と、このゲームに無い選び肢が出ていた。どちらも公開前（PR の中）で直した。

## 起きたこと
- 新作は前のゲームを写して作る。shohisha-keiyaku → baibai-kimari → irai-kimari と写したとき、make-og.cjs の題と選び肢の一部だけ直し、問いの場面を直し忘れた。

## 原因
- 写したあとに直すファイルの一覧（routines/game-dev.md A 手順5）に、共有画像の場面が入っていなかった。

## なぜ見つからなかったか
- QA の「写し元の言葉が残っていない」は index.html・data.js・README だけを見ていて、make-og.cjs を見ていなかった。og.png の絵の中身はだれも見ていなかった。

## 対策
- [x] 見つける: 各ゲームの `qa/run.mjs` に「共有画像（tools/make-og.cjs）の正解は、このゲームの答えのどれか」を足し、写し元の言葉の検査にも make-og.cjs を入れた（baibai-kimari・irai-kimari・kashikari-kimari。次の新作は写すときに引きつぐ）
- [x] 防ぐ: routines/game-dev-detail.md A 手順5 に、共有画像の場面と選び肢もこのゲームの問題に直すことを書いた（この PR）
