# 準備の1コマンド（setup.sh）が、Node の版が足りないとき何も言わずに止まっていた

- 種類: 検査の見逃し
- 場所: shared-workflows の `template/scripts/setup.sh`（版 2）と、その写し（各リポジトリの `scripts/setup.sh`）
- 気づいた人: 手入れの少ないリポジトリを整える作業（sandbox の写しを版 2 にして動かしたとき）
- 影響: Node の版が .nvmrc より古い環境（クラウドセッションの Node 22 と sandbox の .nvmrc 24 など）で、`bash scripts/setup.sh` が何も出さずに終了コード 3 で止まる。準備ができていないのに理由が出ず、人も AI も次に何をすればよいか分からない。

## 起きたこと
- 2026-11-04 sandbox の `scripts/setup.sh` をひな形の版 2 にそろえて動かすと、出力が空のまま終了コード 3 で止まった。
- `bash -x` で追うと、`. "$NVM_DIR/nvm.sh"` の中で止まっていた。nvm.sh は読んだ時点で `.nvmrc` の版に切り替えようとし、その版が入っていないと 3 を返す。`set -e` なので、スクリプトがそこで黙って終わる。

## 原因
- nvm.sh を `--no-use` を付けずに読んでいた。nvm の README は、読むだけで切り替えさせないときは `--no-use` を付けると書いている（https://github.com/nvm-sh/nvm#additional-notes ）。
- この節は「版が足りないときに nvm で入れる」ための節なので、`.nvmrc` の版はまだ入っていないのが普通。つまり、この節が働くはずの場面でいつも止まっていた。

## なぜ見つからなかったか
- `scripts/check-setup-template.sh` の6番目の検査（nvm で入れる）は、作り物の nvm.sh を使っていた。作り物は読んでも何もせず、本物の「読んだ時点で切り替える」動きを持っていなかった。
- CI の Setup check は .nvmrc の版の Node が最初から入った環境で動くので、nvm の節を通らない。

## 対策
- [x] 直す: ひな形を版 3 にし、`. "$NVM_DIR/nvm.sh" --no-use` で読む（この PR、`template/scripts/setup.sh`）
- [x] 防ぐ: `scripts/check-setup-template.sh` の作り物の nvm.sh に、本物と同じ「`--no-use` なしで読むと .nvmrc があれば 3 を返す」動きを足した。直す前のひな形ではこの検査が落ちることを確かめた（この PR）
- [x] 直す: 写しを版 3 にした（sandbox・last-tell・tenbin・naitei-no-michi・articles・carcassonne-research・security-toolkit・local-kanban。それぞれの PR）
- [x] 見つける: `scripts/drift-check.mjs` が版 3 より古い写しを週次まとめの「ひな形からのずれ」に出す（版の行を上げたので、版 2 の写しも出る）。大きいリポジトリで ENOBUFS で落ちていたのも直した（この PR）
- [x] 見つける: 同じ作業で、dungeon-boardgame の検査が準備の渡す `CHROMIUM_PATH` を読まず（`PW_CHROMIUM` だけ）、「✓ 準備できた」のあと検査がブラウザを見つけられないことも分かった（dungeon-boardgame #18 で直した）。`scripts/drift-check.mjs` が「setup.sh が CHROMIUM_PATH を渡すのに、検査のスクリプトが読んでいない」を出す。直す前の run.mjs で出て、直したあと出ないことを確かめた（この PR）
- [ ] 直す: ゲームのリポジトリ（usotsuki-roppo・wagamama-burger・kabu-news・batsu-doko・kasane-zome・rosen-hitofude・seiza-tsunagi）の写しを版 3 にする。週次まとめの「ひな形からのずれ」に出たものから、各ゲームの担当が直す（担当: 各ゲームの担当スレッド、期限: 2026-11-17）
