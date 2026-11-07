# 並行で起こした Create repo が、ほかのスレッドの実行に取り消された

- 種類: 権限・設定
- 場所: shared-workflows の Create repo（`.github/workflows/create-repo.yml`）
- 気づいた人: スレッド「広告表示のウソを見抜くゲームを作る」
- 影響: 2026-11-07 に1回。kokoku-minuki の作成（run 16）が始まる前に取り消され、`add_repo` が「見つからない」と返した。起こし直して約10分おくれた。

## 起きたこと
- 2026-11-07 01:49 UTC、新作を並行で作るスレッドが続けて Create repo を起こした（satou さん「すべて並列で作っていって大丈夫」）。
- 先に起こした kokoku-minuki の実行は待ちのあいだに cancelled になり、あとの実行（ほかのゲーム）だけが動いた。

## 原因
- `concurrency.group` が全部の実行で同じ `create-repo` だった。GitHub Actions は、同じグループで待っている実行を、あとから来た実行が来たときに取り消す（`cancel-in-progress: false` でも、待ちの実行は1つしか残らない。GitHub Docs「Control the concurrency of workflows and jobs」）。

## なぜ見つからなかったか
- これまでの作成は1本ずつで、2本以上を数秒のうちに起こしたことがなかった。起こす側は「204 queued」しか見ず、自分の実行の結果を確かめる手順も無かった。

## 対策
- [x] 直す: グループを名前ごと（`create-repo-${{ inputs.name }}`）に分けた。別の名前どうしは取り消し合わない（この PR）
- [x] 防ぐ: `routines/onboarding.md` 手順0-A に「自分の実行が緑かを見る。cancelled なら起こし直す」を足した（この PR）
