# Secret scan が、gitleaks の取得を GitHub に 403 で断られて赤になった（昔話ならべ）

- 種類: 公開・CI
- 場所: `.github/workflows/secret-scan.yml`（gitleaks を入れる段）・mukashi-narabe
- 気づいた人: 監督の巡回（ci-failure の Issue 昔話ならべ #21 に直す PR が無かった）
- 影響: 昔話ならべの main の Secret scan が1回赤になり、ci-failure の Issue が立った。秘密情報は見つかっていない（調べる段まで進まなかった）。遊ぶ人への影響なし。

## 起きたこと
- 2026-11-22 10:35Z、workflow_dispatch で動いた Secret scan が「gitleaks を入れる」段で `curl: (22) The requested URL returned error: 403` を4回（最初と --retry 3 回）出して止まった。
- 同じ時間帯のほかのゲーム（ことわざあわせ・ききがき手帳・台風よみ）の Secret scan は通っていた。同じコミットのまま回し直すと通った（2回目）。

## 原因
- gitleaks を `github.com/…/releases/download/…` からトークン無しの curl で取っていた。トークン無しの取得は GitHub の側で一時的に 403 と断られることがあり、10秒おき3回の取り直しでは抜けられなかった。トークン付きの取得（GITHUB_TOKEN を使う gh release download）に切り替える逃げ道が無かった。

## なぜ見つからなかったか
- 外から道具を取る段の失敗は、コードの変更と関係なくまれにしか起きない。Lint は「版とチェックサムを固定しているか」は見ていたが、「取れなかったときにもう一つの道があるか」は見ていなかった。

## 対策
- [x] 直す: 昔話ならべの失敗した Secret scan を回し直し、通った（2回目）。
- [x] 直す: `secret-scan.yml` は curl で取れなければ、`GH_TOKEN: github.token` 付きの `gh release download` で間をあけて3回まで取り直す。チェックサムの確かめはそのまま（この PR）。
- [x] 防ぐ: `scripts/check-release-download.mjs`（check.sh と Lint）が、ワークフローで releases/download を curl で取っているのに gh release download での取り直しが無いと落とす。直す前の secret-scan.yml で落ちることを確かめた（この PR）。
- [x] 見つける: これまでどおり ci-failure の Issue と監督の巡回で気づく。取り直しに入ったときは `::warning::` を出し、実行の画面に残る（この PR）。
