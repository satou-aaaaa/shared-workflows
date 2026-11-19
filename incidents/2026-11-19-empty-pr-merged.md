# push が断られたのに気づかず、変更の無い PR（#537）をマージした

- 種類: 手順の抜け
- 場所: shared-workflows #537（node-test・codeql の共通部品の直し）
- 気づいた人: akashi-lang #6 の CodeQL が「fail-on-alert is not defined」で起動できなかった（Claude）
- 影響: #537 は中身が空のままマージされ、Node の保守の確かめ・npm audit・CodeQL の fail-on-alert が main に入っていなかった。akashi-lang #6 の CodeQL が起動に失敗した。ほかのリポジトリへの影響は無し（呼び方は変わっていない）。

## 起きたこと
- 前の PR（#536）をマージしたあとの同じ名前の枝に、新しいコミットを push した。リモートの枝には #536 の古いコミットが残っていて、push は「non-fast-forward」で断られた。
- push の結果を確かめず、リモートの古い枝のまま PR #537 を作った。差分は空だったが、検査は全部通り、そのままマージした。

## 原因
- push を `git push … && break` の繰り返しで回し、3回とも断られても、最後の sleep の終了コード 0 で「成功」に見えていた。
- 枝を作り直す決まり（マージ済みの枝は main から作り直す）を、手元の枝にだけ当て、リモートの枝の先と比べていなかった。

## なぜ見つからなかったか
- 変更の無い PR でも、Lint・Selftest はどれも通る（見るものが無いので落ちない）。必須チェックに「変更があるか」が無かった。
- PR の本文は手元のコミットから書いたので、中身が無いことが本文からは分からなかった。

## 対策
- [x] 直す: 枝を main から作り直して push し直し、新しい PR で入れ直した（この PR の次の PR）
- [x] 防ぐ: Lint の必須チェック actionlint に「PR に変更があるか」を足した。変更が0のファイルの PR は落ちる（`.github/workflows/lint.yml`、この PR）
- [x] 見つける: push のあとは `git ls-remote origin <枝>` の先が手元の `git rev-parse HEAD` と同じかを確かめてから PR を作る、を PR の手順に足した（`routines/pr.md`、この PR）
