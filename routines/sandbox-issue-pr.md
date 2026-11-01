# sandbox の Issue/PR 定期対応（kensetsu-kyoka-toolkit、月曜 4:35 JST）
<!-- style: v1 -->

（2026-11-01 satou-aaaaa/sandbox の `docs/routines/issue-pr.md` からここへ移した。sandbox がプロジェクトのリポジトリから外れ、ルーティンが手順書を読めずに止まったため。incidents/2026-11-01-sandbox-routine-repo-missing.md）

## 目的

satou-aaaaa/sandbox（kensetsu-kyoka-toolkit）のオープンな Issue・PR を確認し、規約どおりに対応する。対応するものが無ければ、その旨を1行で報告して終える。

## 使う道具

- `mcp__claude-code-remote__add_repo`（owner `satou-aaaaa`、repo `sandbox`、access `push`）。ほかの AI・人は、書き込みできる sandbox のクローンを用意する（[tool-map.md](tool-map.md)）。
- git・Node.js（`npm ci`・`npm test`・`npm run typecheck`・`npm run lint`）。
- GitHub の PR・Issue 操作（GitHub MCP、使えなければ `gh`）。
- 返事はスレッドへの返信（置き換え先は [tool-map.md](tool-map.md)）。

## 手順

1. `add_repo` で sandbox を `access: push` で足す。断られたら、何もせずに「sandbox を足せなかった」と理由を添えて報告して終える。
2. 返ってきた場所（ふつうは `/home/user/sandbox`）に `git clone --depth 50 https://github.com/satou-aaaaa/sandbox` する（あれば `git pull`）。
3. sandbox の `AGENTS.md` を読む（ビルドレスJS+JSDoc、外部送信禁止、判定ロジックに法令根拠を書く、単一JSONファイル保存、Git の運用、テストのコマンド）。
4. 聞くか聞かないかは [autonomy.md](autonomy.md) に従う。
5. オープンな PR を一覧する。1件ずつ下の「PR の分岐表」に当てはめて対応する。
6. オープンな Issue を一覧する。まだ対応していない（自分のコメントも、紐づく自分の PR も無い）ものを、1件ずつ下の「Issue の分岐表」に当てはめて対応する。
7. 最後に、見つけたもの・したこと・しなかった理由を短くまとめて報告する。

### PR の分岐表

| もし | すること |
| --- | --- |
| Dependabot の patch/minor 更新 | 何もしない（`dependabot-automerge.yml` が自動でマージする） |
| Dependabot のメジャー更新で、CI が緑 | 下の「メジャー更新の確かめ」をしてからマージする（squash・ブランチ削除） |
| Dependabot の PR で、失敗が `npm audit signatures` の `EMISSINGSIGNATUREKEY` だけ | 失敗したジョブだけ再実行し、緑になったらマージする |
| Dependabot の PR で、それ以外の失敗 | マージしない。エラーの文を引用して、マージしない理由を PR にコメントする |
| Dependabot の PR でコンフリクト（`mergeStateStatus: DIRTY`） | `@dependabot rebase` とコメントする。package.json・package-lock.json を手で直さない |
| このルーティンが前に作った PR で、CI が緑・コンフリクト無し | マージする（「`agent/` は保護パスのため人手マージ」とあってもよい。2026-09-30 satou さんの包括承認） |
| このルーティンが前に作った PR で、`agent/policy.js` のガードレール（許可リスト・保護パス・日次上限・キルスイッチ・レビュー/リバートの判定）を弱める・迂回するように見える | マージしない。satou さんに確かめる |
| このルーティンが前に作った PR で、コンフリクト（`dirty`） | 下の「コンフリクトの直し方」で直し、CI を待ってからマージする |
| Dependabot でも自分でもない人の PR | マージしない。要約・気になる点・安全そうかを PR にコメントし、判断は satou さんに任せる |
| どれにも当たらない | 止めて、その PR にコメントで状況を書き、報告に載せる |

