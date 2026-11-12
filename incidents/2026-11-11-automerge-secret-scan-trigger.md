# ひな形の自動マージが、Secret scan が後に終わったときに判定し直さなかった

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows の `template/.github/workflows/automerge.yml`（`on.workflow_run.workflows`）
- 気づいた人: CodeRabbit（satou-aaaaa/yarikuri-shotengai #1）
- 影響: ひな形から作った yarikuri-shotengai だけ。QA が Secret scan より先に終わると、自動マージは scan 待ちで止まり、あとで Secret scan が通っても判定し直さない。その PR は全部 ✅ でもマージされずに残る。#1 は `rules.js` を変える PR で、もともと手でマージする PR だったので、実際には困っていない。ほかのゲームは前から `[QA, Secret scan]` で、当てはまらない。

## 起きたこと
- ひな形の `automerge.yml` は `require_checks` に `scan / scan` を入れ、`secret-scan.yml` も一緒に配っている。
- ところが `workflows` は `[QA, Setup check]` のままで、「Secret scan を入れたら足す」というコメントだけがあった。

## 原因
- 版10で Setup check を足したとき、Secret scan は「入れたリポジトリだけ足す」ものとして、コメントでの手作業にした。のちにひな形が Secret scan を最初から配る形になっても、`workflows` の行は直さなかった。
- 手で直す前提の行で、直したかを見る検査が無かった。

## なぜ見つからなかったか
- drift-check は「必須チェックに scan / scan があるか」は見ていたが、自動マージがどのワークフローの終わりで動くかは見ていなかった。
- 新作は `rules.js`・`data.js` などを `hold_paths` で手でマージすることが多く、自動マージが止まっても気づきにくい。

## 対策
- [x] 直す: yarikuri-shotengai の `automerge.yml` を `[QA, Setup check, Secret scan]` にした（yarikuri-shotengai #1）
- [x] 直す: ひな形の `workflows` を `[QA, Setup check, Secret scan]` にし、コメントを「外したら消す」に替えた（この PR）
- [x] 防ぐ: drift-check に `automerge:scan` を足した。`require_checks` に `scan / scan` があるのに `workflows` に `Secret scan` が無いと知らせる（この PR。直す前の yarikuri-shotengai で出ること、今の全リポジトリで0件のことを確かめた）
