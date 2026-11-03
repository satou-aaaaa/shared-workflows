# 準備の1コマンド（setup.sh）が、使えない状態でも「✓ 準備できた」と出していた

- 種類: 検査の見逃し
- 場所: shared-workflows の `template/scripts/setup.sh` と、その写し（各リポジトリの `scripts/setup.sh`）
- 気づいた人: CodeRabbit（batsu-doko #1 のレビュー）
- 影響: 本番の不具合は出ていない。次の3つの場合に「✓ 準備できた」と出たあと、検査（`node qa/run.mjs` など）が古い Node・壊れた依存・無いブラウザで動いて落ちる、か別の版で動くおそれがあった。

## 起きたこと
- 2026-11-03 batsu-doko #1 に、ひな形をそのまま写した `scripts/setup.sh` が入り、CodeRabbit が3つ指摘した。
- ① nvm で Node を入れても、切り替えはスクリプトの中だけに効き、呼んだシェルは古い Node のまま。なのに案内が無い。
- ② 依存を入れ直すかを、目印のファイル（`node_modules/.package-lock.json`）と lock の日付だけで決めていた。依存が消えた・別の版に替わった node_modules を見逃す。
- ③ `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` で使えるブラウザが無くても「✓」と出た。`CLAUDE_ENV_FILE` が無い環境では `CHROMIUM_PATH` も渡らなかった。

## 原因
- ひな形が「やったこと」を信じて最後に ✓ を出し、本当に使えるか（ブラウザがあるか・呼んだシェルに効いたか）を確かめていなかった。
- 子のプロセスから親のシェルの環境（PATH・CHROMIUM_PATH）は変えられない。クラウドセッション（`CLAUDE_ENV_FILE` がある）だけを考えて作り、人の端末やほかの AI の場合を考えていなかった。
- 速さのために `npm ci` を飛ばす近道を入れたが、飛ばしてよい条件を日付だけで決めていた（`npm ci` は数秒で終わり、近道は要らなかった）。

## なぜ見つからなかったか
- ひな形そのものを動かす検査が無かった。Setup check（`setup-check.yml`）は各リポジトリのまっさらな CI で1回通すだけで、壊れた node_modules・ブラウザ無し・nvm での入れ直しの場合を通らない。
- 写しは各リポジトリにあり、ひな形を直しても写しに届いたかを見るものが無かった（drift-check はファイルがあるかだけを見ていた）。

## 対策
- [x] 直す: ひな形を版 2 にした。依存は毎回 `npm ci`、ブラウザが見つからない・`CHROMIUM_PATH` が動かせないときは止める、呼んだシェルで要る操作（`nvm use`・`export CHROMIUM_PATH=…`・`. .venv/bin/activate`）があれば ✓ の代わりに「△」と打つ操作を出す（この PR、`template/scripts/setup.sh`）
- [x] 防ぐ: `scripts/check-setup-template.sh` が、作り物の環境でひな形を6通り動かす（ふつう・壊れた node_modules・ブラウザ無し・動かない CHROMIUM_PATH・CLAUDE_ENV_FILE 無し・nvm で入れ直し）。Lint と `scripts/check.sh` から呼ぶ。直す前のひな形では6つとも落ちることを確かめた（この PR）
- [x] 見つける: ひな形に「ひな形の版」の行を置き、`scripts/drift-check.mjs` が版の古い写しを週次まとめの「ひな形からのずれ」に出す（この PR）
- [ ] 直す: 写しを版 2 にする。usotsuki-roppo・wagamama-burger・local-kanban・batsu-doko はこのスレッドで直す。ほかのリポジトリは週次まとめの「ひな形からのずれ」に出たものから直す（担当: 共通の準備スクリプトの不具合を直す、期限: 2026-11-17）
