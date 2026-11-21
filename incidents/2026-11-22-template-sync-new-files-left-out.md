# Template sync の PR が新しいファイル（transfer-qr.js）を入れず、sw.js の SHELL だけが無いファイルを指していた

- 種類: 手順の抜け
- 場所: `.github/workflows/template-sync.yml`（#567 のマージで開いた196本の PR「ひな形の共通部品を写す」）
- 気づいた人: Claude（taifu-yomi #3 の変わったファイルを見て）
- 影響: マージしていれば、sw.js が入るとき（install）に transfer-qr.js を取れずに失敗し、電波の無いときにゲームが開けず、引き継ぎの QR も出なかった。sw.js を変える PR は自動でマージされないため、マージ前に止められた（遊ぶ人への影響は無い）。

## 起きたこと
- 2026-11-21、引き継ぎ部品を transfer.js と transfer-qr.js に分け（#567）、sync-template が transfer-qr.js を足し、sw.js の SHELL にも入れるようにした。
- Template sync は各ゲームで sync-template を回したあと `git commit -qam` で積んでいた。`-a` は前からあるファイルの変更しか入れないので、新しい transfer-qr.js は PR に入らなかった。

## 原因
- Template sync を作ったとき（11/17）は、写すファイルが全部前からあるものだったため、新しいファイルを足す場合を考えていなかった。

## なぜ見つからなかったか
- ゲームの QA は SHELL に決まったファイルが「書いてあるか」は見るが、書いたファイルが「あるか」は見ていなかった。
- shared-workflows の検査（check-transfer など）はひな形の中だけを見て、配ったあとの形は見ていなかった。

## 対策
- [x] 直す: template-sync.yml が `git add -A` してから積む（この PR）。#568 のマージで Template sync がもう一度全部の PR を作り直す
- [x] 防ぐ: 共通部品 game-qa.yml に「sw.js の SHELL のファイル」を足した。SHELL に書いたのに無いファイルがあれば、どのゲームの PR も落ちる（この PR）
- [x] 見つける: drift-check の transfer:qr が、transfer-qr.js の無いゲームを週次まとめに出す（#567）
