# まんなか漢字・きっぷで10・お弁当づめの公開ページが 404 のままだった

- 種類: 手順の抜け
- 場所: mannaka-kanji・kippu-10・bento-zume
- 気づいた人: X でゲームを広めるスレッド（紹介のリンクを開いたら 404）
- 影響: 3本の公開ページが作ってから開けなかった。X の紹介を止めた。記録やデータが消えたものは無い。

## 起きたこと
- 2026-11-04 に3本を作って PR #1 をマージした。Pages の設定（settings/pages → main / root）は Chrome が切れていた日に「satou さんにお願い」と書いて終わり、入らないままだった。
- 夜、X の紹介で 404 と分かった。kippu-10・bento-zume は Claude が satou さんの Chrome で設定した。mannaka-kanji は保存の操作が安全の仕組みに止められ、satou さんに保存を押してもらう。

## 原因
- 手順は「頼む」で終わり、Pages が有効になったかを後で確かめる場所が無かった（ルールセットの抜け incidents/2026-11-04-new-repos-no-ruleset.md と同じ形）。

## なぜ見つからなかったか
- Post-deploy check は公開（pages-build-deployment）が動いたときだけ動くので、Pages が切れていると一度も動かない。
- Site watch は毎日見ていたが、Pages が切れていると「何もしない」で緑のまま終わっていた。
- ずれの検査（drift-check）はリポジトリの Pages の設定を見ていなかった。

## 対策
- [x] 直す: kippu-10・bento-zume の Pages を main / (root) で有効にした（Claude が satou さんの Chrome で）。mannaka-kanji は satou さんが保存を押し、Post-deploy check が緑になった。
- [x] 見つける: Site watch は Pages が切れていたら赤にする（CI 失敗の Issue が立つ）。公開しないリポジトリは site-watch.yml を外す（#127）。
- [x] 見つける: `scripts/drift-check.mjs` が、post-deploy・site-watch のあるリポジトリの Pages を API で読み、切れていたら1行出す（#127）。
- [x] 防ぐ: `routines/game-dev.md` の新作の手順に「Pages を入れたら API で有効か確かめ、Post-deploy check が緑になるまで紹介しない」を足した（#127）。
- [x] 防ぐ: `scripts/check-incidents.mjs` が、README の一覧から指す記録のファイルが本当にあるかを見る（#127 でこのファイルを入れ忘れたため。この PR）。
