# さいぼうづくりの Site watch が、Pages の API の一時的な失敗を「Pages が有効になっていません」と出して赤になった

- 種類: 公開・CI
- 場所: saibo-tsukuri（共通部品 site-watch.yml）
- 気づいた人: 監督の巡回（CI 失敗の Issue #15）
- 影響: 公開ページは開けていたのに、1日 CI 失敗の Issue が開いたままになった。直し先を「Pages の設定」と誤って示した。遊ぶ人への影響は無い。

## 起きたこと
- 2026-11-28 03:20Z（JST 12:20）の定時の Site watch が「Pages が有効になっていません」で落ち、Issue #15 が立った。
- 前日 19:10Z の公開（pages build and deployment）は成功しており、Pages は有効のままだった。
- 11:09Z に Site watch を手で回し直すと、そのまま緑になった（設定は何も変えていない）。

## 原因
- site-watch.yml は `gh api repos/…/pages` の失敗をすべて「Pages が切れている」と見ていた。エラーの中身（404 か 5xx・時間切れか）を見ず、試し直しもしなかった。
- ページを開く curl には3回の試し直しがあったが、その前の API の読み取りには無かった。

## なぜ見つからなかったか
- 2026-11-04 に「Pages が切れていたら赤にする」を入れたとき（incidents/2026-11-04-pages-never-enabled.md）、404 の場合だけを考え、API の揺れの場合を試す見本が無かった。
- Lint は site-watch.yml の判定を試していなかった（Link check・Post-deploy check には判定の見本の検査があった）。

## 対策
- [x] 直す: saibo-tsukuri の Site watch を回し直して緑にした（Issue #15 は次の成功で自動で閉じる仕組み）。
- [x] 防ぐ: site-watch.yml は 404 のときだけ「Pages が有効になっていません」で落とす。ほかの失敗は3回まで試し、だめなら github.io の決まった形の URL で開いて見る（警告を出す）（この PR）。
- [x] 防ぐ: `scripts/check-site-watch-pages.sh` が、gh api の答えの見本（成功・揺れのあと成功・404・揺れのあと 404・揺れ続け）でこの手順を試し、`scripts/check.sh`（Lint）から毎回回る（この PR）。
