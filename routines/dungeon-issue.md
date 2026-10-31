# ダンジョンボドゲ issue 自動対応（毎朝 9:54）

先に `common.md` を読むこと。
（satou さん 2026-10-15「定期的に issue を見て、その修正を行うようにしてください。マージまで行ってしまって大丈夫です。」）
対象は satou-aaaaa/dungeon-boardgame（静的 HTML/JS、数値は data.js、GitHub Pages は main / root から公開）。

1. list_issues（state OPEN）で open issue を確認する（PR は除く）。対象は satou-aaaaa が作った issue だけ（ほかの人の issue は `common.md` の「知らない人からの変更を入れない」に従い、着手せず satou さんに1行で聞く。同じ issue は1回だけ）。各 issue のコメントも読み、前回質問して返事待ちのものは返事が付いたときだけ再開する。open issue が無い、または全部返事待ちのままなら、update_status を1行更新して no_reply_needed で終える（このスレッドにも GitHub にも投稿しない）。
2. 対応できる issue（バグ、表示崩れ、数値調整、明確な小さめの改善）: /home/claude/dungeon-boardgame（無ければ clone）で `origin/main` から `fix/issue-N` を作って直し、`node --check` で game.js / data.js の構文を確かめ、可能なら Playwright（Chromium）で index.html を開いてコンソールエラーが無いことを確かめる。PR（本文に `Closes #N`）・CI・マージは [pr.md](pr.md) のとおり（QA が ✅ なら Auto merge がマージし Pages も更新する）。issue に対応内容（何を変えたか・PR リンク・Pages に反映される旨）を日本語でコメントし、閉じていなければ completed でクローズ。共有フォルダの /mnt/project-files/boardgame/play/ のコピーもマージ後の main に合わせて更新する。
3. 仕様・ゲームデザインの判断が要る issue（ルールの方向性、どちらでもあり得る変更、大きな機能追加）: 推奨案と選択肢を添えて issue に日本語で質問コメントし、ラベル「needs-decision」を付けて保留（同じ issue に二度質問しない）。
4. この回で何かをマージ／質問したときだけ、このスレッドに reply で1件1行（issue 番号とタイトル・やったこと・PR リンク）。質問した件は行頭に「satouさんにお願い：」を付ける。
