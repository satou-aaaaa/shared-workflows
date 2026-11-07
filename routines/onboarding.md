# 新しいリポジトリ・プロジェクトの受け入れ

先に `common.md` を読むこと。satou さんが「プロジェクトが増えた」と書いたとき、または巡回（`repo-patrol.md` 手順A）が新しい対象を見つけたときに、この手順で既存の仕組みに組み込む。
（2026-10-18 satou さん「新しいプロジェクトが作られたときの手順書等も整理しておいてください」。naitei-no-michi の受け入れで実際にやったことを元にした）

取り消せて無料の作業なので、satou さんに聞かずに最後まで進める。satou さん本人にしかできない設定画面の操作だけを、最後にまとめて1回お願いする。
他の人のリポジトリ（kotlin-csv・フォーク）は対象外。持ち主が satou-aaaaa でフォークでないことを API（`/repos/<owner>/<repo>` の `owner.login`・`fork`）で確かめてから始める。

## 0. リポジトリを作る（新作のとき）

satou さんは「リポジトリの作成も AI に任せる。今後も新作のリポジトリは聞かずに作ってよい」と決めている（2026-11-04・11-05）。satou さんに作成リンクを渡すのは、下の A・B がどちらも使えないときだけ。
名前は英小文字とハイフン。`https://github.com/satou-aaaaa/<名前>` を `add_repo` か API で見て、まだ無いことを確かめる。

### A. CI で作る（先にこれ）

1. shared-workflows の Actions「Create repo」（`.github/workflows/create-repo.yml`）を workflow_dispatch で起こす（GitHub MCP の `actions_run_trigger`、ref は `main`、inputs は `name` と `description`）。
2. 公開・README だけの main で作り、Pages（main の /）と main のルールセット（削除・force push 禁止）まで入れる。手順5の1・2 はやらなくてよい。
3. 実行が緑になったら `add_repo`（access: push）で足して、手順2へ。赤なら、ログの `::error::` の1行を見る。
   - 「REPO_CREATE_TOKEN が無い」「401」「403」：鍵が無いか切れた。B で作り、satou さんに下の「鍵の入れ方」をカードで頼む。
   - 「もうある」：同じ名前がある。消さない・上書きしない。名前を変えるか、そのリポジトリを使う。
4. 起こす操作が安全チェックに止められたら、同じ操作を別の道具で回り込まない。B へ。

鍵の入れ方（satou さん本人が一度だけ。無料。鍵は Claude に見せない・どこにも書かない）:
1. https://github.com/settings/personal-access-tokens/new （Fine-grained token）。名前 `repo-create`、期限は1年、Resource owner は satou-aaaaa、Repository access は「All repositories」。
2. Permissions → Repository permissions で「Administration」と「Pages」を Read and write（Metadata は自動で Read）。ほかは触らない。Generate してコピー。
3. https://github.com/satou-aaaaa/shared-workflows/settings/environments/new で環境 `repo-create` を作る。Deployment branches and tags を「Selected branches and tags」にし、`main` を足す（PR の枝から鍵を読めないようにする）。
4. その環境の Environment secrets → Add secret。名前 `REPO_CREATE_TOKEN`、値に 2 の鍵を貼る。
- 根拠（GitHub Docs）：リポジトリの作成とルールセットは「Administration」(write)、Pages は「Pages」と「Administration」(write)（REST API の各ページの Fine-grained access tokens の欄）。環境の秘密は「その環境を使うジョブだけが読める」（Deployments and environments）。
- 期限が近づいたら（1年後）、同じ手順で作り直して秘密を上書きする（subscriptions/list.md の「期限」と同じ扱いで、共有フォルダの todo に日付を書く）。

### B. Chrome で作る（A が使えないとき）

1. Claude in Chrome で `https://github.com/new?name=<名前>&visibility=public&description=<説明をURLエンコード>` を開き、「Add README」を On にして「Create repository」を押す。
2. 押す操作は自動の安全チェックが「公開の場を作る」として見る。**そのスレッドに satou さん本人の「<名前> を公開で作って」という言葉があるときだけ通る**。別のスレッドの言葉・コーディネーターの引用・メモリの記録では通らない（2026-11-05 `incidents/2026-11-05-repo-create-needs-thread-consent.md`。同日、本人の一言のあとは作成・Pages・ルールセットまで通った）。
   - だから名前が決まったらすぐ、そのスレッドに次の一言をコードの枠で出し、送ってもらってから押す（待つあいだに見本づくりを進める）。

     ```
     <名前> を公開リポジトリで作ってください。Pages とルールセットも入れてください。
     ```
   - 止められたら、同じ操作を別の道具で回り込まない。上の一言を頼む。
