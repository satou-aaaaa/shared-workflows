# ひな形の core-check が隠れた吹き出しの「やってみる」を押しに行って止まり、新作に screens/ も毎回入った

- 種類: 検査の見逃し
- 場所: shared-workflows の template/qa/core-check.mjs・scripts/new-game.mjs、新作 tamatama-atari・onaji-fune・wazato-hantei・yume-kikai
- 気づいた人: Claude（スレッド「哲学シリーズの新作7本を作る」で新作の QA を回したとき）
- 影響: 2つ目の吹き出しが答えを待つ段（wait）のゲームで、checkCore が30秒で止まった。4本とも吹き出しの検査を first: false で外して公開した。新作には使われない screens/screens.js が毎回入り、手で消した

## 起きたこと
- 2026-11-27、新作の qa/run.mjs から checkCore を呼ぶと、吹き出しの段を進める所で止まった。
- 吹き出し（#core-coach）は wait の段で答えを待つあいだ隠れるが、中の「やってみる」（.core-coach-go）には hidden が付かない。core-check は `#core-coach .core-coach-go:not([hidden])` を数えていたので、見えないボタンを押しに行った。
- 同じ日、`node scripts/new-game.mjs` が template/screens/ を写した。screens.js は game-core の Core.screens と同じ中身の、ゲーム以外向けの部品。

## 原因
- core-check の見る所が、吹き出しそのものが見えているかを確かめていなかった。核（core.js）の place() は箱だけを隠し、ボタンの hidden は段が替わったときにしか書き直さない。
- new-game.mjs の SKIP は、印で写す部品だけを名前で持っていた。screens/（#650 ごろ足した単体の部品）は印で写す部品ではないので、check-game-wip.mjs の「印の部品が SKIP にあるか」にもかからなかった。

## なぜ見つからなかったか
- ひな形の Selftest で core-check を回すゲームの見本に、wait の段のある吹き出しが無かった。
- template/ の一番上にフォルダを足したとき、ゲームに写すかどうかを決める所が無かった。

## 対策
- [x] 直す: core-check の「やってみる」を `#core-coach:not([hidden]) .core-coach-go:not([hidden])`（定数 GO）だけにした。new-game.mjs の SKIP に screens/ を足した（この PR）
- [x] 防ぐ: `scripts/check-game-wip.mjs` が、template/ の一番上のフォルダが全部 new-game.mjs の SKIP か COPY_DIRS のどちらかにあるかを見る。フォルダを足して決めないと Lint が落ちる（この PR）
- [x] 見つける: `scripts/check-game-wip.mjs` が、core-check.mjs に吹き出しを絞らない `#core-coach .core-coach-go` が戻ったら落とす（この PR）
- [ ] 弱める: first: false で公開した4本（tamatama-atari・onaji-fune・wazato-hantei・yume-kikai）の checkCore を、この PR の写しが届いたあと first を戻して回す（担当: 哲学シリーズの新作7本を作る、期限: 2026-12-04）
