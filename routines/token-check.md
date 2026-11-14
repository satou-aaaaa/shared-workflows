# トークン節約の点検（週1・土曜の見直しの G）
<!-- style: v1 -->

（satou さん 2026-11-07「定期的にこのようなトークン節約は点検していきたい」。単独の定期実行は作らず、土曜の見直し [routine-review.md](routine-review.md) の G として動く。重ねて読ませないため）

## 目的

毎回の会話で読み込まれる量と、回数の多い・重い定期実行を週1で測り、取り消せる節約は聞かずに入れる。利用上限での失敗を減らし、お金はかけない。

出典：Claude Code「Manage costs effectively」（https://code.claude.com/docs/en/costs）。CLAUDE.md は200行以下にし詳しい手順はスキル・別ファイルへ、使わない MCP・道具は切る、軽い作業は Sonnet・Haiku と低い effort、長い会話・待っている定期実行は毎回全部の文脈を送るので短く・新しくする。

## 使う道具

- list_triggers（enabled=true、name・cron・last_run だけ見る。全文を読まない）
- get_session（長寿命のスレッドの使用量。月初の回だけ）
- list_threads（state=working の件数だけ）
- `wc -c`・`git`（このリポジトリと、同じ会話に入っている各リポジトリ）
- チームメモリ token-rules（決まり）・token-check（週ごとの記録）
- Claude 以外は tool-map.md の置き換え先（定期実行の一覧は claude.ai の画面、記録は ops-backup の `notes/`）

## 手順

1. チームメモリ token-check の前回の行を読む（無ければ初回）。
2. 有効な定期実行を list_triggers で数える。cron から1日あたりの回数を出し、多い順に3本を書き留める。
3. 1時間おき以下で動くもの・Opus で動くもの・最終実行が FAILED のものを書き留める。
4. 毎回読まれる量を測る。
   ```bash
   wc -c /tmp/claude/memory/team/silo/MEMORY.md
   for d in /home/user/*/; do [ -f "$d/CLAUDE.md" ] && printf '%s %s\n' "$(wc -c < "$d/CLAUDE.md")" "$d"; done | sort -n | tail -3
   grep -l '^@' /home/user/*/CLAUDE.md
   ```
5. 手順書の大きさを測る。
   ```bash
   wc -c routines/*.md | sort -n | tail -6
   ```
6. 並行で動いているスレッドの数を list_threads（state=working）で数える。
7. 毎月最初の土曜の回だけ、長寿命のスレッド（見回り・巡回・取り込みなど、同じ会話に何度も届くもの）を get_session で見て、使用量の多い順に3つ書き留める。
8. 下の「迷ったとき」の表で、見つけたものごとにすることを決めて行う。1回に入れる PR は1本まで（大きな手順書の分割は1本ずつ）。
9. チームメモリ token-check に1行足す。形は `YYYY-MM-DD: 定期実行 N回/日（上位 A・B・C）・MEMORY.md xKB・最大の手順書 名前 xKB・working N本・入れた: …・案: …`。
10. 入れたもの・案があるときだけ、見直しの報告（routine-review.md 手順17）に1行ずつ足す。

## 迷ったとき

| もし | すること |
| --- | --- |
| MEMORY.md が 8KB を超えた | 長い行の本文をトピックのファイル（`[[名前]]`）へ移し、索引は1行40字ほどにする。本文は消さずに移すだけ。移す前に読み直し、10秒おいて読み直す（ほかのスレッドも書く） |
| CLAUDE.md が `@` で 4KB を超えるファイルを取り込んでいる | template/CLAUDE.md の1行の形にする PR（drift-check の `claude:big-import` も見る） |
| 手順書が 15KB を超えた | 要点だけの本体と `<名前>-detail.md` に分ける PR を1本（common.md と common-detail.md、game-dev.md と game-dev-detail.md の形）。分けた本体は Lint（check-routines）が 15KB 以下か見る。common.md は権限の表があるので触らない |
| 定期実行が1時間おき以下 | イベント（push・Issue・API 起動）で起こせないか、間隔を2倍にできないかを考え、取り消せるなら update_trigger で変える。変えられない型（毎回新しい会話）は案として報告に書く |
| 定期実行が Opus で動いている | 決まり（token-rules）どおり Sonnet・low を、報告で一度だけ satou さんにお願いする（同じものを2回言わない） |
| 長寿命のスレッドが前回より大きく増えた | 要点をメモリに書いて新しいスレッドへ付け替える案を報告に書く（routine-review.md A-d） |
| working のスレッドが10本を超えた | 数を報告に書き、終わっているのに開いたままのものがないか、コーディネーターに確かめてもらう |
| 前回と比べて変化が無い | 記録の1行だけ足して終える |
| どれにも当たらない・判断がつかない | 推測で変えず、報告に「案」として書く |

## 完了条件

- チームメモリ token-check に今回の1行がある。
- 表で「すること」が決まったものは、入れた（PR・update_trigger）か、報告に案として書いた。

## やってはいけないこと

- お金がかかる変更（プランの変更・追加課金）をしない。
- 守りの仕組み（バックアップ・控えの書き出し）を、節約のために止めない・回数を減らさない。
- ファイル・メモリの本文を消さない（移すだけ）。定期実行を delete_trigger しない（止めるなら無効にする）。
- index.html・preview.html・大きな手順書を全部読まない（grep と行指定、要る節だけ。game-dev.md「トークンを節約する」）。
