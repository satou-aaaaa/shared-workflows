# sw.js が28本で28通りになり、同じ直しを1本ずつ手で入れていた

- 種類: 手順の抜け
- 場所: satou-aaaaa の公開ゲームの sw.js・scripts/setup.sh・transfer.js・qa/ の写し（shared-workflows template/）
- 気づいた人: 共通化の担当（全ゲームの共通部分をまとめるスレッド）
- 影響: 遊べなくなったという報告は無い。直しの届き方がゲームごとにちがい、ある直しが入ったゲームと入っていないゲームが混ざった（setup.sh は版4〜9、transfer.js は版7〜9、sw.js は28通り）。#219 にひな形への指摘が20件以上たまった。

## 起きたこと
- 2026-11-07、手元の28本を比べると、sw.js は同じ仕組みなのに中身が28通りだった（? 付き URL の扱い・20秒の打ち切り・本文の止まりの見方などが、ゲームごとに入ったり入らなかったり）。
- setup.sh・transfer.js・qa/*.mjs はひな形があるが、写すのは手作業で、版が混ざっていた。CodeRabbit の指摘は新作ごとに同じものが出て、#219 にためていた。

## 原因
- sw.js にはひな形が無く、新作は前のゲームの sw.js を写して作っていた。ゲームごとに書く所（CACHE・SHELL）と共通の所が分かれていないので、写すたびに手で直す必要があった。
- ひな形のあるファイルも、写す道具が無く、1本ずつ手で写していた。

## なぜ見つからなかったか
- drift-check は sw.js の一部の書き方（cache: "reload"・4秒の切り替え）を文字で見るだけで、ひな形との一致は見ていなかった（ひな形が無かったため）。

## 対策
- [x] 直す: `template/sw.js` を作り、ゲームごとに書く所を `// game:begin`〜`// game:end` に分けた。#219 の setup.sh・transfer.js・qa/*.mjs・a11y の指摘を直し、版を上げた（setup.sh 版10・transfer.js 版10・a11y v6・sw.js 版1。この PR）
- [x] 防ぐ: 写す道具 `scripts/sync-template.mjs`（ゲームの枠・npm_dir・next は残す。`--check` でちがいだけ出す）。`routines/game-dev.md` の PWA に「sw.js はひな形を写す」を書いた（この PR）
- [x] 見つける: `scripts/drift-check.mjs` の `sw:template`・`sw:qa` が、ひな形とちがう sw.js・qa/sw-check.mjs を週次まとめに出す。`scripts/check-sw-check.mjs`（Lint）が、写す道具が枠を残すこと・二度写しても変わらないことを見る（この PR）
- [ ] 直す: 各ゲームへ sync-template で写す PR を1本ずつ出す（担当: 全ゲームの共通部分をまとめるスレッド、期限: 2026-11-14）
