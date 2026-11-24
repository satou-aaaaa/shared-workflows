# 火曜の Freshness が schedule で動かず、見直しの回が古い Issue を読みかけた

- 種類: 公開・CI
- 場所: `.github/workflows/freshness.yml`（schedule）・`routines/freshness.md`（手順2）
- 気づいた人: 見直しの回（2026-11-24 火曜 10:43 の定期実行）
- 影響: 2026-11-24 05:43 JST の Freshness が動かず、Issue #547 の本文は 2026-11-21 のままだった。今回は workflow_dispatch で回し直し、出る行が同じだったので害は無い。

## 起きたこと
- Freshness（cron `43 20 * * 1`）の回が、2026-11-23 20:43 UTC に作られなかった（Actions の一覧に schedule の回が1つも無い）。
- 見直しの回は Issue の本文だけを見て作業する手順だったので、古い本文のまま進むところだった。

## 原因
- GitHub は混んでいるとき schedule の回を遅らせたり落としたりする（公式：https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule 「High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped.」）。
- Freshness は週1回の1本だけで、控えの回が無かった。

## なぜ見つからなかったか
- 手順書が「Issue が今日の回で作られたか」を確かめる段を持っていなかった。

## 対策
- [x] 直す: 今日の Freshness を workflow_dispatch で回し、Issue を 2026-11-24 の本文にした。
- [x] 防ぐ: `freshness.yml` に控えの cron（火曜 08:17 JST）を足した。同じ Issue の本文を替えるだけなので2回回っても害はない。この PR
- [x] 見つける: `routines/freshness.md` 手順2に「今日の Freshness の回が無ければ workflow_dispatch で回して待つ」を足した。この PR
