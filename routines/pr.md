# PR の手順（全リポジトリ共通）

satou-aaaaa の各リポジトリで、PR を作る・CI を通す・コンフリクトを直す・マージする・公開を確かめるときの共通の手順。
ルーティンからでも、ふつうのスレッドからでも同じものを使う。全体のきまり（お金・連絡・聞くかどうか）は [common.md](common.md) と [autonomy.md](autonomy.md)。

**リポジトリだけの決まりは、そのリポジトリに置く**: 確認コマンドは各リポジトリの `CLAUDE.md`（「push する前の確認」）、
それより詳しいものはリポジトリの `.claude/skills/steward/SKILL.md` か `docs/`。食い違ったらリポジトリ側が優先。
ここに同じことを書き写さない（直すところが2か所になるため）。

対象: last-tell・tenbin・carcassonne-research・sandbox・dungeon-boardgame・naitei-no-michi・shared-workflows。kotlin-csv は他の人のものなので触らない。

## 1. push する前

1. `origin/main` から作業ブランチを作る。マージ済みのブランチは使い回さず、`origin/main` から作り直す。
2. リポジトリの `CLAUDE.md` の「push する前の確認」のコマンドを回し、通ってから push する（無ければ steward スキル、CI のワークフローの中身）。
   生成物（index.html・sw.js・`docs/*.html`・changes.html など、CLAUDE.md に「手で直さない」とあるもの）は、決まった作り直しのコマンドで作る。
3. `.github/workflows/` を変えたら actionlint で構文を確かめる。CI の部品は shared-workflows の共通部品を呼ぶだけにし、中身をコピーしない。
4. 秘密の文字列・個人情報・顧客の実データを入れない（各リポジトリの secret-scan も見る）。
5. 差分を自分で読み直す（CI が落ちそうな所・関係ない変更が混ざっていないか）。

## 2. PR を作る

- 下書き（draft）で作る。リポジトリに PR テンプレート（`.github/pull_request_template.md`）があればその見出しに沿って書き、無ければ Before / After / How の順に短く書く。
- 本文の先頭に決まりの帰属行、末尾に Claude Code の署名行を付ける。コミットメッセージは日本語で簡潔に（sandbox など既存の文体に合わせる）。
- 作ったら subscribe_pr_activity で見張る。CI の失敗とレビューには自分で対応する（見張りは待つだけで届くので、ポーリングしない）。
- 着手前にベストプラクティスを調べたなら、要点と出典を本文に1〜3行（common.md）。

## 3. CI とレビュー

- CI が赤のときは common.md の「CI が赤のとき」。ローカルで同じ検査を再現してから直す。テストのスキップ・無効化・削除、空コミット、閉じて開き直すことで通さない。
- CodeRabbit のレビューは common.md の「CodeRabbit のレビュー」。push から10分たっても付かなければ待たずに進めてよい。
- main の CI 失敗は各リポジトリの Actions がラベル `ci-failure` の Issue にする（次に成功すると自動で閉じる）。

## 4. コンフリクトを直す

1. PR のブランチに `origin/main` を取り込む（`git merge origin/main`）。rebase・amend・force push はしない（マージコミットにする）。
2. 両側が別々に足したもの（テスト・文書への追記・import の追加など）は両方残す。連番（ADR 番号など）がぶつかったら、後から直す側を次の空き番号にする。
3. 判定ロジックや安全装置など、同じ所を両側が別の中身に変えているときは、意図を読んで直す。決められなければマージを保留し、PR にその旨を書く。
4. lockfile・生成物は手で直さず、リポジトリの道具で作り直す（Dependabot の PR は `@dependabot rebase` とコメントする）。
5. 1 の確認コマンドを回してから push し、CI を待つ。別の PR が先に入ってまたぶつかったら同じことをする。

## 5. マージ

- satou さんは PR のマージを Claude に任せている（2026-10-10）。CI が緑で、コンフリクトが無く、未解決のレビューが無ければ、下書きを解除して squash マージする。タイトルは PR のタイトルのまま。
- 自動マージ（共通部品 `automerge.yml`）が入っているリポジトリ（last-tell・naitei-no-michi・dungeon-boardgame）は、QA が ✅ になると自動でマージされる。
  `.github/` を変える PR、ラベル「自動マージしない」の PR、QA が回らない PR は自動マージされないので、CI が緑なのを確かめてから手でマージする（2026-10-16 satou さん）。
- Dependabot の patch/minor は `dependabot-automerge.yml`（sandbox）がマージを予約するので、手で重ねて扱わない。メジャー更新は CI が検証しない道具に効くことがあるので、その道具を小さく動かして確かめてからマージする。
- shared-workflows は次の実行から全リポジトリに効く。必ず PR で出し、Lint（actionlint）が通ってからマージする（main は Ruleset で PR 必須）。
- shared-workflows に「自動マージ停止: <リポジトリ>」の Issue が開いているあいだは、直す PR だけをマージする（autonomy.md のブレーキ）。
- satou-aaaaa 以外が作った PR・フォークからの PR はマージしない（common.md の「知らない人からの変更を入れない」）。
- マージ後にブランチを使い回すときは `origin/main` から作り直す。

## 6. 公開を確かめる

- GitHub Pages は main から公開される（どのフォルダかは各リポジトリの CLAUDE.md）。自動マージ以外でマージしたときは、公開のワークフローが動いたかを Actions で確かめる。
- 公開後の確認（`post-deploy.yml`）が失敗すると、自動で前の版に戻す PR（題が「差し戻し」）が出る。戻されたら原因を直し、元の変更を新しい PR で出し直す。
- 遊ぶ人向けの更新情報（changes.html）は Changes ワークフローが PR の題から作るので、PR の題は遊ぶ人に分かる言葉にする（.github/・qa/・tools/ などだけの PR は載らない）。
