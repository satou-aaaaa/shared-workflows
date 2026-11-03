# sandbox で新しく公表された脆弱性が、関係のない Dependabot の PR 5本を npm audit で止めた

- 種類: 検査の見逃し
- 場所: sandbox の Test（`npm audit（高深刻度以上）`）
- 気づいた人: satou さん（CI 失敗の一覧 10/21〜11/3）
- 影響: 10/24 に jsdom・@playwright/test・docx・eslint・agent の SDK の更新 PR 5本が同時に赤になり、#307 で直るまで2日止まった。

## 起きたこと
- 10/24 00:13、5本の Dependabot の PR の Test が `zod <4.6.6 Severity: high`（GHSA-mrhx-c7xc-m3w5）で落ちた。どの PR も zod を変えていない。
- 10/26 の #307 が `npm audit fix` で直し、5本は通るようになった。

## 原因
- PR の検査が、PR の差分ではなく依存の木全体に `npm audit --audit-level=high` をかけていた。公表された瞬間に、中身と関係なく全部の PR が落ちる。
- main で前から壊れているものを PR で知らせる形で、main 側に知らせる仕組み（Issue）が無かった。

## なぜ見つからなかったか
- 公表の無い日は木全体でも PR でも結果が同じなので、違いが表に出なかった。

## 対策
- [x] 直す: `scripts/audit-gate.mjs` を作り、PR では取り込み先の lockfile と比べて「その PR が持ち込んだ」高深刻度以上だけで止め、前からあるものは警告にした（GitHub の dependency review と同じ考え方）。基準が読めないときは全部止める（sandbox #317）
- [x] 見つける: Nightly に npm audit のステップを足し、毎晩 main の木全体を見る。落ちると ci-failure-issue.yml が Issue にまとめ、次に通れば閉じる。main の push の Test も今までどおり木全体で落とす（sandbox #317）
- [x] 防ぐ: 判定のテスト `test/auditGate.test.js`（前からあるものは通す・持ち込んだものは止める・基準なしは全部止める・npm audit の失敗は投げる）。変更前の main を head にして、基準ありは終了コード0・基準なしは1を確かめた（sandbox #317）