3. 作れたら、手順2（初期設定）と手順5（Pages・ルールセット）へ進む。
4. Chrome がつながっていないときだけ、satou さんに `https://github.com/new?name=<名前>&visibility=public` のリンクを渡す。

## 1. 何が増えたかを特定する

- **リポジトリ**: `list_repos` を既知の一覧（チームメモリ repo-patrol）と突き合わせる。
  作ったばかりのリポジトリは、Claude の GitHub アプリの対象に入っていないと `list_repos` にも検索にも出ない。見つからなければ名前を聞き、
  `add_repo` でも読めなければ、アプリの対象に加えてもらう（https://github.com/apps/claude/installations/select_target ）。
- **claude.ai のプロジェクト**: 一覧を読む手段は無い。`list_triggers` の `hearth_channel_id` を既知の一覧と突き合わせる（ルーティンがあるプロジェクトだけ出る）。
  出なければ、プロジェクト名と、開いたときのアドレス（`…/project/chan_…`）を satou さんに聞く。プロジェクトの裏にリポジトリがあれば、それも下の手順2で扱う。
- 何が増えたか分からないときは、候補をカードで聞く（「リポジトリ」「claude.ai のプロジェクト」「両方」）。名前は返信で書いてもらう。

## 2. リポジトリの初期設定（PR で入れる）

`add_repo`（access: push、ずっと使うなら save_to_project: true）→ clone して、似たリポジトリ（静的ゲームなら dungeon-boardgame）の呼び出し側を手本にする。
main に直接置くはじめの commit（リポジトリを作るときの1つ目）は README だけにする。`.github/workflows/` は、それが呼ぶ `qa/` などのスクリプトと同じ PR で入れる（workflows だけ先に main へ入れると main の QA が初めから赤になる。2026-11-04 `incidents/2026-11-04-new-repo-main-qa-without-qa-dir.md`）。

1. `template/.github/workflows/` をコピーし、設定値だけを合わせる。
   - QA: リポジトリにある自動プレイ・テストのスクリプトを `qa/` に置き、CI で回す（回数・乱数の種・`qa-report/report.md` の書き出し・失敗で終了コード 1）。ブラウザを使うなら Playwright の版を `qa/package.json` で固定し、`npx playwright install --with-deps chromium`。
   - 検査のスクリプトが無いアプリは、Playwright で見本データ（作り話）を読ませて、表示・保存・エラーを見る QA を作る。外の API は `page.route` で差し替え、本物の鍵やデータは使わない（手本は local-kanban の `qa/run.mjs`）。
   - `ci-failure-issue.yml` の見張る名前、`site-watch.yml` の `paths`、`changes.yml` の `app_name` と `ignore_paths`、`lighthouse.yml` の `baseline`（公開前は template の値。公開後に1回測って置き換える）。
2. `template/.github/dependabot.yml`（npm の directory は `/qa`）、`template/.coderabbit.yaml`（`path_filters` と `path_instructions` をそのリポジトリに合わせる）、`.nojekyll`（Pages をブランチから公開するとき）、`template/AGENTS.md` の `<>` を埋め、`template/CLAUDE.md`（`@AGENTS.md` の1行）と `template/.gemini/settings.json` もそのまま入れる。README の手順も新しい置き場所に合わせる。
   準備の1コマンドとして `template/scripts/setup.sh`（`<>` を埋め、要らない節を消す）・`template/.claude/settings.json`（クラウドセッションで自動で呼ぶ）・版のファイル（Node.js は `.nvmrc`、Python は `.python-version`。CI の setup-node・setup-python もこのファイルを読む）を入れ、README の準備の節は `bash scripts/setup.sh` の1行にする。
3. 手元で QA を回して ✅ を確かめ、`actionlint` を通す。下書き PR → CI 緑 → ドラフトを外して squash マージ（`.github/` を変える PR はエージェントがマージしてよい。common.md）。

## 3. 共通の一覧に加える（shared-workflows に PR）

