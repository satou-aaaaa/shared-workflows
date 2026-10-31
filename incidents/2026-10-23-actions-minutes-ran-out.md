# 非公開リポジトリの Actions 無料枠を使い切り、CI と自動マージが止まった

- 種類: 公開・CI
- 場所: satou-aaaaa/last-tell-godot（非公開）の qa・Secret scan・自動マージ
- 気づいた人: satou さん
- 影響: 2026-10-23 18:20（日本時間）から、GitHub の機械の仕事が始まらずに 1 秒で失敗になった。PR が自動マージされず、いくつかのスレッドが止まった。無料枠は月 2,000 分で、11/1 まで戻らない。

## 起きたこと
- last-tell-godot の qa（Linux と Windows）を 1 日に何十回も回し、月 2,000 分の無料枠を使い切った（Windows は Linux より高く数える）。
- 枠が切れると qa も、共通部品の Secret scan・自動マージ・CI失敗Issue も GitHub の機械を使うので、全部止まった。

## 原因
- 非公開リポジトリの CI が GitHub の機械しか使えない形だった。共通部品の runs-on が `ubuntu-latest` に決め打ちで、自前ランナー（無料）に切り替える口が無かった。

## なぜ見つからなかったか
- 残りの分数を見る仕組みが無かった。90%・100% のメールは届くが、だれも読む流れに入っていなかった。

## 対策
- [x] 直す: last-tell-godot の qa.yml を、変数 `QA_RUNNER_LINUX`・`QA_RUNNER_WINDOWS` で satou さんの PC の自前ランナーに切り替えられるようにした（last-tell-godot #27）
- [x] 防ぐ: 共通部品 automerge・secret-scan・ci-failure-issue に入力 `runner` を足し、呼び出し元が自前ランナーを選べるようにした（この PR）
- [ ] 見つける: Billing の Actions に予算 $0（超えたら止める）と 75%・90% の通知を入れる（担当: satou さん、期限: 2026-10-24）
- [x] 弱める: 枠が切れている間は、クラウドの作業場で `tools/qa.sh` と gitleaks を回し、全部 ✅ ならエージェントがマージする決まりにした（last-tell-godot の `AGENTS.md`、#27）
