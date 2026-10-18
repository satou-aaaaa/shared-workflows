# LAST TELL ソースの控え（週1・日曜 8:52 JST）

先に `common.md` を読むこと。
（開発と設計のベストプラクティス 案15。satou さん決定 2026-10-11：公開リポジトリ satou-aaaaa/last-tell の控え用ブランチ `source-backup` に保存する。main には入れない、PR も作らない）
このルーティンは LAST TELL プロジェクトのスレッドで動く（共有フォルダはそのプロジェクトのもの）。

1. `python3 /mnt/project-files/dev/tools/backup.py` を実行して `/mnt/project-files/backup/LAST_TELL_控え_YYYYMMDD.zip` を作る。
2. 空のフォルダ（scratchpad の `srcbk`）に unzip し、秘密の文字列（`ghp_`・`github_pat_`・`sk-ant-`・`AKIA`・`PRIVATE KEY`・`xox`）とメールアドレスが入っていないか grep で確かめる。入っていたら push せず、このスレッドで知らせる。
3. `git clone --depth 1 -b source-backup https://github.com/satou-aaaaa/last-tell` した作業場所の中身（`.git` 以外）を、unzip した中身に置き換える。`git add -A` してコミット（メッセージ「ソースと資料の控え YYYY-MM-DD」と決まりの署名行）し、`git push origin source-backup`。変わりがなければコミットしない。
4. このスレッドに「今週の控えをリポジトリに保存しました」と1行で知らせる（ブランチのリンク https://github.com/satou-aaaaa/last-tell/tree/source-backup ）。失敗したら原因を1行で知らせ、代わりに zip を attached_outputs で付ける。

- `source-backup` ブランチは消さない（last-tell の CLAUDE.md・branch-cleanup の keep）。
