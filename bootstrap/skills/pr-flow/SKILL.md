---
name: "pr-flow"
description: "satou-aaaaa の各リポジトリでPRを作る・CIを通す・マージするときの共通手順。リポジトリに .claude/skills/steward があればそちらを優先。"
---

# PR の手順（全リポジトリ共通）

対象: last-tell・tenbin・carcassonne-research・sandbox・dungeon-boardgame・shared-workflows（kotlin-csv は止まったフォークなので触らない）。
リポジトリに `.claude/skills/steward/SKILL.md` があれば、そちらの決まり（確認コマンド・公開ページの作り直しなど）が優先。
ルーティンから動くときは、satou-aaaaa/shared-workflows の `routines/common.md` も読む。

## push する前
1. `origin/main` から作業ブランチを作る（マージ済みのブランチは使い回さず、作り直す）。
2. リポジトリの CLAUDE.md の「push する前の確認」（無ければ steward スキル・CI のワークフロー）にあるコマンドをローカルで回し、通ってから push する。
   - sandbox: `npm run typecheck`・`npm run lint`・`npm test`
   - carcassonne-research: `python scripts/check.py --quick`（エンジンを触ったら `--quick` なし）
   - last-tell・dungeon-boardgame: `qa/` の検査（Playwright）。index.html を変えたら sw.js の VERSION も上げる（last-tell は `tools/build_index.py`）
3. `.github/workflows/` を変えたら actionlint で構文を確かめる。CI の部品（CI失敗Issue・死活監視・Lighthouse・ブランチ片付け・自動マージ）は shared-workflows の共通部品を呼ぶだけにし、リポジトリ側に中身をコピーしない。
4. 秘密の文字列・個人情報・顧客の実データを入れない。

## PR
- 下書き（draft）で作る。リポジトリに PR テンプレートがあればその見出しに沿って書き、無ければ Before / After / How の順に短く書く。
- 本文の先頭2行に決まりの帰属行、末尾に Claude Code の署名行を付ける。コミットメッセージは日本語で簡潔に。
- 作ったら subscribe_pr_activity で見張り、CI の失敗やレビューには自分で対応する。

## CI
- 落ちたら、ローカルで同じ確認を再現してから直す。テストのスキップ・無効化・削除で通さない。空コミットで CI を起こさない。
- main の失敗は各リポジトリの Actions がラベル `ci-failure` の Issue にする（次に成功すると自動で閉じる）。

## マージ
- satou さんは PR のマージを Claude に任せている（2026-10-10）。CI が緑で未解決のレビューが無ければ、下書きを解除して squash マージする。タイトルは PR のタイトルのまま。
- last-tell・dungeon-boardgame は QA が ✅ になると Auto merge（共通部品）が自動でマージする。`.github/` を変える PR、ラベル「自動マージしない」の PR、（last-tell は）ゲームも検査も変えない PR は自動マージされないので、checks を見てから手でマージする。
- shared-workflows を変えると、次の実行から全リポジトリに効く。必ず PR で出し、Lint（actionlint）が通ってからマージする。

## 公開
- GitHub Pages は main から公開される（last-tell は pages.yml、dungeon-boardgame は main の root、carcassonne-research は main の /docs）。自動マージ以外でマージしたときは、公開が動いたかを Actions で確かめる。