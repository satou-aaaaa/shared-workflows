# CI の時間短縮（週1・木曜朝）

先に `common.md` と `autonomy.md` を読むこと。（satou さんの依頼 2026-10-17「CIの実行時間を減らすための改善活動も定期的に行うようにしてください」）
対象は last-tell・tenbin・carcassonne-research・sandbox・shared-workflows。kotlin-csv は他の人のものなので見ない。
取り消せて、お金がかからず、検査の強さを落とさない改善は、聞かずに PR → CI 緑 → マージまで進め、結果だけ報告する。

## 考え方（調べた要点と出典）

- 待ち時間を短く保つのが CI の要。目安は「PR の検査が10分以内」（Martin Fowler「Continuous Integration」の Keep the Build Fast、https://martinfowler.com/articles/continuousIntegration.html）。
- まず無駄な実行を止める（古い実行の取り消し・関係ない変更で重い検査を回さない）、次に依存のキャッシュ、次に分割して並べる、の順に安く効く
  （GitHub Docs「Control the concurrency of workflows and jobs」https://docs.github.com/en/actions/using-jobs/using-concurrency 、
  「Caching dependencies to speed up workflows」https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows 、Playwright「Sharding」https://playwright.dev/docs/test-sharding ）。
- 必須チェックのワークフローを `on.paths` で丸ごと飛ばすと、チェックが「待ち」のまま残ってマージできなくなる。飛ばすときはジョブの中で判定して成功で終える
  （GitHub Docs「Troubleshooting required status checks」https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/troubleshooting-required-status-checks ）。

## やらないこと

- お金がかかる手（大きい実行機・有料のキャッシュや外部サービス）は使わない（common.md「お金はこれ以上かけない」）。
- 検査を減らす・弱める（テストを飛ばす、件数や対戦数を減らす、PR の検査を夜間へ移す）は、satou さんの品質の方針に関わるので聞かずにはやらない。
  効果が大きい案なら、ask_decision のカード（質問の先頭に「satouさんにお願い：」）で1件だけ聞く。同じ案を2回は聞かない。
- 研究や見張りのためにわざと長く回している予定実行（carcassonne-research の selfplay など）は、長さそのものは対象外。準備の手間（依存の入れ直しなど）だけを見る。
- 他の担当がそのワークフローを直している最中（開いた PR がある、直近3日にマージされた速度の改善がある）なら、そのワークフローは今回は飛ばす。

## 手順

1. 節約モード（common.md）なら、手順2の記録だけして終える。
2. shared-workflows のラベル「CI時間」の最新の Issue（毎週木曜 05:29 JST に CI time report が作る）を読む。無い・古いときは Actions の CI time report を workflow_dispatch で回してから読む。
   チームメモリ `ci-speedup` の「入れた改善」と見比べ、前回入れた改善の前後で中央値がどう変わったかを1行で書き足す。遅くなった・検査が落ちるようになったものは戻す PR を出す。
3. 直す先を1つ（多くて2つ）選ぶ。PR・push で走るワークフローのうち「回数 × 中央値」が大きいものを優先する（人を待たせている時間が長い順）。
   Issue の「遅いステップ」と、そのワークフローのファイル・最新の実行のジョブごとの時間を見て、時間がどこで使われているかを確かめる。
4. 次の順に当てはまるものを探す（安く効く順）:
   - a. 無駄な実行: `concurrency` と PR の `cancel-in-progress` が無い／関係ないファイルだけの変更でも重い検査が回る（ジョブの中で判定して飛ばす）／同じ検査が push と pull_request で二重に回る。
   - b. 準備の時間: `setup-node` / `setup-python` の `cache:`、Playwright のブラウザ、pip・npm の入れ直し、`fetch-depth: 0` の要らない全履歴の取得。
   - c. 並べ方: 長い組を細かく分ける・短い組をまとめる（1組ごとの準備時間と見比べる）。無料枠の同時実行数（20）を超えない。
   - d. 待ちの連鎖: `needs` で順番待ちになっているが、並べて回せるジョブ。
   - e. 検査そのもの: 同じ準備を毎回作り直している、待ち（sleep・固定の待ち時間）が長い、など結果を変えずに速くできるもの。
5. 直す。[pr.md](pr.md)（とリポジトリの CLAUDE.md・steward スキル）に従って PR を作る。共通部品（shared-workflows の `.github/workflows/`）で直せば全リポジトリに効くものは、そちらを直す。
   PR 本文に「前（Issue の中央値）→ 後（その PR 自身の実行時間）」と、調べた要点と出典を1行添える。
6. CI が緑ならマージする（`.github/` を変える PR も同じ。autonomy.md）。last-tell は Auto merge に任せてよい。遅くなった・不安定になったら戻す。
7. チームメモリ `ci-speedup` に「日付・リポジトリ・ワークフロー・何をした・前の中央値・PR」を1行足す（次の回の手順2で効果を見るため）。

## 報告

- マージした改善があるときだけ、このスレッドに reply で1〜3行（何を・どれだけ速くなる見込み・PR のリンク）。
- 何も無ければ update_status を1行更新して no_reply_needed で終える。
