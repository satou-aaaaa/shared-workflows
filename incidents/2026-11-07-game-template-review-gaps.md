# ゲームのひな形（template/）に、新作の PR のレビューで穴がまとめて見つかった

- 種類: 検査の見逃し
- 場所: shared-workflows の template/（scripts/setup.sh・transfer.js・qa/a11y.mjs・.github/workflows/）と共通部品（post-deploy・add-ruleset・create-repo）
- 気づいた人: CodeRabbit（kikigaki-techo #1・bousai-handan #1 のレビュー）
- 影響: 遊ぶ人の記録が消えた・公開が壊れたという報告は無い。起こりえたのは、保存に失敗した端末から古い記録を引き継ぐ・低いコントラストを見逃す・Dependabot の更新が検査の前にマージされる・月1の Setup check が落ちても気づかない、など。

## 起きたこと
- 2026-11-07、新作2本の PR #1 のレビューで、各ゲームが写しているひな形の部分に十数件の指摘が出た。ゲームの側では「写しなので直さない」決まりのため、直されないまま残っていた。
- 中身：見張りの一覧に Setup check が無い／QA を共通部品で呼ばず各ゲームが手順を写している（9本は actions の版を SHA で固定していなかった）／setup.sh が QA の最中に node_modules を消す・空白のある場所で切れる・Linux のライブラリ不足や合わないブラウザでも「準備できた」と言う／transfer.js が保存の失敗後に古い記録でコードを作る・長すぎる貼りつけを CRC を計ってから弾く・縮めないコードを選べない・コピーのあと操作の場所が戻らない／a11y.mjs が不透明な背景より上の親の opacity を見ない／main に必須チェックが無く Dependabot の自動マージ（--auto）が検査を待たない／公開後の確認の差し戻しが点検の要るファイル（sw.js など）も自動でマージする。

- 同じ日に chikei-ate #1 でも4件（nvm use の前に nvm.sh を読む案内が無い・いつも付いている影でフォーカス枠の検査が通る・SessionStart が resume で動かない・URL のコードの途中の空白で読めない）と、引き継ぎのあと古いタブが手元の記録で上書きしうる件が出た。

- さらに同じ日、kikigaki-techo・akushitsu-miyaburi・mukashi-narabe・gogen-suiri の PR #1 でも、ひな形への指摘が出た：setup.sh の埋める `<>` と Python の節を写し残すと Setup check が止まる・NODE_ENV=production で playwright が入らない／ci-failure の見張りに CodeQL・Labels・Branch cleanup が無い／HK0 の検査が形しか見ない・HK0 の長さを base64 を戻す前に見ない・控えに戻すと戻す前が空のとき控えが消える／a11y.mjs が span の中の字の切れ・Tab がどこにも届かない場合・aria-hidden の中の知らせ・壊れた設定のあとダイアログが開くか、を見ない／公開後の確認が 404 だけでも差し戻す。

## 原因
- ひな形を直す道が「ゲームの PR のレビューで写しへの指摘が出る → 写しは直さない」で止まり、ひな形へ戻す担当がいなかった。指摘は新作が出るたびに同じものが繰り返されていた。
- ひな形の検査（check-setup-template.sh・check-transfer.mjs）は、前に起きたことだけを見ていて、ブラウザを本当に起動する・保存に失敗する・opacity の重なり、は見ていなかった。a11y.mjs の測り方には検査が無かった。
- ルールセットは「削除・force push 禁止」だけを入れる決まりで、必須チェックは作ったときの考えから抜けていた。Dependabot の自動マージの部品は「必須チェックが要る」と書いていたが、入っているかを見る仕組みが無かった。

## なぜ見つからなかったか
- drift-check は「写しがひな形と同じか」を見るので、ひな形そのものの穴は見えない。
- ci-failure-issue の見張りの一覧は手で書き写すだけで、main で動くワークフローと突き合わせる検査が無かった。

## 対策
- [x] 直す: ひな形を直した（setup.sh 版5・transfer.js 引き継ぎの版7・a11y.mjs・qa.yml を共通部品 game-qa の呼び出しに・ci-failure-issue に Setup check・secret-scan と qa に workflow_dispatch・post-deploy に hold_paths と recheck）。フォーカス枠は選ぶ前と後を比べる、SessionStart は startup|resume、引き継いだらほかのタブを読み直させる。Add ruleset・Create repo が必須チェック（qa / qa・scan / scan）と Allow auto-merge を入れ、あるルールセットにも足せるようにした（この PR）。公開中のゲームへ配り、必須チェックを入れた。
- [x] 直す: （2回目）setup.sh 版6（埋める `<>` を無くし、そのまま写して動く・Python の節は requirements.txt があるときだけ・`npm ci --include=dev`）、ci-failure の見張りに CodeQL・Labels・Branch cleanup、引き継ぎの版8（HK0 の長さ・空の控え）、a11y.mjs（span の中の字・Tab が届くか・隠れた知らせを数えない・壊れた設定のあと開くか）、post-deploy（ファイルがあるのに 4xx なら差し戻さない）。公開中の26本へ配った
- [x] 見つける: （2回目）drift-check の `setup:placeholder` が引用符の中の `<…>` も、`setup:python` が requirements.txt の無い Python の節を出す。`check-setup-template.sh` に NODE_ENV=production と requirements.txt 無しを、`check-transfer.mjs` に HK0 の長さと空の控えを、`template/qa/transfer-check.mjs` に HK0 を取り込んで中身が同じか・保存に失敗したらコードを作らないかを足した
- [x] 直す: （3回目）setup.sh 版7：package.json に Playwright があるのに読み込めないときは止める（起動の試しを黙って飛ばして「✓」を出していた。kotowaza-awase #1 の CodeRabbit）。公開中の26本の PR にも入れた
- [x] 見つける: （3回目）`check-setup-template.sh` の 12 番で、読み込めない Playwright に「✓」を出さないかを見る。版を7に上げたので drift-check が古い写しを出す
- [x] 防ぐ: AGENTS.md に `@main` で呼ぶ理由を書いた。ゲームの QA は写しでなく共通部品で呼ぶ（版の固定・時間切れの直しが一度で届く）。
- [x] 見つける: `scripts/check-setup-template.sh` に起動の失敗・空白の場所・入れ直さない場合を、`scripts/check-transfer.mjs` に保存の失敗・HK0・長すぎる貼りつけを足した。`scripts/check-a11y-contrast.mjs`（Selftest）が親の opacity の見本で測り方を確かめる。`scripts/check-template-watch.mjs`（Lint）がひな形の見張りの一覧の抜けを、`scripts/drift-check.mjs` が各リポジトリの見張りの抜け・game-qa を呼ばない QA・ゲームの必須チェックの抜けを出す。
- [x] 見つける: （追記・haku-uchi の写し直し）写すときに setup.sh の引用つきの `next="<…>"` と、使わない Python の節（無い requirements.txt を読んで準備が落ちる）が残った。`scripts/drift-check.mjs` が引用つきの `<…>` と、リポジトリに無いファイル（requirements.txt・.python-version・.nvmrc）を読む節を出す。