### メジャー更新の確かめ

1. CI が確かめていない道具か調べる（例: Stryker は `npm run test:mutation` だけで動き、CI に無い）。
2. CI が確かめていれば、ここで終わり。
3. 確かめていなければ `git worktree add /tmp/pr-check-<N> origin/<ブランチ名>` する。
4. その中で `npm ci` する。
5. その道具を1ファイルに絞って動かす（例: `npx stryker run --mutate "src/succession/heirs/fraction.js"`）。
6. 正しく動けばマージする。動かなければマージせず、PR に結果をコメントする。
7. `git worktree remove /tmp/pr-check-<N> --force` で片付ける。

### コンフリクトの直し方（自分が作った PR だけ）

共通の手順は [pr.md](pr.md) の「コンフリクトを直す」。sandbox では加えて次を守る。

1. `git worktree add /tmp/pr-<N> origin/<ブランチ>` の別の場所で作業する。
2. 判定ロジック（合否・reasons・warnings）か `agent/policy.js` のガードレールが両側で違う形に変わっていたら、機械的に混ぜない。決められなければマージを保留し、PR にその旨をコメントする。
3. 直したら `npm ci`・`npm test`・`npm run typecheck`・`npm run lint` を通す。
4. force なしで push する。
5. `git worktree remove /tmp/pr-<N> --force` で片付ける。

### Issue の分岐表

| もし | すること |
| --- | --- |
| 規約に合う、範囲のはっきりしたバグ報告・機能要望で、法令根拠を e-Gov 法令検索（https://laws.e-gov.go.jp ）で確かめられる | 下の「Issue を直す流れ」で PR を作ってマージまで進める |
| あいまい・要確認、または satou さんの業務判断・法的判断が要る（ビルドレス構成の変更、外部送信の追加、人のレビューを省く、一次資料で根拠を確かめられない判定ロジック） | 実装しない。確かめたい点・実装しない理由を Issue にコメントする |
| AGENTS.md の譲れない前提に反する（人のレビューの自動化・省略、自動提出・自動押印、外部への通信の追加） | 実装しない。合わない理由を Issue にコメントする |
| どれにも当たらない | 実装しない。迷った点を Issue にコメントし、報告に載せる |

### Issue を直す流れ

1. 似た既存コードを数件読み、形を合わせて直す。
2. `npm test`・`npm run typecheck`・`npm run lint` を手元で通す。
3. 作業ブランチを切って push し、Issue 番号を説明に書いた PR を作る。
4. CI を待つ。緑ならマージする（squash・ブランチ削除）。
5. `dirty` なら「コンフリクトの直し方」で直し、4 に戻る。
6. 失敗が `EMISSINGSIGNATUREKEY` だけなら再実行し、緑ならマージする。
7. 実装のせいで失敗したら直して 2 に戻る。3回直しても通らなければマージせず、Issue と PR に状況をコメントし、次の回に持ち越す。
8. マージしたら Issue に完了のコメントを書く。

## 完了条件

- オープンな PR・Issue の全部が、分岐表のどれかの行で対応済み（マージ・コメント・何もしない）になっている。
- 自分が push したものは、push の前に `npm test`・`npm run typecheck`・`npm run lint` が通っている。
- 報告に、見つけたもの・したこと・しなかった理由が書いてある。対応するものが無ければ、その1行だけでよい。

## やってはいけないこと

- Issue・PR を自分で閉じない（マージで Issue が自動で閉じるのはよい）。
- force push・履歴の書き換えをしない。
- マージする PR のブランチ以外を消さない。
- CI が緑なことを「内容が正しい」証拠にしない。法令根拠を一次資料で確かめられない判定ロジックは実装しない。
- 仕事を無理に作らない。
- コミット・PR・コメントは sandbox の既存の日本語の書き方と用語に合わせ、違う文体にしない。
