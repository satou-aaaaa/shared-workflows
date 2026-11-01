# ルーティンの定義の一覧と作り方

立ち上げ直すときに作るルーティン（Claude の定期実行）の定義。手順の本文は各手順書にあり、ここには作るときに要る値だけを書く。
今動いているものとの対応は [routines/catalog.md](../routines/catalog.md)。どちらかを変えたら、同じ PR でもう片方も直す。

最終確認: 2026-10-31（list_triggers の有効なもの全件と照合）

## 作り方

1. **担当のスレッドを先に作る**。持続するルーティン（毎回同じスレッドを起こすもの）は、そのスレッドのセッションから create_trigger を呼ぶ（`persistent_session_id` を省くと、呼んだスレッド自身が起こされる）。
   スレッドのタイトルは表の「スレッド」の名前にする（監督・巡回が名前で見つけるため）。
2. 毎回まっさらに始めたいもの（表で「新しいセッション」）は `create_new_session_on_fire: true`。
3. `prompt` は表のとおり1行にする。手順を変えるときは手順書への PR だけで済み、ルーティンを開き直さなくてよい（routines/README.md）。
4. `cron_expression` は日本時間なら `CRON_TZ=Asia/Tokyo` を先頭に付ける（無いと UTC）。:00・:30 を避けて分をずらす（混む時刻を避ける）。
5. `connectors` は要るものだけ（GitHub は要らない。リポジトリは環境で読める）。`initiation` は human_request。
6. 作ったら list_triggers で enabled と next_run_at を見て、ID をプロジェクトメモリに書く。

つまずいたところ:
- スレッドに結び付いたルーティンのプロンプトは、そのスレッドのセッションからしか update_trigger できない（ほかからは時刻・名前・有効/無効だけ）。
- 新しいスレッド型のルーティンは、作ったあとに名前・有効/無効を変えられない（無効化だけできる）。変えるときは消して作り直す。
- ユーザーの PC につながったセッション（Remote Control）からは作れない。クラウドのスレッドから作る。
- 無人の回で確認のプロンプトが出る操作（Artifact の type_url publish、PC の権限など）を手順に入れない（common.md「無人の回は確認待ちで止まらない」）。

## このプロジェクトのルーティン（手順書がこのリポジトリにあるもの）

プロンプトの `<名前>` は手順書のファイル名。共通の1行は次のとおり。

> satou-aaaaa/shared-workflows を `git clone --depth 1` し（あれば pull）、`routines/common.md` と `routines/<名前>.md` を読んで、その手順どおりに1回実行してください。読めない場合は何もせず、その旨を update_status に1行書いて no_reply_needed で終えてください。

| 作る順 | ルーティン | 手順書 | cron | スレッド | モデル |
| --- | --- | --- | --- | --- | --- |
| 1 | 監督エージェントの巡回（見回りの中で1日2回） | [supervisor.md](../routines/supervisor.md) | 単独の定期実行は作らない。見回りの 8:07・20:07 JST の回が行う（共有フォルダ `board/patrol.md` 手順14。2026-10-28 satou さんがトークン節約で選択） | 業務代行エージェント作り | 既定 |
| 2 | 全リポジトリ・全プロジェクト巡回と改善提案（平日・22:38） | [repo-patrol.md](../routines/repo-patrol.md) | `CRON_TZ=Asia/Tokyo 38 22 * * 1-5` | 全リポジトリ巡回と改善提案 | 既定 |
| 3 | ルーティンとスキルの定期見直し（週1・土曜朝） | [routine-review.md](../routines/routine-review.md) | `CRON_TZ=Asia/Tokyo 53 9 * * 6` | ルーティンの改善提案 | 既定 |
| 4 | CI の時間短縮（週1・木曜朝） | [ci-speedup.md](../routines/ci-speedup.md) | `CRON_TZ=Asia/Tokyo 26 10 * * 4` | CI時間短縮の定期改善 | 既定 |

## ほかのプロジェクトのルーティン（手順書がこのリポジトリにあるもの）

そのプロジェクトのスレッドから作る。プロンプトは上と同じ1行。

| ルーティン | 手順書 | cron | プロジェクト |
| --- | --- | --- | --- |
| ダンジョンボドゲ issue 自動対応（毎朝9:54） | [dungeon-issue.md](../routines/dungeon-issue.md) | `CRON_TZ=Asia/Tokyo 54 9 * * *` | ダンジョンボドゲ |
| LAST TELL ソースの控え（週1） | [last-tell-backup.md](../routines/last-tell-backup.md) | `CRON_TZ=Asia/Tokyo 52 8 * * 0` | LAST TELL |
| Issue/PR定期対応 (kensetsu-kyoka-toolkit)（月曜 4:35、Sonnet・low） | [sandbox-issue-pr.md](../routines/sandbox-issue-pr.md) | `35 19 * * 0` | ドラえもん（手順の1で sandbox を自分で足す） |

