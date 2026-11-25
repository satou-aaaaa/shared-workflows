# main とぶつかった PR が、CI は緑のまま3週間（tenbin #72）・5日（shared-workflows #548）止まっていた

- 種類: 見回りの見落とし
- 場所: satou-aaaaa/tenbin（PR #72）・satou-aaaaa/shared-workflows（PR #548）・scripts/next-actions.mjs・監督の巡回
- 気づいた人: 監督の巡回（2026-11-25）
- 影響: tenbin の「アプリ本体の免責5行が抜けたら落とす」検査が 11/4〜25 の3週間 main に入らず、その間に本体を作り直していれば抜けても CI が通った。#548 の記録（ベストの首の開き）は 11/20〜25 一覧に載らなかった。

## 起きたこと
- 11/4、tenbin #72 を出した。CI は緑だったが、出したスレッドはマージせずに終わった。
- 11/6〜7 に tenbin の main の歴史が作り直され、#72 の枝は今の main と関係のない歴史になった（`git merge` が `refusing to merge unrelated histories`）。GitHub の画面では「ぶつかりあり（dirty）」になり、自動マージも手のマージもできなくなった。
- 11/20、shared-workflows #548 を出した。そのあと別の記録の PR が incidents/README.md の一覧の同じ先頭に行を足して先に入り、#548 もぶつかった。
- 週次まとめ（11/23 #586）は #72 を「18日動きの無い PR → CI が緑ならマージ」として16件の12番目あたりに出したが、だれも動かなかった。

## 原因
- `next-actions.mjs` は PR の `mergeable_state` を見ておらず、ぶつかった PR も「緑ならマージ」と出していた。マージできない PR に「マージ」と書いていたので、読んだ人は後回しにできた。
- 監督の手順5は「CI緑のまま3日以上マージされない PR は担当に促す（同じ PR で2回まで）」で、担当がもう終わっているときに次の手が決まっていなかった。CI の赤なら「コーディネーターに直すスレッドを頼む」まであるのに、ぶつかりには無かった。
- #548 のぶつかりの元は、incidents/README.md の一覧を新しい順で先頭に足すこと（2026-11-07-repo-list-conflicts.md の残りの対策と同じ）。

## なぜ見つからなかったか
- PR の CI は緑のままなので、CI の赤を見る仕組み（ci-failure Issue・監督の手順3）には一度も出なかった。
- 週次まとめには出たが、急ぎの順が「動きの無い PR」（4）で、再発防止の行と同じ所に埋もれた。

## 対策
- [x] 直す: tenbin #72 の中身（検査 3d2）を今の main に載せ直し tenbin #134 に、#548 は main の一覧に合わせて解いてこの PR に入れた。古い PR は理由を書いて閉じた
- [x] 見つける: `scripts/next-actions.mjs` が `mergeable_state` が `dirty` の PR を「main とぶつかって止まった PR」として、CI 赤と同じ急ぎ（3）で、日数と直し方（pr.md 4）付きで出す（この PR）
- [x] 防ぐ: `routines/supervisor.md` 手順5に、ぶつかった PR は1日たったら作った担当に取り込みを頼み、担当が終わっていればその回のうちにコーディネーターへ直すスレッドを頼む、を足した（この PR）
- [x] 防ぐ: `routines/pr.md` 4 に、`unrelated histories` のときは今の main から入れ直して新しい PR にし、古い PR を閉じる、を足した（この PR）