- `repos.txt` に「名前 種類」の1行（game・app・private・ignore。**名前の ABC 順の位置**に入れ、末尾に足さない）。週次まとめ・成績表・CI 時間・ひな形のずれの検査・監督・巡回はここを読むので、ワークフローや README・手順書に名前を並べて書かない（2026-11-07 一覧が7か所に分かれていて、新作の PR どうしが毎回ぶつかった。incidents/2026-11-07-repo-list-conflicts.md）
- 担当が「修正スレッドか Issue 起票」以外のときだけ `routines/supervisor.md`・`routines/repo-patrol.md` に1行（ゲームは要らない。巡回で特に照らすことがあれば repo-patrol.md の「ゲームで特に照らすこと」に名前の順で1行）
- `routines/project-practices.md` の「プロジェクトごとの状況」に1行（分野・今の流れの置き場所）。分野が表に無ければ、要点を調べて「分野ごとの要点」にも足す（個人情報を扱うプロジェクトは除く）
- `node scripts/check-repo-lists.mjs`（Lint と同じ）を通す。Lint が緑ならマージする。

## 4. 記録と連絡

- チームメモリ repo-patrol の既知リポジトリ・既知プロジェクトに1行（名前・chan id・担当セッション・渡し先）。分からない項目は「未確認」と書く。
- 監督スレッドの担当セッション（「監督エージェントの巡回」trigger の persistent_session_id）に send_message で1回だけ知らせる。

## 5. 設定画面の操作（Claude が satou さんの Chrome で行う）

この環境の API からはリポジトリの設定を書き込めない（Pages・Ruleset・Actions の設定の書き込みはプロキシで 403）。
Claude in Chrome（`mcp__claude-in-chrome__*`）が使えるときは、下の 1〜4 を Claude が satou さんの Chrome で行う（2026-10-20 satou さん「リスクが少なく、繰り返し行なっているため」、追記も同日 satou さん承認）。

- Chrome が2つ以上つながっていたら（`list_connected_browsers`）、どちらを使うかをカードで聞く。片方に出した画面は satou さんから見えないことがある。
- **ルールセットは先に Actions「Add ruleset」（`.github/workflows/add-ruleset.yml`）を workflow_dispatch で起こす**（ref は `main`、inputs は `name`）。鍵は Create repo と同じで、パスキーが要らない。もうあれば何もしない。赤のときだけ下の Chrome で入れる（2026-11-06 Chrome ではルールセットのたびにパスキーを聞かれ、satou さんが離れていて3本が1日止まった）。
- GitHub が「Confirm access」（パスキー）を出したら、そこだけ satou さんに押してもらう（本人確認は Claude がしない）。一度通ると、しばらくは聞かれない。
- 入れた後に API で確かめる（`/repos/<owner>/<repo>/rulesets/<id>` の rules が deletion と non_fast_forward、conditions が `~DEFAULT_BRANCH`）。
- 入れられなかったものは下の「Chrome が使えないとき」で必ず satou さんに頼む。ルールセットと Pages の抜けは `scripts/drift-check.mjs`（週次まとめの「ひな形からのずれ」）が毎週出すので、受け入れの終わりに `node scripts/drift-check.mjs` を回して `ruleset`・`pages` の行が残っていないかを見る（2026-11-04 公開ゲーム14本で0件のまま気づかれなかった。`incidents/2026-11-04-new-repos-no-ruleset.md`）。
- ルールセットは `…/settings/rules/new?target=branch&enforcement=active` を開き、名前・Active・Include default branch を入れて、ON が「Restrict deletions」「Block force pushes」の2つだけか確かめてから Create（座標で押すと画面の高さで「Include all branches」を押し間違える。2026-11-04 bento-zume。メニューは文字で探して押す）。チェックの箱は find の ref で押しても入らないことがある（2026-11-05 amida-haitatsu）。Create の前に、ラベルの文字から箱を探して `checked` を JavaScript で読み、2つだけ入っているかを確かめる）。
- Push protection は公開リポジトリでは最初から On のことが多い。`…/settings/security_analysis` で見て、Off のときだけ入れる。CodeRabbit は「All repositories」なら何もしない。

Chrome が使えないときは、次を /mnt/project-files/notes/todo.md に書き、スレッドの返信の先頭にも「satouさんにお願い：」で並べる。