## sandbox のルーティン（手順書が satou-aaaaa/sandbox にあるもの）

毎回新しいセッション（`create_new_session_on_fire: true`）。プロンプトは次の1行（`<手順書>` は sandbox の `docs/routines/` のファイル名）。

> satou-aaaaa/shared-workflows を `git clone --depth 1` し（あれば pull）、`routines/common.md` と `routines/autonomy.md` を読んでください。続けて、satou-aaaaa/sandbox をクローンし（main）、`docs/routines/<手順書>` を読んで、その手順どおりに1回実行してください。このセッションは単独で動き、前の会話は引き継がれません。読めない場合は何もせず、その旨だけ報告してください。

| ルーティン | 手順書 | cron | モデル |
| --- | --- | --- | --- |
| リポジトリ運用エージェント（クラウド・1サイクル） | `ops-agent.md` | `7 17 * * 0-4`（平日 2:07 JST） | 既定（2026-10-31 時点で無効。作り直すかは satou さんに聞く） |
| 週次: 新規Issueの提案（調査つき） | `weekly-issue-proposal.md` | `CRON_TZ=Asia/Tokyo 47 8 * * 3` | claude-sonnet-5-5 |

## 手順書がこのリポジトリの外にあるもの

| ルーティン | 手順書 | cron | 備考 |
| --- | --- | --- | --- |
| 週1の開発レポート | このプロジェクトの共有フォルダ `dev-report/README.md` | `CRON_TZ=Asia/Tokyo 13 7 * * 1` | 共有フォルダの控えは satou-aaaaa/ops-backup（非公開）の `projects/agent-ops/files/`。レポートの Artifact を作り直したら URL をプロンプトに入れる |
| カンバンの自動改善（毎日・11:23） | このプロジェクトの共有フォルダ `board/improve.md` | `CRON_TZ=Asia/Tokyo 23 11 * * *` | 「TODO のカンバン化」スレッドから作る。アプリ版と声は担当スレッドへ頼む |
| 見回り（止まっているスレッドをボードに集める） | このプロジェクトの共有フォルダ `board/patrol.md` | `CRON_TZ=Asia/Tokyo 7 8,20 * * *` | 持続するスレッドを起こす。届き先は毎週替える（次の行） |
| 見回りの届き先を新しいスレッドに替える | このプロジェクトの共有フォルダ `board/patrol-weekly-reset.md` | `CRON_TZ=Asia/Tokyo 47 7 * * 1` | 新しいセッション |
| カンバンの頼みごとを片付ける | このプロジェクトの共有フォルダ `board/app-requests.md` | なし（ops-backup の app-inbox への push が合図） | 新しいセッション。PC につないでいないスレッドから作る |
| ops-backup 書き出し（毎日・9:17） | satou-aaaaa/ops-backup（非公開）`README.md`「書き出し」 | `CRON_TZ=Asia/Tokyo 17 9 * * *` | 業務代行エージェント作りのスレッドから作る |
| ops-backup 書き出し（ほかのプロジェクト・週1） | satou-aaaaa/ops-backup（非公開）`README.md`「ほかのプロジェクト」 | 日曜 9:23〜10:05 JST（時刻とフォルダ名はそこの表） | 外のプロジェクトからは作れない。各プロジェクトのチャットで README の1行を頼んで作る |
| 週次の研究進捗まとめ（カルカソンヌ） | プロンプト内: 「satou-aaaaa/carcassonne-research の過去1週間のコミットと PR の状態を確認し、AI の強さの変化と、初心者向け解説に使える発見を日本語で短くまとめてプロジェクトに投稿してください。」 | `CRON_TZ=Asia/Tokyo 45 20 * * 0` | モデル claude-haiku-5-5 |
| 個人の作業（朝のタスク整理・転職・連載・動画など） | 各プロジェクトの共有フォルダかプロンプト内 | — | 公開リポジトリには置かない |

## Claude を使わないもの（CI）

定期の検査・集計は GitHub Actions で動く。立ち上げ直しでは各リポジトリにワークフローを入れれば動き出す。一覧は [checks.md](checks.md)。
