# bootstrap/ — AI プロジェクト一式の立ち上げ直し

satou-aaaaa の「アプリを自律的に開発するエージェントと、それを見守る監督エージェント」の仕組みを、
このリポジトリだけを手がかりに、何も無いところから立ち上げ直すための手順書とひな形。
（2026-10-18 satou さん「shared-workflows を参照すれば、今の AI プロジェクトを立ち上げられる、というレベルにしてほしい」「agent のチェック機構等も」）

手順の本文はここに重ねて書かない。各部品の正（手順書・CI の部品）への道案内と、立ち上げるときにしか要らない情報（ルーティンの定義・プロジェクト指示・メモリの構成・スキルの控え）だけを置く。

| ファイル | 中身 |
| --- | --- |
| この README | 立ち上げの順番と、立ち上がったかの確かめ方 |
| [project-instructions.md](project-instructions.md) | claude.ai プロジェクトの「プロジェクト指示」のひな形 |
| [memory.md](memory.md) | プロジェクトメモリの構成（MEMORY.md の索引と、話題ごとのファイル） |
| [routines.md](routines.md) | ルーティン（定期実行）の定義の一覧と作り方 |
| [checks.md](checks.md) | エージェントのチェック機構の一覧（何を見つけるか・どこにあるか・立ち上げで要るもの） |
| [skills/](skills/) | 共通スキルの控え（propose_skills で保存し直す元） |

個人情報を扱う作業（朝のタスク整理・転職・連載・動画など）は公開リポジトリであるここには置かない。立ち上げ直すときは、それぞれのプロジェクトの共有フォルダから戻す。
内部の ID（ルーティン・セッション・プロジェクトの ID）もここには書かない。作り直すと変わるので、作ったあとにプロジェクトメモリへ書く。

## 立ち上げの順番

上から順に進める。各段の「確かめ」が通ってから次へ。取り消せて無料の作業なので、satou さん本人にしかできない画面の操作（★）以外は聞かずに進める（[routines/autonomy.md](../routines/autonomy.md)）。

### 1. GitHub（リポジトリと守り）

1. ★ satou さんが GitHub でリポジトリを作り、Claude の GitHub アプリの対象に加える（https://github.com/apps/claude/installations/select_target ）。
2. 各リポジトリに [template/](../template/) の呼び出し側ワークフロー・`dependabot.yml`・`.coderabbit.yaml`・`.gemini/settings.json`・`AGENTS.md`（AI 共通の指示）と `CLAUDE.md`（`@AGENTS.md` の1行）を入れる。手順は [routines/onboarding.md](../routines/onboarding.md) の 2。
3. ★ satou さんの画面操作: Pages・main の Ruleset（このリポジトリは PR 必須・必須チェック actionlint、他は削除と force push の禁止）・fork PR の Actions 承認・Push protection・CodeRabbit のアプリ。一覧は onboarding.md の 5。
4. このリポジトリの共通の一覧（`scorecard.yml`・`weekly-summary.yml`・`ci-time-report.yml` の `REPOS`、README の一覧）に全リポジトリを入れる（onboarding.md の 3）。

確かめ: 各リポジトリで Lint・QA が緑、`labels.yml` を1回動かして共通ラベルができている、`weekly-summary.yml` を手で1回動かして「週次まとめ」Issue ができる。

### 2. claude.ai のプロジェクト

1. プロジェクトを作り、リポジトリをすべてつなぐ（他の人のリポジトリは入れない）。
2. 「プロジェクト指示」に [project-instructions.md](project-instructions.md) を貼る。
3. プロジェクトメモリを [memory.md](memory.md) の構成で作る。最初は MEMORY.md と、決まりの控え（お金・聞き方）だけでよい。ID は作ってから書く。
4. ★ コネクタ（GitHub・必要なら Gmail・Calendar など）をつなぐのは satou さん。

確かめ: 新しいスレッドで「shared-workflows の routines/common.md を読んで要点を3行で」と頼み、clone して読めること。

