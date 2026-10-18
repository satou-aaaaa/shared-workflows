# AGENTS.md

<!-- 新しいリポジトリ用のひな形。<> の部分を埋め、要らない節は消す。AI エージェント共通の指示ファイル（Claude・Codex・Gemini・Copilot などが読む）。毎回読まれるので短く保つ。 -->

<リポジトリの一言説明>

## push する前の確認

```bash
<ローカルで回す確認コマンド。例: npm test / python scripts/check.py --quick>
```

## 公開

- GitHub Pages は `main` の `<公開するフォルダ>` を公開する。マージすれば反映される。

## 共通のきまり

- PR の作り方・マージの仕方は共通スキル（PR の手順）と、satou-aaaaa/shared-workflows の `routines/common.md` に従う。
- CI の部品（CI失敗Issue・死活監視・Lighthouse・ブランチ片付け・自動マージ）は shared-workflows の共通部品を呼ぶ。
  リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md`（道具の置き換え）と `routines/without-claude.md` を読む。
