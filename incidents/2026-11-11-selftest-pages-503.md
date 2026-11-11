# Selftest の公開後の確認の試しが、Pages の 503 で関係の無い PR を赤にした

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows `.github/workflows/selftest.yml` の smoke-script
- 気づいた人: PR #279 の CI
- 影響: 手順書と道具だけの PR #279 が、2回続けて smoke-script で赤になった。遊ぶ人への害は無い。

## 起きたこと
- smoke-script は、tenbin の公開ページ（正常）と、無いページ `no-such-page-selftest.html`（404 のはず）で `scripts/smoke.mjs` を回し、「ok」と「broken」を見分けられるかを見る。
- 2026-11-11 03:53・03:54 UTC の2回とも、正常なページは 200 だったが、無いページに GitHub Pages が 503 を返し、`unreachable` になって落ちた。

## 原因
- `smoke.mjs` は 5xx を「Pages 側の障害（unreachable）」として扱う。試しの検査は、正常なページの unreachable だけを「見分けられないので通す」にしていて、無いページの側の unreachable を考えていなかった。

## なぜ見つからなかったか
- これまで Pages は無いページに必ず 404 を返していて、片側だけが 5xx になることが無かった。

## 対策
- [x] 直す: 無いページそのものが 5xx・つながらないときだけ警告を出して通す（全体の結果でなく、そのページの status を見る）（`.github/workflows/selftest.yml`、この PR）
- [x] 防ぐ: 試しの検査の見分けを、正常なページ・無いページの両方で「Pages の障害なら見分けられないので通す」にそろえた（`.github/workflows/selftest.yml` のコメント、この PR）