### 3. スキル

[skills/](skills/) の各 `SKILL.md` を propose_skills のカードで出し、satou さんが保存する（スキルはカードからしか保存できない）。
`<この Artifact の URL>` のような箇所は、立ち上げ直したあとの URL に置き換える。
スキルを直したら、このフォルダの控えも同じ PR で直す（控えが古くなると立ち上げ直しで古い手順が戻る）。

確かめ: スキル一覧（ListSkills）に pr-flow が出る。

### 4. ルーティン

[routines.md](routines.md) の表の順に作る（監督を最初に。ほかのルーティンが止まったときに気づけるように）。
作ったら [routines/catalog.md](../routines/catalog.md) と表が合っているかを見る。

確かめ: list_triggers に表のルーティンが全部 enabled で出て、next_run_at が予定どおり。監督は fire_trigger で1回動かし、状況ページが更新される。

### 5. チェック機構

[checks.md](checks.md) の「立ち上げで要るもの」を上から埋める。
最後に、わざと失敗させて仕組みが動くかを1つだけ試す（例: 下書き PR で検査を1つ落とし、CI 失敗 Issue ではなく PR の赤として出ること、直すと緑に戻ること。試した PR は閉じる）。

確かめ: checks.md の表の「確かめ方」がすべて通る。

### 6. 記録

- 作ったルーティン・担当スレッドの ID を、プロジェクトメモリ（監督・巡回の話題のファイル）に書く。
- 立ち上げ直しで手順と違ったところは、この README を直す PR を出す（次の立ち上げ直しで同じところでつまずかないように）。

## この手順書を古くしないために

- 新しいルーティン・チェック機構・スキルを作ったら、同じ PR でここ（routines.md・checks.md・skills/）にも1行足す。
  Lint の「bootstrap」検査が、`routines/` の手順書・`.github/workflows/` の部品がここに載っているか、内部 ID が混ざっていないかを毎回調べる（`scripts/check-bootstrap.mjs`）。
- 土曜の見直し（routines/routine-review.md）は catalog.md と list_triggers を突き合わせている。その表とここの routines.md が食い違っていれば直す。

## まだ立ち上げ直せないもの

- **共有フォルダの中身**（`notes/todo.md`・`dev-report/`・各プロジェクトの原稿や表）: 控えが無い。dev-report は作り方の手順が共有フォルダにだけある。
  控えには非公開リポジトリが要り、作れるのは satou さんだけ（2026-10-18 の足りないものの調査で見送り）。必要になったら声をかけてもらう。
- **状況ページ・開発レポートの Artifact**: 作り直すと URL が変わる。作り直したら routines/supervisor.md の URL とルーティンのプロンプトを差し替える。
- **会話の中だけにある経緯**: 決まりは common.md・autonomy.md に、理由はそこに書いた日付と satou さんの言葉にある。それ以外の経緯は戻らない。

## 調べたこと（ベストプラクティス）

- 「Git を唯一の正にして、そこから全部を作り直せるようにする。手順書には順番と、各段で確かめることを書く」: GitOps の災害復旧の考え方（[Flux CD の DR 手順書](https://oneuptime.com/blog/post/2026-03-13-flux-disaster-recovery-runbook/view)、[Git からクラスタを作り直す](https://oneuptime.com/blog/post/2026-03-13-rebuild-cluster-from-git-flux-cd/view)）。
- 「手順書は実際の仕組みとずれていく。仕組みを変えた PR で一緒に直し、ずれは機械で見つける」（[DR 手順書を古くしない](https://oneuptime.com/blog/post/2026-09-02-keep-disaster-recovery-runbooks-current/markdown)、[IaC のずれを先に見つける](https://oneuptime.com/blog/post/2026-09-02-detect-infrastructure-as-code-drift/markdown)）。これが Lint の bootstrap 検査。
- 「CLAUDE.md・スキル・メモリは役割を分け、短く保つ。毎回守らせたいものは文章でなく hook・CI に」（[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)）。
