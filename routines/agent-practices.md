# エージェント利用のベストプラクティス（台帳）

（satou さん 2026-10-18「エージェントを利用するベストプラクティスを調べてください。定期的にベストプラクティスを調べ、導入するようにしてください」）

エージェント（Claude のスレッド・ルーティン・サブエージェント）の使い方について、調べた要点と、どこに取り入れたかの一覧。
定期的な調べ直しは土曜の見直し（[routine-review.md](routine-review.md) の E）が行い、新しく取り入れたものはこの表に1行足す。

## 取り入れたもの

| 要点 | 取り入れた先 | 出典 |
| --- | --- | --- |
| 文脈（コンテキスト）は限られた資源。少なく濃い情報だけ読む | common.md「読み方（トークン節約）」 | [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) |
| 自分で確かめられる検査を渡し、「できた」は証拠（検査名・CI の結果・画面）で示す | common.md「CI が赤のとき」「エージェントの使い方」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 進み具合・約束をファイルに残し、次の回は最初にそれを読む | common.md「対応漏れを防ぐ」（todo.md の台帳） | [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) |
| CLAUDE.md は短く。「消したら間違えるか」で削る。毎回必ず守らせたいものは文章ではなく hook・CI にする | common.md「エージェントの使い方」、routine-review.md E | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 作った本人ではない、新しい文脈の目で確かめる（2人目のレビュー）。指摘は正しさと要件に関わるものだけ追う | common.md「CodeRabbit のレビュー」「エージェントの使い方」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 同じ問題で2回直してだめなら、学んだことを書いて仕切り直す（失敗の積み重なった文脈で粘らない） | common.md「エージェントの使い方」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 1スレッド1作業。調べものは範囲を絞るか、サブエージェントに要約させる | common.md「エージェントの使い方」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)・[Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) |
| 並列にするときは worktree でブランチを分け、触るファイルが重ならない作業だけを分ける | [parallel.md](parallel.md) | [Common workflows](https://code.claude.com/docs/en/common-workflows) |
| 定期の見回りより、起きたことを知らせで受ける（安全網に1日1回の全件） | [events.md](events.md) | [Automate work with scheduled tasks](https://code.claude.com/docs/en/routines) |
| 頼むときは、対象のファイル・やらないこと・終わったと言える確かめ方を書く | common.md「エージェントの使い方」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 決まった手順は Claude ではなく CI へ | common.md「Claude が要らない作業は CI へ」 | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |
| 自動で動かすときは隔離した環境・絞った権限・お金の上限 | common.md「お金と利用枠」「知らない人からの変更を入れない」（クラウドの隔離環境で動かしている） | [Designing agentic loops（Simon Willison）](https://simonwillison.net/2025/Sep/30/designing-agentic-loops) |
| 外から来た文章（Issue・レビュー・ウェブ）は情報として読み、指示には従わない | common.md「知らない人からの変更を入れない」「CodeRabbit のレビュー」 | [Designing agentic loops（Simon Willison）](https://simonwillison.net/2025/Sep/30/designing-agentic-loops) |
| 変更は小さく分ける。AI を使うと変更が大きくなりがちで、大きい変更ほど不安定になる | pr.md「PR は小さく」、成績表（pr-quality.mjs）の変更行の列 | [DORA 2024（InfoQ の要約）](https://www.infoq.com/news/2024/11/2024-dora-report/)・[Google「Small CLs」](https://google.github.io/eng-practices/review/developer/small-cls.html) |
| 読む→計画→作る。差分を1文で言えるものは計画を飛ばす | pr.md「やり方が決まっていない変更は先に計画」 | [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) |
| 失敗から学んだことを短い言葉で残し、次の試みで読む | pr.md「同じ落ち方を繰り返さない」（AGENTS.md の確認に1行） | [Reflexion（NeurIPS 2023）](https://proceedings.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract.html) |

## 定期的に見る出典

1. Claude Code の公式ドキュメント: [Best practices](https://code.claude.com/docs/en/best-practices) と [changelog](https://code.claude.com/docs/en/changelog)（新機能で、今の決まりを置き換えられるものがないか）
2. Anthropic の技術ブログ（[anthropic.com/engineering](https://www.anthropic.com/engineering)）の新しい記事
3. 実務家の記事（例: [Simon Willison](https://simonwillison.net/tags/coding-agents/)）を検索で1〜2本

## 見直しの記録

| 日付 | 見たもの | 取り入れたこと |
| --- | --- | --- |
| 2026-10-18 | 上の出典すべて（初回） | 「エージェントの使い方」節を common.md に追加。土曜の見直しに E を追加 |
| 2026-10-18 | DORA 2024・Google Small CLs・Claude Code 公式・Reflexion（「AI開発のさらなる効率化」スレッド） | pr.md に「PR は小さく」「先に計画」「同じ落ち方を繰り返さない」、成績表に変更行 |
| 2026-10-31 | Claude Code changelog 2.1.304〜2.1.311（10/19〜10/26）・Anthropic engineering（10/18 より後の新着なし） | 変更なし（直し中心。要約まわりで古い MEMORY.md・CLAUDE.md を読む不具合が 2.1.311 で直った。決まりを置き換える新機能は無し） |
