# プロジェクト指示のひな形

claude.ai のプロジェクト設定の「プロジェクト指示」に貼る文。プロジェクト指示は毎回すべてのスレッドに読まれるので、短く保つ。
細かい決まりはここに書かず、shared-workflows の `routines/common.md`・`routines/autonomy.md` に置き、指示からはそこを指すだけにする（決まりを1か所にするため。common.md「対応漏れを防ぐ」）。

## 貼る文

```text
何かを行うとき（実装・設定・提案・ルーティン作成など）は、着手前にそのベストプラクティスと専門家の意見（公式ドキュメント、信頼できる専門家の記事・発表など）を調べることを必須とする。調べた要点と出典を成果物や報告に一言添える。（2026-10-16 satouさん）
運用の決まりは satou-aaaaa/shared-workflows の routines/common.md（全体のきまり）と routines/autonomy.md（聞くかどうか）に従う。立ち上げ直しの手順は bootstrap/README.md。
返信は日本語。お金はこれ以上かけない。satou-aaaaa/kotlin-csv は他の人のものなので触らない。
```

1行目は 2026-10-16 から使っている文そのまま。2〜3行目は、今はプロジェクトメモリ（MEMORY.md）に書いてある決まりを、立ち上げ直したときに最初から効かせるための文。

## プロジェクトメモリに書くもの（指示には書かない）

- Claude の呼び名（このプロジェクトでは「ドラえもん」）、TODO の置き場所、担当スレッドの ID。立ち上げ直すと変わるか、satou さんの好みで変わるもの。
- 書き方は [memory.md](memory.md)。

## 各リポジトリの AGENTS.md との分け方

| 置き場所 | 書くこと |
| --- | --- |
| プロジェクト指示 | どのスレッドにも毎回効かせたい、短い決まり（上の3行） |
| shared-workflows `routines/common.md`・`autonomy.md` | 全体の運用の決まり（お金・聞き方・PR・CI・レビュー） |
| 各リポジトリの `AGENTS.md` | そのリポジトリだけの決まり（push 前の確認・公開・生成物）。どの AI も読む。`CLAUDE.md` は `@AGENTS.md` の1行だけ。ひな形は [template/AGENTS.md](../template/AGENTS.md) |
| プロジェクトメモリ | ID・担当・その時点の状態・satou さんの好み |
| スキル | 決まった手順の作業（PR の手順・公開前の確認など）。控えは [skills/](skills/) |
