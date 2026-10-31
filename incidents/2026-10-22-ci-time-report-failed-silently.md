# CI の時間の週1集計が GitHub の一時的なエラーで落ち、どこにも知らせが出なかった

- 種類: 公開・CI
- 場所: satou-aaaaa/shared-workflows の CI time report（毎週木曜 05:29 JST）
- 気づいた人: CI の時間短縮のルーティン（集計の Issue が先週のままだった）
- 影響: 10/22 の集計 Issue が作られず、時間短縮のルーティンが先週の数字のまま動くところだった。回し直して約1時間遅れで作れた（#70）。

## 起きたこと
- 10/22 05:29 JST の回で、集計は終わったが、Issue を作る段の gh が「GraphQL: Something went wrong」で落ちた（GitHub 側の一時的なエラー）。
- 先週の Issue は閉じられず、新しい Issue も無いまま、ワークフローは赤で終わった。
- 10:26 の時間短縮のルーティンが、Issue が古いことに気づいて回し直し、通った。

## 原因
- Issue を作る・閉じる gh の呼び出しに、一時的なエラーのやり直しが無かった。

## なぜ見つからなかったか
- shared-workflows 自身の定期のワークフロー（週次まとめ・CI time report・Scorecard）は、ci-failure の Issue を立てる見張りの対象に入っていなかった。各リポジトリには見張りを入れていたが、部品を置いているこのリポジトリだけ抜けていた。

## 対策
- [x] 直す: CI time report を回し直して 10/22 の集計を作った（#70）
- [x] 防ぐ: CI time report の Issue の操作を3回までやり直し、同じ日の Issue が2件にならないようにした（この PR）
- [x] 見つける: このリポジトリ自身の定期のワークフローも、main で落ちたら ci-failure の Issue が立つようにした（`.github/workflows/watch-failures.yml`）
- [x] 見つける: CI の時間短縮のルーティンは、集計の Issue が無い・古いときに回し直してから読む（`routines/ci-speedup.md` の手順2）
