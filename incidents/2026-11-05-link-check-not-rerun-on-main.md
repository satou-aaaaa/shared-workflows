# リンク検査を直したあと main で動かさず、閉じた Issue が開き直した

- 種類: 公開・CI
- 場所: kasane-zome の Link check（週1）・ci-failure-issue の見回り
- 気づいた人: 全リポジトリ巡回
- 影響: kasane-zome で「CI失敗: Link check（main）」の Issue が、閉じた #3 に続いて #6 として開き直した。リンク切れは無く、遊ぶ人への影響も無い。

## 起きたこと
- 2026-11-04 10:37 JST、main の Link check が「リンク0件」で落ち、#3 が開いた（[2026-11-04-link-check-readme-only-main.md](2026-11-04-link-check-readme-only-main.md)）。
- 同じ日に設定を直した PR #4 がマージされ、本文の「Closes #3」で #3 が閉じた。
- Link check は定期と PR でしか動かないので、main では一度も動き直さなかった。main の最新の実行は赤のまま残った。
- 11/5 4:58 JST、ci-failure-issue の見回り（6時間ごと）が main の最新の実行を見て、#6 を開いた。

## 原因
- ひな形の Link check は、このファイルを変えた PR では動くが、マージしたあとの main では動かない。直したかどうかを main で確かめる実行が無い。
- PR の「Closes #N」が、main が緑に戻る前に Issue を閉じた。

## なぜ見つからなかったか
- PR の Link check は緑だったので、直ったように見えた。見回りが開き直すまで、main の赤が残っていることに気づかなかった。

## 対策
- [x] 直す: kasane-zome の Link check を main で手で動かし、緑に戻した（Actions の Run workflow）。#6 は成功で自動で閉じる
- [x] 防ぐ: ひな形 `template/.github/workflows/link-check.yml` に、このファイルが main に入ったら動く `push`（paths 付き）を足した。直した設定のマージで main も緑に戻る（この PR）。kasane-zome にも写した（kasane-zome の PR）
- [x] 見つける: `scripts/drift-check.mjs` が、link-check を呼ぶのに `push` が無いリポジトリを週次まとめに出す（この PR）
- [ ] 直す: 残りのリポジトリの Link check にも `push` を写す（担当: 全リポジトリ巡回、期限: 2026-11-12）
