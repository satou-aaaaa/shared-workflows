# 新しいリポジトリ・プロジェクトの受け入れ

先に `common.md` を読むこと。satou さんが「プロジェクトが増えた」と書いたとき、または巡回（`repo-patrol.md` 手順A）が新しい対象を見つけたときに、この手順で既存の仕組みに組み込む。
（2026-10-18 satou さん「新しいプロジェクトが作られたときの手順書等も整理しておいてください」。naitei-no-michi の受け入れで実際にやったことを元にした）

取り消せて無料の作業なので、satou さんに聞かずに最後まで進める。satou さん本人にしかできない設定画面の操作だけを、最後にまとめて1回お願いする。
他の人のリポジトリ（kotlin-csv・フォーク）は対象外。持ち主が satou-aaaaa でフォークでないことを API（`/repos/<owner>/<repo>` の `owner.login`・`fork`）で確かめてから始める。

## 1. 何が増えたかを特定する

- **リポジトリ**: `list_repos` を既知の一覧（チームメモリ repo-patrol）と突き合わせる。
  作ったばかりのリポジトリは、Claude の GitHub アプリの対象に入っていないと `list_repos` にも検索にも出ない。見つからなければ名前を聞き、
  `add_repo` でも読めなければ、アプリの対象に加えてもらう（https://github.com/apps/claude/installations/select_target ）。
- **claude.ai のプロジェクト**: 一覧を読む手段は無い。`list_triggers` の `hearth_channel_id` を既知の一覧と突き合わせる（ルーティンがあるプロジェクトだけ出る）。
  出なければ、プロジェクト名と、開いたときのアドレス（`…/project/chan_…`）を satou さんに聞く。プロジェクトの裏にリポジトリがあれば、それも下の手順2で扱う。
- 何が増えたか分からないときは、候補をカードで聞く（「リポジトリ」「claude.ai のプロジェクト」「両方」）。名前は返信で書いてもらう。

## 2. リポジトリの初期設定（PR で入れる）

`add_repo`（access: push、ずっと使うなら save_to_project: true）→ clone して、似たリポジトリ（静的ゲームなら dungeon-boardgame）の呼び出し側を手本にする。

1. `template/.github/workflows/` をコピーし、設定値だけを合わせる。
   - QA: リポジトリにある自動プレイ・テストのスクリプトを `qa/` に置き、CI で回す（回数・乱数の種・`qa-report/report.md` の書き出し・失敗で終了コード 1）。ブラウザを使うなら Playwright の版を `qa/package.json` で固定し、`npx playwright install --with-deps chromium`。
   - 検査のスクリプトが無いアプリは、Playwright で見本データ（作り話）を読ませて、表示・保存・エラーを見る QA を作る。外の API は `page.route` で差し替え、本物の鍵やデータは使わない（手本は local-kanban の `qa/run.mjs`）。
   - `ci-failure-issue.yml` の見張る名前、`site-watch.yml` の `paths`、`changes.yml` の `app_name` と `ignore_paths`、`lighthouse.yml` の `baseline`（公開前は template の値。公開後に1回測って置き換える）。
2. `template/.github/dependabot.yml`（npm の directory は `/qa`）、`template/.coderabbit.yaml`（`path_filters` と `path_instructions` をそのリポジトリに合わせる）、`.nojekyll`（Pages をブランチから公開するとき）、`template/AGENTS.md` の `<>` を埋め、`template/CLAUDE.md`（`@AGENTS.md` の1行）と `template/.gemini/settings.json` もそのまま入れる。README の手順も新しい置き場所に合わせる。
   準備の1コマンドとして `template/scripts/setup.sh`（`<>` を埋め、要らない節を消す）・`template/.claude/settings.json`（クラウドセッションで自動で呼ぶ）・版のファイル（Node.js は `.nvmrc`、Python は `.python-version`。CI の setup-node・setup-python もこのファイルを読む）を入れ、README の準備の節は `bash scripts/setup.sh` の1行にする。
3. 手元で QA を回して ✅ を確かめ、`actionlint` を通す。下書き PR → CI 緑 → ドラフトを外して squash マージ（`.github/` を変える PR はエージェントがマージしてよい。common.md）。

## 3. 共通の一覧に加える（shared-workflows に PR）

- `.github/workflows/scorecard.yml`・`weekly-summary.yml` の `REPOS`（CI の時間を測るなら `ci-time-report.yml` も）
- `README.md` 冒頭のリポジトリ一覧
- `routines/supervisor.md` の CI を見るリポジトリと、その担当（専任のルーティンが無ければ「修正スレッドか Issue 起票」）
- `routines/repo-patrol.md` 手順3の渡し先（専任のルーティンが無ければ tenbin と同じ「Issue 起票→コーディネーターに修正スレッドを頼む」）
- `routines/project-practices.md` の「プロジェクトごとの状況」に1行（分野・今の流れの置き場所）。分野が表に無ければ、要点を調べて「分野ごとの要点」にも足す（個人情報を扱うプロジェクトは除く）
- Lint（actionlint）が緑ならマージする。

## 4. 記録と連絡

- チームメモリ repo-patrol の既知リポジトリ・既知プロジェクトに1行（名前・chan id・担当セッション・渡し先）。分からない項目は「未確認」と書く。
- 監督スレッドの担当セッション（「監督エージェントの巡回」trigger の persistent_session_id）に send_message で1回だけ知らせる。

## 5. satou さんにお願いすること（最後に1回、リンク付きで）

この環境からはリポジトリの設定を書き込めない（Pages・Ruleset・Actions の設定の書き込みはプロキシで 403）。次を /mnt/project-files/notes/todo.md に書き、スレッドの返信の先頭にも「satouさんにお願い：」で並べる。

1. Pages: `https://github.com/satou-aaaaa/<repo>/settings/pages` → Deploy from a branch → main / (root)
2. main のルールセット: `…/settings/rules` → New branch ruleset → Include default branch →「Restrict deletions」「Block force pushes」だけ ON（ほかのリポジトリと同じ）
3. fork PR の承認: `…/settings/actions` →「Require approval for all external contributors」
4. CodeRabbit のアプリの対象にそのリポジトリを加える（https://github.com/apps/coderabbitai → Configure。公開リポジトリなら無料）

## つまずいたところ（2026-10-18）

- `git clone --depth 1` のあとに `git push -u` しても追跡ブランチが作られず、終わりの確認で「push していない」と出る。
  `git config --add remote.origin.fetch +refs/heads/<branch>:refs/remotes/origin/<branch>` → `git fetch` で直る。
- 自分が作った PR には自分をレビュアーに指名できない（エラーになるが、担当者の設定だけでよい）。
- `*.github.io` はこの環境から開けない。公開の確認は Post-deploy check と Site watch に任せる。

## つまずいたところ（2026-10-20 articles）

- アプリが GitHub の API で main に直接書くリポジトリ（articles はメモアプリが記事を書く）では、main の守りを「削除と force push の禁止」だけにする（PR 必須にすると書き出しが止まる）。
  Post-deploy check も入れない（last-good に戻すと、アプリが書いたデータまで消える）。公開ワークフローは QA が赤でも止めず、CI 失敗 Issue で知らせる。
