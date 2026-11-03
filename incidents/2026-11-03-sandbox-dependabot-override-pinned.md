# sandbox の Dependabot のセキュリティ更新が、overrides の固定とメジャー違いで6回続けて落ちた

- 種類: 公開・CI
- 場所: sandbox（Dependabot のセキュリティ更新、`package.json` の `overrides`）
- 気づいた人: satou さん（CI 失敗の一覧 10/21〜11/3）
- 影響: 10/28〜10/31 に「Run Dependabot」が main で6回失敗（qs 3・minimatch 3）。中程度の脆弱性 11件（qs・minimatch・glob）が直されないまま残った。PR は1本も作られなかった。

## 起きたこと
- 10/27〜28 に minimatch（GHSA-g3hv-75wg-m249、直った版 11.0.1）と qs（GHSA-6pq8-jhm2-2vcw、直った版 6.16.1）の脆弱性が公表された。
- qs: ログ `@stryker-mutator/core@10.1.1 requires qs@6.16.0 via typed-rest-client@2.3.1`。`overrides` で qs を `6.16.0` に固定していた。
- minimatch: ログ `"latest-resolvable-version": "10.2.6", "lowest-non-vulnerable-version": "11.0.1"`。eslint・Stryker・c8 が `^10.2` を指定。
- Dependabot は直せる道が無いので `security_update_not_possible` で終わり、新しい依存の更新のたびに同じ失敗を繰り返した。

## 原因
- 10/1（#193）に入れた `overrides` を1つの版に固定していたため、その版に次の脆弱性が出ると Dependabot が上げられない。理由と外す条件もどこにも書いていなかった。
- 直った版が上流の指定よりメジャーが上のとき、Dependabot は上げない（semver を守る）。`overrides` で上書きするしか道が無いが、その手順が無かった。

## なぜ見つからなかったか
- Dependabot の実行（dynamic/dependabot）は ci-failure-issue.yml の見張りの外で、Issue にならなかった。
- PR の npm audit は高深刻度以上だけを見るので、中程度のこの3件では落ちず、CI からは見えなかった。

## 対策
- [x] 直す: `overrides` を `minimatch ^11.0.1`・`glob ^14.0.2`・`qs ^6.16.1` にし、`npm audit` を 0件にした。lint・c8・Stryker の1組を動かして確かめた（sandbox #317）
- [x] 防ぐ: `overrides` を1つの版に固定すると落ち、理由の表（`docs/DEPENDENCY_OVERRIDES.md`）に無い上書きでも落ちるテスト `test/dependencyOverrides.test.js` を足した。直す前の package.json で2件不合格を確かめた（sandbox #317）
- [x] 防ぐ: `security_update_not_possible` で落ちたときの手順（上流を上げる → 無ければ範囲の overrides → 上流の道具を動かして確かめる）を `docs/DEPENDENCY_OVERRIDES.md` に書いた（sandbox #317）
