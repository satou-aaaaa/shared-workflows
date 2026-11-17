# 週次まとめで見つかっていたゲームの不具合が直されず、新作に写って広がっていた

- 種類: 手順の抜け
- 場所: satou-aaaaa のゲーム（repos.txt の game）約60本、`scripts/drift-check.mjs`、共通部品 `game-qa.yml`
- 気づいた人: 全ゲームの点検（2026-11-17「トークンを使い切って」の回）
- 影響: 遊ぶ人が困る作りが残っていた。保存に失敗しても黙る（開き直すと記録が消える）約50本、とことんで正解した直後に「ここで降りる」が効かない約20本、遊び方を Esc で閉じると毎回出る3本、連戦が鍵で閉じている1本。知らせ（toast）が出ている2秒ほど下のボタンが押せない形はほぼ全部（約85本）。消えた・押せないという報告は無い。

## 起きたこと
- 2026-11-07 に保存の知らせ（save:silent）・ここで降りる（endless:stuck）・遊び方（howto:close）を drift-check に足し、その日にあった14本ほどは直した。
- そのあと11/7〜11/12 に作った新作は、直す前の古いゲームから写して作られ、同じ形をそのまま持ち込んだ。
- 週次まとめ（11/16）の「ひな形からのずれ」に毎週出ていたが、直す担当も期限もなく、2026-11-07-template-copies-drift.md の対策（各ゲームへ写す PR、期限 11/14）も期限を過ぎて残っていた。
- 11/17 の点検で、スマホ幅（360・390）と PC 幅（1366）で全ゲームを自動で遊ばせたところ、エラーやはみ出しは出ず、知らせが下のボタンを塞ぐ形が新しく見つかった。

## 原因
- drift-check は週に1回「知らせる」だけで、ゲームの PR を止めない。新作の PR #1 を作る担当は週次まとめを読まないので、知らせが届く先が無かった。
- 新作は new-game.mjs で template/ から始めるが、index.html は template/ に無く、各担当が近いゲームから写す。写し元が直っていなければ古い形が入る。
- 知らせ（.toast）の決まりが routines/game-dev-detail.md の「共通の形」に無く、`pointer-events:none` を付けたゲーム（seiza-tsunagi）と付けないゲームに分かれた。

## なぜ見つからなかったか
- 各ゲームの QA は、そのゲームで直した所しか見ない。drift-check の結果は週次まとめの長い表の中にあり（Issue の字数で途中から切れていた）、急ぐものとして「次にやること」に出なかった。
- 知らせがボタンを塞ぐのは2秒ほどで、QA は知らせが消えるのを待ってから押すため気づかない。

## 対策
- [x] 直す: 手元で直せたゲームの、保存の知らせ・ここで降りる・遊び方の Esc・連戦の鍵・知らせの pointer-events:none を直した（各ゲームの PR。一覧はこの PR の本文）
- [x] 防ぐ: 見分けを `scripts/game-patterns.mjs` の `playerBugs` 1か所にまとめ、共通部品 `game-qa.yml` の「遊ぶ人が困る作り」で、ゲームの PR が新しく持ち込んだら落とす（`scripts/check-game-new.mjs`。もとからあるものは警告だけ）（この PR）
- [x] 防ぐ: routines/game-dev-detail.md の「共通の形」に「知らせ」の行を足した（この PR）
- [x] 見つける: drift-check に `toast:blocks` を足し、コメントの中の「押すと開く」を鍵と見ないようにした（kimari-sagashi の見まちがい）（この PR）
- [x] 見つける: `endless:stuck` が `endFinish()` の形と、正解したときに `$("quit").hidden = true` でボタンを隠す形を見落としていた（gurafu-minuki・rosen-hitofude・kusuri-yomi・taikyo-hiyo・tenkizu-yomi で見つけた）。両方を見分けに足した（2つ目の PR）
- [x] 見つける: `endless:stuck` が、降りるボタンの中で `if (cur && cur.done) return;` のあとに保存や読み直しを挟む形（`save(...); finish();`・`const r = load()...`）を見落としていた（tani-kankaku・sentaku-hyoji・sekai-jikoku・bousai-handan・onpu-yomi・hyakunin-awase・wareki-yomi・shukujitsu-yurai・kyukoku-mei・kakuritsu-dotchi）。`$("quit").onclick = () => { if (cur && cur.done) return;` そのものを見分けに足した（3つ目の PR）
- [x] 防ぐ: 作業用の木（worktree）で `.tools` を記号リンクにして `git add -A` すると、`.gitignore` の `.tools/`（フォルダだけに当たる）をすり抜けてリンクがコミットされ、CI の setup.sh が「mkdir: Already exists」で止まった（#342）。`.gitignore` を `.tools` にしてリンクも外す
- [x] 見つける: 出典のリンクの `.src a{min-height:32px}` が、前の行の `min-height:44px` を上書きしていた（funka-level・kenko-minuki・kumo-namae・nemuri-kotsu・taikyo-hiyo）。出典が2行に折れる日だけ QA の「押せる所は44px以上」が落ちる（funka-level #3 の CI）。44px に直し、リンクの min-height が44pxより低い形を `tap:low-link` として見分けに足した（#342）
