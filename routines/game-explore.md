# 探索で見つけた不具合を直す（Issue「探索で見つけた不具合」が開いているとき・ゲームを直すとき）
<!-- style: v1 -->

## 目的
でたらめに遊んで見つけた、まだ知らなかった不具合を直し、二度と起きないことを毎回の PR の CI で確かめる形にする。
見つけるのは毎週水曜 03:21 JST の Game explore（`game-explore.yml`。公開のゲームを15本ずつ、約13週で1周。同じ15本の main の QA も回す）。道具は `scripts/game-explore.mjs`。

## 使う道具
- git・Node.js 22・GitHub（Issue・PR・Actions の成果物）
- ゲームの `qa/` の Playwright（クラウドの会話では `CHROMIUM_PATH=<Chromium の場所>`）
- 知らせ・確認：Claude はプロジェクトチャットのカード。ほかの AI・人は [tool-map.md](tool-map.md) の置き換え先

## 手順
1. このリポジトリで Issue「探索で見つけた不具合」（ラベル「探索の不具合」）を開き、いちばん新しいコメントか本文から、ゲームを1回に**3本まで**選ぶ（開いた PR があるゲームは飛ばす）。
2. その回の Actions の成果物 `explore` を取る（`gh run download <回の番号> -n explore -R satou-aaaaa/shared-workflows`）。中の `<ゲーム>/repro-<印>.json` が再現ファイル。
3. ゲームを clone し、`cd qa && npm ci` する。
4. 再現ファイルをゲームの `qa/repro/` に置き、`node <shared-workflows>/scripts/game-explore.mjs . --replay qa/repro` を回す。
5. 下の表で、することを決める。

   | もし | すること |
   | --- | --- |
   | 「✗ まだ起きる」 | 手順 6 へ |
   | 「✓ 起きない」（もう直っている・ときどきだけ起きる） | 同じ種で `--runs 1 --seed <scenario.seed> --steps 40` を3回回す。3回とも起きなければ再現ファイルを消し、Issue に「<ゲーム>：再現しない」とコメントして次のゲームへ |
   | 見つけた中身が不具合でない（外への通信が感想フォームなど、ゲームの決まりどおり） | ゲームは直さず、`scripts/game-explore.mjs` の見張りを直す PR をこのリポジトリに出す（誤りの例を `--replay` で確かめる） |
   | 見出しが「main の QA が落ちた」 | 再現ファイルは無い。ゲームで `node qa/run.mjs` を回し、落ちた検査が日付（月の変わり目・読み直しで消える検査用の今日）に左右されていないかを見て、qa/run.mjs を直す PR を出す（`incidents/2026-11-22-qa-rots-with-date.md`）。ゲームの不具合なら手順 6 へ |
   | どれにも当たらない | 止めて、Issue にコメントで状況を書く |

6. 再現ファイルの `actions`（押した所）と `fail`（壊れ方）を読み、原因を探して直す。共通部品（game-core・store・transfer）が原因なら、このリポジトリの `template/` を直して `sync-template` で配る。
7. もう一度 `--replay qa/repro` を回し、「✓ 起きない」になるのを確かめる。`node qa/run.mjs` も通す。
8. 再現ファイルに `"note": "<何が起きたか1行>"` を足し、`qa/repro/` に入れたまま PR を出す（[pr.md](pr.md)）。以後は Game QA の「直した不具合の再現」がこれを毎回動かす。
9. 直したら [common.md](common.md)「問題が起きたら」に従って incidents/ に残す（同じ種類がほかのゲームにもあれば、検査かひな形で全部に効く仕組みを入れる）。
10. 全部済んだら Issue を閉じる。報告は「直したゲーム・原因・再発防止」の3行だけ。

## 完了条件
- 選んだゲームごとに、再現ファイルを `qa/repro/` に入れた PR がマージされたか、「再現しない」「見張りの誤り」と Issue にコメントがある。

## やってはいけないこと
- 再現ファイルを消して・`fail` を書きかえて CI を緑にする（直っていないのに通る）。
- `game-explore.mjs` の見張りを、ゲーム1本のために弱める（全部のゲームで見逃す）。
- 1回で4本以上のゲームを直す。

### 手元で探すとき
- `node scripts/game-explore.mjs <ゲーム> --runs 8 --steps 40` で探す（1本 5〜10 分）。見つけたら `<ゲーム>/qa-report/explore/` に再現ファイルが出る。あとは手順 4 から。
