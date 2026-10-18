# プロジェクトメモリの構成

プロジェクトメモリは、そのプロジェクトのすべての Claude が読む共有のファイル置き場（`MEMORY.md` と、話題ごとのファイル）。
新しい Claude は会話を覚えていないので、「また satou さんに聞くか、調べ直さないと分からないこと」だけをここに書く。

## 書き方のきまり

- **1話題1ファイル**。話題の名前のファイルに、事実か決まりを1〜2行で足す（どう気づいたかの経緯は書かない）。
- 各ファイルの先頭に、いつ読むべきかが分かる1行の `description` を付ける。後のセッションには名前と description で選ばれたファイルの先頭 4KB だけが見える。
- 3KB を超えたら、要約するか狭い話題に分ける。
- `MEMORY.md` は毎回最初に読まれる索引。1行1話題で `[[ファイル名]]` を並べる。
- 秘密（トークン・パスワード）は書かない。決まりの本文は shared-workflows の common.md・autonomy.md が正で、メモリはそこへの道案内と、ID・担当・状態を持つ。
- 日付は「10/18」ではなく 2026-10-18 のように書く（相対の日付は後で読むと分からない）。

## 1ファイルのひな形

```markdown
---
name: supervisor-agent-rules
description: 監督エージェントの巡回の担当・線引き（巡回の手順の正は shared-workflows routines/supervisor.md）
metadata:
  type: project
---

- 担当: 「業務代行エージェント作り」スレッド（セッション ID をここに）。ルーティン ID をここに。
- 決まり: 監督は自分でコードを書き換えない。指示を出すだけ（2026-10-10 satou さん）。

**Why:** satou さんは止まった作業を自分で見回りたくない。
**How to apply:** 手順を変えるときは routines/supervisor.md に PR。
```

`type` は user（satou さんのこと）・feedback（satou さんからの働き方の指示）・project（進行中の仕事・担当・ID）・reference（外の資料への道案内）のどれか。

## MEMORY.md のひな形

```markdown
# Project memory
- 目的: アプリを自律的に開発するエージェントと、それを見守る監督エージェント。
- satou さんは日本語で書く。返信も日本語。Claude の呼び名は「<名前>」。
- satou さん（2026-10-10）: PR のマージは聞かずにしてよい。本番も担当エージェントに任せる。
- 確認はカード（ask_decision）で出す。改善案は聞かずに導入する（取り消せて無料のもの）。
- satou さんの TODO は /mnt/project-files/notes/todo.md。
- 決まりの正は satou-aaaaa/shared-workflows の routines/common.md と autonomy.md。立ち上げ直しは bootstrap/README.md。
- [[supervisor-agent-rules]] 監督の巡回の担当と線引き
- [[repo-patrol]] 巡回の対象リポジトリ・プロジェクトと渡し先
- [[routine-review]] ルーティンとスキルの見直しの記録
- [[shared-workflows]] 共通リポジトリの使い方と決まり
- [[autonomy-mechanisms]] 自律化の仕組み（差し戻し・成績表・ブレーキ）
- [[no-extra-spending]] お金はこれ以上かけない
```

## 話題のファイルの一覧（今の構成）

立ち上げ直すときは、この名前で作る（中身は空から。分かったものから足す）。

| ファイル | 持つもの |
| --- | --- |
| supervisor-agent-rules | 監督の担当セッション・ルーティン ID・線引き |
| supervisor-extra-duties | 監督の追加の仕事（重複 PR・止まった PR・片付け・週1まとめ）の状態 |
| supervisor-ci-fix | CI 失敗を見つけたときの、リポジトリごとの担当（渡し先の ID） |
| supervisor-decision-log | 監督が satou さんの代理で決めたことの記録（週1で要約） |
| supervisor-scope-additions | 監督の対象に足したもの |
| repo-patrol | 巡回の対象リポジトリ・プロジェクト（ID）と渡し先、前回の提案 |
| routine-review | 週1の見直しで出した提案と採否 |
| efficiency-rules・token-rules | 節約の決まりを入れた経緯（本文は common.md） |
| no-extra-spending | お金をかけない決まり |
| omission-prevention | 対応漏れの防止策を入れた経緯（本文は common.md） |
| autonomy-mechanisms | 自律化の仕組みの導入記録（本文は autonomy.md・checks.md） |
| shared-workflows | このリポジトリの使い方と、入れた部品の記録 |
| ci-speedup | CI の時間短縮で入れた改善の記録 |
| dev-report | 週1の開発レポートの置き場所 |
| <リポジトリ名>-repo | リポジトリごとの公開の仕組みと注意点（例: last-tell-repo） |