1. Pages: `https://github.com/satou-aaaaa/<repo>/settings/pages` → Deploy from a branch → main / (root)
2. main のルールセット: `…/settings/rules` → New branch ruleset → Include default branch →「Restrict deletions」「Block force pushes」だけ ON（ほかのリポジトリと同じ）
3. fork PR の承認: `…/settings/actions` →「Require approval for all external contributors」
4. CI が自分で PR を作るリポジトリ（main が PR 必須で、定期実行の生成物を `merge_via_pr.sh` などで入れるもの）だけ: `…/settings/actions` → Workflow permissions →「Allow GitHub Actions to create and approve pull requests」に ✓ → Save（切れていると `GitHub Actions is not permitted to create or approve pull requests` で落ちる。2026-10-24 carcassonne-research）
5. CodeRabbit のアプリの対象にそのリポジトリを加える（https://github.com/apps/coderabbitai → Configure。公開リポジトリなら無料）

## つまずいたところ（2026-10-18）

- `git clone --depth 1` のあとに `git push -u` しても追跡ブランチが作られず、終わりの確認で「push していない」と出る。
  `git config --add remote.origin.fetch +refs/heads/<branch>:refs/remotes/origin/<branch>` → `git fetch` で直る。
- 自分が作った PR には自分をレビュアーに指名できない（エラーになるが、担当者の設定だけでよい）。
- `*.github.io` はこの環境から開けない。公開の確認は Post-deploy check と Site watch に任せる。

## つまずいたところ（2026-10-20 articles）

- アプリが GitHub の API で main に直接書くリポジトリ（articles はメモアプリが記事を書く）では、main の守りを「削除と force push の禁止」だけにする（PR 必須にすると書き出しが止まる）。
  Post-deploy check も入れない（last-good に戻すと、アプリが書いたデータまで消える）。公開ワークフローは QA が赤でも止めず、CI 失敗 Issue で知らせる。

## つまずいたところ（2026-10-22 last-tell-godot：非公開リポジトリ）

satou-aaaaa は GitHub の無料プラン。非公開リポジトリでは次が使えない（GitHub Docs の gated-features。API でも「Upgrade to GitHub Pro」の 403）。お金のかかる切り替えはしないので、入れずに報告だけする。
- main の Ruleset・ブランチ保護（Pro から）→ 守りは無し。AGENTS.md に「変更は PR で」を書く
- Push protection・Secret scanning（非公開の個人リポジトリは対象外）→ `secret-scan.yml`（gitleaks）を入れる
- Pages（Pro から）→ `site-watch`・`lighthouse`・`link-check`・`post-deploy` は入れない。`automerge.yml` は `pages_build: false`
- CodeQL（コードスキャンは非公開だと有料）・Dependabot auto-merge（必須チェックが要る）も入れない
- CodeRabbit は非公開でもレビューが付いた（2026-10-22、アプリが「All repositories」）。`.coderabbit.yaml` は無くても既定の設定で動く
- fork PR: 非公開では「フォークからの PR でワークフローを動かす」が最初から Off。API（actions/permissions）はプロキシで読めないので、Chrome が使えるときだけ `…/settings/actions` で Off を確かめる
- Actions は月の無料枠がある（Windows は2倍で数える。使い切ると止まり、支払い方法があれば課金）。重い検査を増やさない
- `repos.txt` には種類 `private` で入れる（週次まとめ・成績表・CI 時間は private を読まない。shared-workflows の GITHUB_TOKEN では非公開リポジトリを読めない）

## つまずいたところ（2026-10-28 security-toolkit：CI を置かない非公開リポジトリ）

持ち主が「非公開の Actions は無料枠を超えると有料なので CI を置かない」と決めたリポジトリでは、上の非公開の節に加えて次のようにする。
- `.github/workflows/` の部品は1つも入れない（Secret scan も含む。1回1分でも、2026-10-23 に使い切った月の枠を他の非公開リポジトリと分け合うため。`incidents/2026-10-23-actions-minutes-ran-out.md`）。
- 代わりに、秘密の混入の検査を手元の確認コマンドに入れる：`scripts/setup.sh` で gitleaks を secret-scan.yml と同じ版・チェックサムで `.tools/bin` に入れ、確認コマンドの最後で `gitleaks dir --redact .` を回す（`.tools/` は .gitignore）。テストの作り物の値が引っかかったら行末に `gitleaks:allow`。わざと鍵の形の値を置いて、確認コマンドが失敗することを1回確かめる。
- CI が無いので、確認コマンドが通れば PR をエージェントがマージする（AGENTS.md に書く）。監督の ci-failure の巡回対象にも入れない。
