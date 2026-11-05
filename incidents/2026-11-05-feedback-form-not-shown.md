# 感想のリンクを押してもフォームが出ず、白紙の Issue になった

- 種類: 検査の見逃し
- 場所: 各ゲームの `.github/ISSUE_TEMPLATE/feedback.yml`（ひな形 `template/.github/ISSUE_TEMPLATE/feedback.yml` の写し）
- 気づいた人: CodeRabbit（あみだ配達の PR）・ゲーム作成のスレッド
- 影響: ゲーム8本（wagamama-burger・kabu-news・batsu-doko・kasane-zome・rosen-hitofude・seiza-tsunagi・kippu-10・bento-zume）で「感想を送る」を押すと、楽しさ・よかった所・直してほしい所の項目が出ず、白紙の Issue の画面になった。感想は1件も届いていなかった。

## 起きたこと
- 2026-11-03 ひな形の feedback.yml を `name: 感想` で作り（#115）、各ゲームに写した。
- 2026-11-05 kabu-news で `issues/new?template=feedback.yml` を開くと白紙の Issue になるのを確かめた。
- あみだ配達で `name: 感想フォーム` に変えてマージすると、同じリンクでフォームが出た。

## 原因
- フォームの `name` が「感想」の2字だった。GitHub の決まり（[Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)）には長さの決まりは書かれていないが、2字では出ず、5字に変えると出た（試した結果。GitHub 側の詳しい理由は分かっていない）。
- 決まりに書かれていない動きなので、YAML の形の検査では見つからない。

## なぜ見つからなかったか
- ひな形を作ったとき・写したとき、実際に GitHub でリンクを開いてフォームが出るかを確かめなかった。ゲームの QA は「リンクがあるか」だけを見ていた。
- ひな形と写しのずれを見る drift-check が、Issue フォームを見ていなかった。

## 対策
- [x] 直す: ひな形と8本の feedback.yml を `name: 感想フォーム` にした（この PR と各ゲームの PR）
- [x] 防ぐ: `scripts/check-issue-forms.mjs` が、ひな形の Issue フォームに name・description・body（markdown 以外の項目）があり、name が3字以上かを見る。check.sh と CI の Lint が呼ぶ（この PR）
- [x] 見つける: `scripts/drift-check.mjs` が、各リポジトリの Issue フォームの形と、feedback.yml の name がひな形と同じかを週次まとめに出す（この PR）
- [x] 直す: kabu-news・wagamama-burger にラベル「感想」が無く、フォームから送ってもラベルが付かなかった（labels.yml が「感想」を足す前に動いたきりで、次は月1の見回り）。Labels を手で動かした
- [x] 見つける: `scripts/drift-check.mjs` が、Issue フォームの `labels:` にあるラベルがリポジトリに無いと週次まとめに出す（2本目の PR）
- [x] 直す: 確かめた。マージ後の kabu-news で `issues/new/choose` に「感想フォーム」が出て、`?template=feedback.yml` で楽しさ・よかった所の項目が出た
- [x] 防ぐ: ひな形を直したらマージ後に `issues/new/choose` と `issues/new?template=feedback.yml` を開いてフォームが出るか確かめる（`routines/game-feedback.md` に1行足した）
