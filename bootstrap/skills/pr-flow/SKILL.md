---
name: "pr-flow"
description: "satou-aaaaa の各リポジトリでPRを作る・CIを通す・マージするときの共通手順。リポジトリに .claude/skills/steward があればそちらを優先。"
---

# PR の手順（全リポジトリ共通）

手順の本文は satou-aaaaa/shared-workflows の `routines/pr.md`（2026-10-18 にここから移した）。
`git clone --depth 1 https://github.com/satou-aaaaa/shared-workflows`（あれば pull）して読み、その手順どおりに進める。

- リポジトリだけの決まり（確認コマンド・公開ページの作り直し）は、そのリポジトリの `CLAUDE.md` と `.claude/skills/steward/SKILL.md` が優先。
- ルーティンから動くときは、同じリポジトリの `routines/common.md` も読む。
- 読めないときは、push 前にリポジトリの `CLAUDE.md` の「push する前の確認」を回し、下書き PR で出して CI が緑になってから squash マージする。
