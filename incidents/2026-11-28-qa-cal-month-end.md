# 月末の3日に、3本のゲームの main の QA がカレンダーの検査で落ちた（Auto merge も接続の一時切れで1件）

- 種類: 検査の見逃し
- 場所: setsuden-kotsu・mukashi-narabe・pikuto-yomi の `qa/run.mjs`（あとから遊ぶ日のカレンダー）、wazato-hantei の Auto merge
- 気づいた人: 見回り（CI失敗の Issue：setsuden-kotsu #31・mukashi-narabe #32・pikuto-yomi #24・wazato-hantei #4）
- 影響: ゲームの動きは正しい（前の月のボタンで開ける）。検査だけが 11/28〜11/30（日本時間）のあいだ落ち、その間の PR（Template sync を含む）が止まるところだった。

## 起きたこと
- 11/27 23:49〜（UTC 14:49）に共通部品を写したあとの QA を手で起こし、実行は日本時間 11/28 0時を過ぎてから始まった。
- 3本とも「時計を3日進めて、いちばん近い取りこぼした日をカレンダーで押す」検査がある。進めた今日が 12/01 になり、取りこぼした日 11/30 が前の月なのに12月のカレンダーで探して見つからず落ちた。
- 前夜の共通部品の配布（#686 引き継ぎ部品 版15 など）とは関係ない。直したあと、日本時間 11/28 に手元で3本とも QA が全部通った。
- wazato-hantei の Auto merge：機械から api.github.com へ約2分つながらず（`dial tcp … i/o timeout`）、3回のやり直し（あいだ5・10秒）が尽きて落ちた。

## 原因
- 検査が実際の日付に左右された。月末の3日にしか落ちないので、書いた日・PR の日には通っていた。
- 同じ形は 2026-11-22 rosen-hitofude で一度起き（2026-11-22-qa-rots-with-date.md）、手順書に「あとから遊ぶ日が前の月になる」を足していたが、新作の QA を写して作るときに検査の形は直らなかった。
- Auto merge の読むだけの gh api のやり直しが短く、2分ほどのつながらない時間をしのげなかった。

## なぜ見つからなかったか
- 手順書の一行は書く人が読み落とせば効かない。QA の書き方を機械で見る所（drift-check）に、この形の見分けが無かった。
- Game explore の「1〜30日後でも QA を回す」は `QA_DATE` のあるゲームだけで、3本とも無く、日も乱数なので月末に当たるとは限らなかった。

## 対策
- [x] 直す: 3本の QA で、日の月と今日の月がちがえば前の月を開いてから探す（setsuden-kotsu#32・mukashi-narabe#33・pikuto-yomi#25）。wazato-hantei の Auto merge は再実行。
- [x] 見つける: `scripts/game-patterns.mjs` の `calMonth` を足し、`scripts/drift-check.mjs` が「時計を進めたあと、前の月を開かずにカレンダーの日を探す」行を qa:cal-month として週次まとめに出す（この PR。`scripts/check-game-patterns.mjs` で形を確かめる）
- [x] 弱める: `.github/workflows/automerge.yml` の読むだけの gh api のやり直しを5回・あいだ10〜60秒にし、時間切れを10分にした（この PR）
- [ ] 防ぐ: drift-check を全ゲームで回し、qa:cal-month に出たゲームを同じ日に直す（担当: 監督の巡回、期限: 2026-11-30）
