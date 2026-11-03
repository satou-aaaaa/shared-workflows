# Fetch page が、Actions を拒む e-Gov を5回続けて読みに行って落ちた

- 種類: 権限・設定
- 場所: shared-workflows の Fetch page（`.github/workflows/fetch-page.yml`）
- 気づいた人: satou さん（CI 失敗の一覧 10/21〜11/3）
- 影響: 10/21〜10/22 に main で5回失敗（どれも `laws.e-gov.go.jp` で `HTTP 403`）。法令の本文は読めず、satou さんの PC で読む回り道になった。

## 起きたこと
- 10/21 17:13〜17:18 に3回、10/22 00:30 に2回、e-Gov の法令ページと法令 API を workflow_dispatch で読みに行き、どれも `HTTP 403` で落ちた。
- 10/22 に known-limits.md へ「e-Gov は Actions からも 403。satou さんの PC で読む」を足し（#69）、それからは起きていない。

## 原因
- e-Gov は海外のサーバー（クラウド・Actions）を拒んでいる。Fetch page はクラウドで開けないページを Actions から読む部品だが、拒んでいるサイトも「拒まなくなったか確かめるため」に許す一覧へ残していた。
- 403 が返ったときに「拒まれた。回り込まない・叩き直さない」と言う決まりが部品にも手順にも無く、エージェントが URL を変えて繰り返した。
- 名乗り（User-Agent）が `Mozilla/5.0 (…)` で始まり、ブラウザに見える形だった。robots.txt も見ていなかった。

## なぜ見つからなかったか
- Fetch page は手で起こす部品で、失敗は起こしたエージェントにしか見えず、同じ壁に当たったことが次のエージェントに伝わらなかった（known-limits.md ができる前）。

## 対策
- [x] 直す: e-Gov を `DENIED_HOSTS` に移し、相手に送る前に止めて known-limits.md の回り道を案内する（この PR）
- [x] 防ぐ: 読む前に robots.txt（RFC 9309）を確かめ、許されていないページ・robots.txt が 401/403/5xx のサイトは読まない。名乗りを部品の名前と URL にした。403・429 が返ったら再試行・名乗りの変更・回り込みをせず known-limits.md と DENIED_HOSTS に足すよう、エラーで案内する（この PR、`.github/workflows/fetch-page.yml`）
- [x] 防ぐ: known-limits.md に「サイトに拒まれたら回り込まない」の決まりを足した（この PR、`routines/known-limits.md`）
