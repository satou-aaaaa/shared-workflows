# 自動マージが Secret scan の結果を見ず、鍵が混ざった PR でも QA が通ればマージできた

- 種類: 検査の見逃し
- 場所: 共通部品 `automerge.yml` と、Secret scan を入れた各リポジトリ（last-tell・naitei-no-michi・local-kanban・articles・last-tell-godot）
- 気づいた人: CodeRabbit（last-tell-godot #2 のレビュー）
- 影響: 実害は見つかっていない。Secret scan が赤でも、QA が ✅ なら自動マージされる作りだった。

## 起きたこと
- 自動マージはきっかけの検査（QA）の workflow_run だけを見てマージする。同じコミットのほかの検査（Secret scan）は見ていなかった。

## 原因
- Secret scan（gitleaks）をあとから足したとき、自動マージの条件に入れなかった。公開リポジトリは GitHub の Push protection もあるので気づきにくかった。非公開リポジトリ（無料プラン）は Push protection が無く、Secret scan だけが守り。

## なぜ見つからなかったか
- 自動マージの条件は「main の守り（必須チェック）」で補う前提だったが、各リポジトリの Ruleset は削除・force push の禁止だけで、必須チェックを置いていない（PR 必須にすると止まるリポジトリがあるため）。条件の抜けを見る検査が無かった。

## 対策
- [x] 直す: `automerge.yml` に `require_checks`（同じコミットで ✅ が要る check run の名前）を足した。呼び出し側は `checks: read` が要る。last-tell-godot は `scan / scan` を指定
- [x] 防ぐ: この PR の `template/.github/workflows/automerge.yml` に `checks: read` と `require_checks` の書き方を入れ、新しいリポジトリは最初から入る
- [x] 防ぐ: last-tell・naitei-no-michi・local-kanban・articles の呼び出しに `checks: read` と `require_checks: scan / scan` を足す（2026-10-31 完了。last-tell #157・naitei-no-michi #12・local-kanban #90・articles #7。期限 10/29 を2日過ぎた。`check` 名は4つとも `scan / scan` で一致を確認、CI 緑でマージ）
