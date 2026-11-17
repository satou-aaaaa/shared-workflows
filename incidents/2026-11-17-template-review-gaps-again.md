# 新作2本の PR #1 のレビューで、ひな形の写しにまた同じ種類の指摘がまとめて出た（保存の失敗のあとの上書き・ロックとタブの競合）

- 種類: 検査の見逃し
- 場所: shared-workflows の template/（transfer.js・depth.js・a11y/a11y.html・scripts/setup.sh・.github/workflows/automerge.yml）と共通部品（automerge・post-deploy）
- 気づいた人: CodeRabbit（hatsuden-kurabe #1・nenkin-shikumi #1 のレビュー）
- 影響: 遊ぶ人の記録が消えた・公開が壊れたという報告は無い。起こりえたのは、保存に失敗したあとに覚えた復習の項目が戻る・見やすさの設定が1つ戻る・別のタブの取り込みで手元にしかない記録が消える・npm ci が2つ同時に走る・壊れた版が last-good になる・Dependabot の major 更新が自動でマージされる、など。

## 起きたこと
- 2026-11-17、新作2本の PR #1 で、各ゲームが写しているひな形の部分に12件の指摘が出た（ゲームの側では「写しなので直さない」決まりのため直していない）。
- 保存の失敗のあとの上書き：depth.js は保存できないあいだに「覚えた」で消した項目を、保存済みの分と合わせるときに戻した。a11y.html は保存できないあいだの2つ目の変更で、読み直した古い値が1つ目の変更を消した。transfer.js は、控えに戻すのが途中で止まった道の1つで印（hk-prevfp:）を残さず、あとで遊んだ分を控えに残さなかった。
- タブ・プロセスの競合：transfer.js は入れ替えの番号を進める前に控えにする記録を読んだ・番号を確かめてから書くまでのあいだに入れ替わると気づかなかった・保存に失敗したタブも自動で読み直して手元の記録を消した。setup.sh は古いロックを外すときに自分の名前へ移したので、移したあいだに別の setup.sh がロックを取れた。
- ほか：ひな形の自動マージが main の Secret scan を起こさない（失敗の Issue が古いまま）・共通部品の Auto merge が Dependabot の major 更新を見ない・Post-deploy check が古い版の再実行で今の公開を開き、古い版を last-good にした・端末の「視差効果を減らす」を開いたあとに変えても効かない。

## 原因
- 保存の失敗のあとを「書けなかった分を開いているあいだ覚える」とだけ決め、覚えた分と保存済みの分を合わせるときに、消した・変えた分を保存済みの古い値で上書きしないかを考えていなかった（足すことしか考えない合わせ方）。
- タブやプロセスをまたぐ順番を、1つのタブ・1つのプロセスで順に動く前提で書いていた。localStorage にはタブをまたぐ鍵が無く（HTML の仕様）、確かめてから書くまでのあいだは閉じられない。mkdir のロックも、外す・移す操作のあいだは誰でも取れる。
- 検査（check-transfer.mjs・depth-check.mjs・check-setup-template.sh・a11y.mjs）は、前に起きた形だけを再現していて、保存に失敗したまま消す・続けて2つ変える・外すのと取るのが重なる、を見ていなかった。

## なぜ見つからなかったか
- ひな形の検査は「1回失敗して、次に成功する」形だけを作っていて、「失敗のあいだに消す・2回変える」形や、ほかのタブ・プロセスが途中に割り込む形を作っていなかった。
- 共通部品の automerge・post-deploy は、2つのマージの道・再実行された古い実行を、検査で作っていなかった。

## 対策
- [x] 直す: ひな形を直した（引き継ぎの版13・深さの版4・見やすさの設定 v7・setup.sh 版13・ひな形の automerge.yml の dispatch に secret-scan.yml）。共通部品の Auto merge が Dependabot の major 更新をマージしない、Post-deploy check が main の先頭の版のときだけ last-good を覚える（この PR）。全ゲームへの配布は別に行う
- [x] 見つける: 保存の失敗のあとの上書きを、`template/qa/depth-check.mjs` の nosave-del（失敗のまま消した項目が戻らない・覚えた数を重ねない）、`scripts/check-a11y-block.mjs`（Selftest。保存できないあいだに続けて2つ変える・開いたあとに端末の設定を変える）と `template/qa/a11y.mjs`（各ゲームの QA）、`scripts/check-transfer.mjs`（版13：止まったときの印・番号を進めたあとの控え・保存に失敗したタブを読み直さない・保存と入れ替えの重なりの印）で見る。直す前のひな形で落ちることを確かめた（この PR）
- [x] 見つける: ロックの競合を、`scripts/check-setup-template.sh` の 20（ロックを mv で移さない・外す人の札があるあいだは消さない・古いロックへ4つ同時に動かしても npm ci が重ならない）で見る。直す前の setup.sh で落ちることを確かめた（この PR）
- [x] 見つける: `scripts/check-template-watch.mjs`（Lint）が、自動マージのきっかけで main でも動くワークフローを dispatch で起こすか・Dependabot の major をどちらのマージの道でも外すか・last-good を書く前に origin/main と比べるかを見る。写した先は `scripts/drift-check.mjs` の automerge:scan-dispatch が見る（この PR）
- [x] 防ぐ: 同じ種類（保存の失敗のあと・タブとプロセスをまたぐ順番）の指摘が3回目なので、ひな形の検査に「失敗のあいだに2回操作する」「途中に別のタブ・プロセスが割り込む」形を、直すたびに1つずつ足す（`template/qa/depth-check.mjs`・`scripts/check-transfer.mjs`・`scripts/check-setup-template.sh` の見出しに書いた。この PR）
