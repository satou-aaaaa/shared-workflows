# 写して作ったゲームの manifest の説明と感想フォームの入力例が、写し元のゲームの文のまま残った

- 種類: 検査の見逃し
- 場所: 期限当てのゲーム（gyosei-kigen・zeimu-kigen・kuruma-kigen・kazoku-kigen・hataraku-kigen）と、岩石なかま分けから写したゲーム（感想フォームだけ）
- 気づいた人: CodeRabbit（kazoku-kigen#1 のレビュー）
- 影響: 公開中の行政・税・車と免許の期限で、ホーム画面に入れたときのアプリの説明が「審査請求・取消訴訟・情報公開」のままだった。岩石なかま分けから写した20本ほどで、感想フォームの「よかった所」の入力例が「片麻岩と結晶片岩のちがいがわかった」のままだった。遊ぶこと・記録には影響なし。

## 起きたこと
- 前のゲームを写して新作を作るとき、`manifest.webmanifest` の `description` と `.github/ISSUE_TEMPLATE/feedback.yml` の入力例を書き直さなかった。

## 原因
- 手で書き直す場所の一覧（`routines/game-dev-detail.md` A 手順5、incidents/2026-11-18-game-copy-hand-written-text.md で足した5か所）が `index.html` の中だけで、ほかのファイルの手書きの文を入れていなかった。

## なぜ見つからなかったか
- QA の「写し元の言葉が残っていない」検査は `index.html` だけを見ていた。manifest は `name` だけ、感想フォームは `name` と聞く項目だけを見ていた。

## 対策
- [x] 直す: 期限当ての5本の manifest の説明を OGP の説明と同じ文にし、感想フォームの入力例をそのゲームの種類の名前で書き直した（kazoku-kigen#1・hataraku-kigen#1 と、gyosei・zeimu・kuruma の直しの PR）
- [x] 防ぐ: 5本の `qa/run.mjs` に「感想フォームの入力例に、このゲームの種類の名前（`G.KINDS` の `name`）が入っている・manifest の説明が OGP の説明と同じ」検査を足した
- [x] 防ぐ: `routines/game-dev-detail.md` A 手順5 の手書きの場所に、manifest の説明と感想フォームの入力例を足した（この PR）
- [ ] 直す: 岩石なかま分けから写したほかの14本の感想フォームの入力例（shared-workflows#519 に一覧） 担当: 新作ゲームを作るスレッド 期限: 2026-11-25
