# main の CI が7件赤：コードは壊れていないのに、1回だけ測る・1回だけ見る検査が揺れで落ちた

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows の Lint（`scripts/check-setup-template.sh` 検査17）・ゲームの QA（`template/qa/a11y.mjs`）・Auto merge（`.github/workflows/automerge.yml`）・Lighthouse（`.github/workflows/lighthouse.yml`）
- 気づいた人: 見回り（監督）
- 影響: 2026-11-23 に main の CI 失敗の Issue が7件立った（shared-workflows #594、shotokuzei-ikura #10・kokkai-nissu #10・kimari-sagashi #28・tsuki-katachi #12、kenko-minuki #26、toan-kumitate #16）。遊ぶ人に見える不具合は無い。どれも次の実行は緑。

## 起きたこと
- 08:03〜08:32（UTC）に、ひな形を写した4本のゲームの QA が「ホームに見やすさの入口が二重に出ていない」だけで落ちた。同じコミットに近い次の写しでは通った。
- 08:13 shared-workflows の Lint が、setup.sh を2つ同時に動かす検査17で落ちた（npm ci の EEXIST）。11/11・11/22 に続き3回目。時刻つきの記録では、2つとも `mkdir app/.setup-lock` が通り（`got=1`）、両方が npm ci を始めていた。ロックを外す行は無かった。
- 08:15 kenko-minuki の Auto merge が、gh api の返事が空で「unexpected end of JSON input」になり落ちた。次の Auto merge は通った。
- 01:50 toan-kumitate の週1の Lighthouse で、速さが49点（下限50点）。1回だけの測定だった。

## 原因
- QA：左下の「Aa」を出すか隠すかは、ページの描き直しのあと次の描画（requestAnimationFrame）で決まる（a11y v8）。検査は閉じる操作の直後に1回だけ見ていたので、決まる前の一瞬を拾うと二重に数えた。CI の機械が混んでいる時間帯に4本そろって落ちた。
- Lint：mkdir のロックで2つとも取れた道は、記録を見ても分からない（ほかに消す人の行が無い）。手元では数千回回しても再現しない。mkdir のロックだけに頼っていた。
- Auto merge：読むだけの gh api が GitHub の一時的な失敗で空を返すと、そのまま止まっていた（やり直しが無い）。
- Lighthouse：速さの点は測るたびに揺れるのに、1回だけ測って判定していた。
- ついでに見つけたもの：検査の最初の「埋めていない <> が無い」は、CI の C.UTF-8 では `[ぁ-ん]` が「Invalid collation character」で止まり、何も見ずに通っていた。

## なぜ見つからなかったか
- どの検査も、PR では緑で、混んだ時間・同時に動くとき・GitHub が一時的に落ちたときにだけ落ちる。「1回だけ見る・測る」形を探す決まりが無かった。
- grep のエラーは終了コード2で、`if grep …` の中では「当てはまらない」と同じに見えた。

## 対策
- [x] 直す: 開いたままの7件の Issue は、ci-failure-issue を回して今の main の成功で閉じた（この PR の作業）。
- [x] 防ぐ: QA の「二重に出ていない」は、数える前に2回分の描画を待つ（#596 で別の担当が同じ原因を先に直した。`template/qa/a11y.mjs`、記録は incidents/2026-11-23-a11y-double-check-flaky.md）。
- [x] 防ぐ: setup.sh は flock が使える所（Linux・クラウドセッション・CI）では、.git の中のファイルを flock で取って並んでから mkdir のロックに進む（`template/scripts/setup.sh` 版14、この PR）。検査17は本物と同じ git のリポジトリで回し、18〜20 は flock の無い所の道を `SETUP_NO_FLOCK=1` で見る。
- [x] 防ぐ: Auto merge の読むだけの gh api は、間をあけて3回までやり直す（`.github/workflows/automerge.yml`、この PR）。
- [x] 防ぐ: Lighthouse は3回測って中央値で判定し、3回の点も表に出す（`.github/workflows/lighthouse.yml`、この PR）。
- [x] 防ぐ: 「埋めていない <>」の grep は `LC_ALL=C` で動かす（`scripts/check-setup-template.sh`、この PR）。
- [ ] 見つける: 同じ検査が「次の実行で緑」の失敗を30日で2回出したら、週次まとめに「揺れる検査」として出す（担当: 再発防止の仕組み、期限: 2026-12-07）
