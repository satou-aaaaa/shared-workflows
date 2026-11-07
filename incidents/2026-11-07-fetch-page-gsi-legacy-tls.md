# Fetch page が国土地理院のページを古い TLS のせいで読めなかった

- 種類: 権限・設定
- 場所: shared-workflows の Fetch page（`.github/workflows/fetch-page.yml`）
- 気づいた人: スレッド「日本の地形あてゲームを作る」
- 影響: 2026-11-07 に1回失敗。新作の山のデータ（国土地理院「日本の主な山岳標高」）を読めず、作業が止まった。

## 起きたこと
- 2026-11-07 01:49 UTC、`www.gsi.go.jp` のページを Fetch page で読もうとして、robots.txt を読む所で `UNSAFE_LEGACY_RENEGOTIATION_DISABLED` で落ちた。
- クラウドのセッションからは gsi.go.jp に届かないので、ほかの道が無かった。

## 原因
- 国土地理院のサーバーは古い TLS の再ネゴシエーションしか話さず、OpenSSL 3（Python・curl）は既定で断る。Fetch page にはサイトごとにそれを許す設定が無かった。

## なぜ見つからなかったか
- Fetch page はこれまで e-Gov と docs.github.com にしか使っておらず、古い TLS のサイトに当たったことがなかった。

## 対策
- [x] 直す: `LEGACY_TLS_HOSTS` に挙げたサイトだけ、robots.txt（Python）と本文（curl の `OPENSSL_CONF`）で古い再ネゴシエーションを許す（この PR、`.github/workflows/fetch-page.yml`）
- [x] 防ぐ: `routines/known-limits.md` に「古い TLS で落ちたら `LEGACY_TLS_HOSTS` に1行足す（ほかの検証は弱めない）」を足した（この PR）
