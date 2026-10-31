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

## 直したあとに出た副作用
- 上の対策で、QA が Secret scan より先に終わると自動マージは `scan / scan` 待ちで終了し、後から scan が通っても再実行されなかった（手でマージが要る。鍵が混ざった PR がマージされることはない安全側の止まり方）。CodeRabbit が4つの PR に指摘（2026-10-31）。
- [x] 直す: 呼び出しを `workflows: [QA, Secret scan]` にし、`require_checks` に QA の check 名を足した。`recheck_main: false` と `dispatch` に `qa.yml` を足した（きっかけが Secret scan だと recheck_main は secret-scan.yml を起こそうとするため）。local-kanban #91 で試し、試験 PR #92 が自動でマージされるのを確認してから、last-tell #158・naitei-no-michi #13・articles #8 に広げた。last-tell-godot は merge-sweep.yml が拾うので対象外
- [x] 防ぐ: テンプレートに書き方を足した（このPR）
- 学び: 検査の必須化を足すときは、検査の終わる順番が変わっても自動マージが再評価されるかを見る。CodeRabbit の指摘は、マージの前に読む
