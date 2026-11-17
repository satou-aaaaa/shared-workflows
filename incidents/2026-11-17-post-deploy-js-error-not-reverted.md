# 公開後の確認が、JavaScript のエラーで壊れた版を「公開側の問題」と取りちがえ、差し戻さないところだった

- 種類: 公開・CI
- 場所: shared-workflows `.github/workflows/post-deploy.yml`（全ゲームの Post-deploy check）
- 気づいた人: gensen-ikura #1 の CodeRabbit
- 影響: 開ける（200）のに JavaScript のエラーが出るページを公開したとき、差し戻しの PR を作らず、壊れた版を公開したままにする作りだった。今のところ、この判定で残った壊れた版は見つかっていない（公開後の確認はどれも ok か 4xx だった）。

## 起きたこと
- 2026-11-07 gogen-suiri #1 のレビューで、「404 だけでエラーが無く、ファイルもこの版にあるなら公開側の問題」とする判定を足した。
- その jq の条件 `(.status < 400 or .status >= 500) or (.errors | length) == 0` は、200 のページならエラーがあっても真になる。
- そのため 200＋エラーの壊れた版は「公開側の問題」へ進み、4xx のページが無いので missing=0 のまま、公開を起こし直して終わっていた。

## 原因
- 「4xx のときだけ公開側を疑う」つもりの条件が、4xx でないページ（200）をまるごと素通りさせていた。条件を書いた人の読みと、jq の真偽が食い違っていた。

## なぜ見つからなかったか
- 判定の条件を、ページの見本で試す検査が無かった（Link check の判定には `scripts/check-link-check-judge.sh` があったが、Post-deploy には無かった）。
- 実際の公開で 200＋エラーが起きておらず、動きで気づく機会が無かった。

## 対策
- [x] 直す: 条件を `.status >= 500 or (.errors | length) == 0` にし、`PUBLIC_SIDE` という名前にした（この PR）
- [x] 見つける: `scripts/check-post-deploy-judge.sh` が `PUBLIC_SIDE` を post-deploy.yml から読み、200＋エラー・2ページ目のエラー・4xx＋エラーは差し戻し、エラーの無い 4xx・5xx は公開側、を見本で試す。Lint（`scripts/check.sh`）で毎回動く（この PR）
