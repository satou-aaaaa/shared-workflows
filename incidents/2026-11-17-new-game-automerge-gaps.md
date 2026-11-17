# ひな形から始めた新作の自動マージに、Secret scan の待ちと問題の表の保留が抜けていた

- 種類: 権限・設定
- 場所: `template/.github/workflows/automerge.yml`・`template/.github/workflows/post-deploy.yml`、新作 gairai-miwake
- 気づいた人: CodeRabbit（gairai-miwake #1 のレビュー、2026-11-17）
- 影響: マージ前に直したので、遊ぶ人への影響は無い。そのままだと、QA だけ ✅ で Secret scan の前に自動マージされうる・問題の表（data.js）を変える PR が CodeRabbit を待たずに自動マージされうる形だった。

## 起きたこと
- gairai-miwake を `new-game.mjs` で template/ から始めた。template/ の automerge.yml は require_checks が `qa / qa` だけで、「Secret scan を入れたリポジトリは scan / scan も足す」というコメントだけがあった。template/ には secret-scan.yml も入っているので、新作は必ず足す必要があった。
- hold_paths は template/ の automerge.yml に無く、post-deploy.yml は `sw.js|manifest.webmanifest` だけだった。写し元の kenpo-shikumi は手で `data.js` を足していた。

## 原因
- ひな形が「必ず要る設定」をコメントの指示で済ませ、値を入れていなかった。

## なぜ見つからなかったか
- drift-check は「scan / scan があるのに Secret scan で起きない」は見ていたが、「Secret scan があるのに scan / scan が無い」と「data.js があるのに hold_paths に無い」は見ていなかった。新作の PR #1 の drift-check は「ずれなし」だった。

## 対策
- [x] 直す: gairai-miwake #1 に scan / scan と hold_paths（data.js）を入れた
- [x] 防ぐ: template/ の automerge.yml に scan / scan と hold_paths を値で入れ、post-deploy.yml の hold_paths に data.js を足した（この PR）
- [x] 見つける: drift-check に `automerge:scan-required`・`automerge:hold-data` を足した（この PR。直す前の gairai-miwake で両方出ることを確かめた）
