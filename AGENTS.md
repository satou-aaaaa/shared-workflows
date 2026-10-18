# AGENTS.md

satou-aaaaa の各リポジトリが `@main` で呼ぶ CI の共通部品・ひな形（template/）・ルーティン手順書（routines/）。ここが壊れると全リポジトリの CI が止まる。
このファイルは AI エージェント共通の指示（AGENTS.md）。Claude・Codex・Gemini・Copilot など、どの AI でも、人でも、ここから読み始める。

## push する前の確認

```bash
actionlint .github/workflows/*.yml && (cd template && actionlint .github/workflows/*.yml)
pipx run zizmor==1.31.1 --offline --config zizmor.yml --min-severity medium .github/workflows template/.github/workflows
node scripts/check-bootstrap.mjs   # 立ち上げ手順（bootstrap/）の抜け・内部 ID の混入
node scripts/check-routines.mjs    # 手順書の書き方・AGENTS.md の有無
```

## 決まり

- main は Ruleset で守られている（PR 必須・必須チェック actionlint）。変更は必ず PR で、Lint が通ってからマージ。
- 部品の中身はここだけに置く。各リポジトリには呼び出しと設定値だけを書く。
- zizmor の指摘を許すときは `zizmor.yml` に理由を1行添える。
- ルーティンの手順の正は `routines/`（全体のきまりは `routines/common.md`）。新しい繰り返しの作業は `routines/catalog.md` に1行足す。
- ルーティン・CI の部品・スキルを足したら、同じ PR で bootstrap/ にも1行足す（Lint の bootstrap 検査が見る）。
- 手順書は `routines/STYLE.md` の形で書く（性能の低い AI や人でも同じ結果になるように）。
- 公開リポジトリなので、個人情報を扱う作業の手順・名前は置かない。

## Claude 以外の AI・人が作業するとき

- 手順書に出てくる Claude 専用の道具（スレッドへの返信・カード・共有フォルダ・メモリなど）は、`routines/tool-map.md` の置き換え先を使う。
- Claude が使えないときの運転のしかたは `routines/without-claude.md`。
