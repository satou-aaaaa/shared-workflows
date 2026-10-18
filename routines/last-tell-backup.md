# LAST TELL ソースの控え（週1・日曜 8:52 JST）
<!-- style: v1 -->

先に `common.md` を読むこと。

## 目的

LAST TELL のソースと資料（共有フォルダにある）を、週1回、公開リポジトリ satou-aaaaa/last-tell の控え用ブランチ `source-backup` に保存する。
（開発と設計のベストプラクティス 案15。satou さん決定 2026-10-11：main には入れない、PR も作らない）

## 使う道具

- LAST TELL プロジェクトのスレッドと、その共有フォルダ `/mnt/project-files/`（Claude 以外が行うときは、控えの元のファイルがある場所。[tool-map.md](tool-map.md)）
- `python3`・`unzip`・`grep`・`git`
- スレッドへの返信 `reply`（Claude 以外は Issue へのコメント。tool-map.md）

## 手順

1. `python3 /mnt/project-files/dev/tools/backup.py` を実行する。`/mnt/project-files/backup/LAST_TELL_控え_YYYYMMDD.zip` ができる。
2. 空のフォルダ（scratchpad の `srcbk`）を作り、そこに zip を unzip する。
3. 秘密の文字列とメールアドレスを探す: `grep -rEn 'ghp_|github_pat_|sk-ant-|AKIA|PRIVATE KEY|xox|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' srcbk`
4. `git clone --depth 1 -b source-backup https://github.com/satou-aaaaa/last-tell` する。
5. clone した場所の中身（`.git` 以外）を消し、`srcbk` の中身を置く。
6. `git add -A` する。`git status --short` が空なら手順 9 へ（変わりなし）。
7. コミットする（メッセージ「ソースと資料の控え YYYY-MM-DD」と決まりの署名行）。
8. `git push origin source-backup` する。
9. スレッドに1行で知らせる（下の分岐表）。

## 迷ったとき

| もし | すること |
| --- | --- |
| 手順 3 で何か見つかった | push しない。スレッドに「秘密らしい文字列があったので控えを止めた」と、見つかったファイル名だけを書く（中身は書かない） |
| 手順 1 が失敗した | 原因を1行で知らせる。ほかの手順は行わない |
| 手順 8 が失敗した | 原因を1行で知らせ、代わりに zip を attached_outputs で付ける |
| 変わりがなかった | 「今週は変わりがありませんでした」と1行 |
| うまくいった | 「今週の控えをリポジトリに保存しました」と1行（https://github.com/satou-aaaaa/last-tell/tree/source-backup ） |

## 完了条件

- `source-backup` の最新コミットが今日の日付（変わりがなかった週は前のまま）。
- スレッドに1行の報告がある。

## やってはいけないこと

- main に入れる・PR を作る。
- `source-backup` ブランチを消す（last-tell の CLAUDE.md・branch-cleanup の keep）。
- 秘密の文字列が見つかったまま push する。
