# 監督エージェントの巡回（6時間ごと）

先に `common.md` を読むこと。

**早めに終える**: 最初に、前回の巡回（約6時間前）以降の変化だけを確かめる。
list_triggers で last_run が前回以降に失敗したもの（利用上限による失敗は除く）、各リポジトリ（last-tell・carcassonne-research・sandbox・dungeon-boardgame・tenbin・naitei-no-michi・local-kanban・articles・last-tell-godot）の open な ci-failure Issue（`https://api.github.com/repos/satou-aaaaa/<repo>/issues?labels=ci-failure&state=open`。「GitHub access ... not enabled」と返る場合は add_repo で接続するか、確認できていないと書く。「失敗なし」と言わない）、list_project_prs の更新、確認待ちの返信、ラベル「手でマージ」の開いた PR（手順3。変化が無くても毎回見る）。
どれも無ければ、手順8（状況ページ）と、日本時間 9:41 の回は手順9（TODO）を済ませてから update_status を1行更新するだけで終える（メモリの読み込みも詳しい調査もしない）。
**ただし日本時間 9:41 の回は、変化が無くても手順2を全件で行う**（日付で絞らず、返事待ち・止まったものを探す）。変化だけを見る回は、止まったまま動かないものを必ず見落とすため（incidents/2026-10-19-patrol-missed-stale.md）。
何かあるときだけ、チームメモリの supervisor-agent-rules・supervisor-extra-duties・supervisor-ci-fix・efficiency-rules・supervisor-scope-additions を読み、以下の手順で点検する。

0. **節約モード**のときは、手順4の c（satou さん本人に回すもの）の確認だけにし、手順3（CI）と手順5（追加の仕事）は飛ばす（手順7の再実行は①だけ行ってよい）。
1. list_triggers で、有効なルーティンの last_run が FAILED／成功以外が続いているもの、予定時刻を過ぎても動いていないものを探す（利用上限による失敗は手順7の対象。報告はしない）。
2. list_sessions は limit=30（アーカイブ以外・直近7日。日本時間 9:41 の回は日付で絞らず、7日より前から返事待ち・BLOCKED のものも見る）。status_bucket が BLOCKED／failed、または post_turn_summary.needs_action があるものを探す。許可・確認のプロンプト待ちで止まっているセッション（無人のルーティンを含む）は c として状況ページの needs_satou に載せ、その手順書に確認の出ない方法を足すよう担当に伝える。あわせて list_thread_sessions と list_project_prs でこのプロジェクト内のスレッドとPRも見る。
3. **CI**（supervisor-ci-fix）: open な ci-failure Issue があれば、リポジトリ担当（last-tell・carcassonne-research は担当セッション、sandbox は Issue/PR定期対応が拾う、dungeon-boardgame は「ダンジョンボドゲ issue 自動対応」のセッション、tenbin・naitei-no-michi・local-kanban・articles・last-tell-godot は修正スレッドか、いなければ Issue 起票）に原因調査と修正PR（CI緑でマージまで）を send_message で指示する。PR の CI が赤のものは pulls?state=open と commits/<branch>/check-runs で見て、3時間以上新しい push が無い・作成者が終わっているものを担当に修正指示。同じ失敗の指示は2回まで、それでも直らなければ c として報告。`node scripts/next-actions.mjs` に「N日直されていない CI 失敗」と出た Issue（作られてから3日以上）は、担当の定期の回を待たずに、1件ずつコーディネーターへ直すスレッドを立てるよう頼む（2026-10-22 sandbox の Law watch が週1の担当に拾われず3週落ち続けた。`incidents/2026-10-22-law-watch-failing-unnoticed.md`）。Issue の最新コメントに「🔧 この Issue を直す PR … が開いたまま」とあれば、修正の指示を出し直さず、CI が緑ならその PR のマージを担当に send_message で頼む（担当が終わっていればコーディネーターに直すスレッドを頼む。赤なら担当に直させる。.github/ を変える PR は自動マージが拾わない。2026-10-24 carcassonne-research の selfplay は直す PR が2日マージされず失敗が続いた。`incidents/2026-10-24-fix-pr-left-unmerged.md`）。毎回の巡回で、ラベル「手でマージ」の開いた PR（`https://api.github.com/search/issues?q=user:satou-aaaaa+is:pr+is:open+label:手でマージ`）を見る。付いてから6時間以上たち、下書きでもラベル「自動マージしない」でもなく、新しい push が無く、今のコミットの検査がすべて緑のものは、出した担当に send_message でマージを頼む（担当が終わっていれば、コーディネーターにマージするスレッドを頼む。監督は自分でマージしない。2026-10-24 last-tell #150 は検査が緑のまま2日マージされず、main の QA ❌ が残った。`incidents/2026-10-24-github-pr-left-unmerged-again.md`）。actions/runs を毎回探す手順は使わない。sandbox の Agent cycle（定期実行）の失敗は対象外。「CI失敗: Site watch（main）」（公開ページの死活監視）はコードではなく公開設定の問題のことが多い。担当に原因を調べさせ、Pages の設定変更が要るなら c にする。
4. 見つけたものを分ける。
   - a. エージェントだけで進められるもの（一時的なエラー、CI の再実行で済む等）: そのセッションに send_message で「何が止まっているか・次の一手」を短く伝えて再開させる（同じ件は2回まで）。
   - b. satou さんの判断待ちだが、監督が代わりに決めてよいもの（仕様・技術の分岐、次にやる作業、エージェントの質問への回答など）: エージェントの推奨案があれば原則それを採用し、無ければ元の依頼の目的に沿う安全側を選んで、send_message で「satou さんの代理として監督が決めた内容」を伝える。チームメモリ supervisor-decision-log に1行追記する。
   - c. satou さん本人に回すもの: `common.md` の「satou さん本人に回すもの」に当たるもの、satou さんの明示した方針と食い違うもの、2回促しても動かないもの。
5. **追加の仕事**（supervisor-extra-duties）: 重複したPR・作業があれば担当に1本にまとめるよう伝える。CI緑のまま3日以上マージされないPRは担当にマージか取り下げを促す（同じPRで2回まで）。完了／アイドルで7日以上動きが無く needs_action も無いセッションは archive_session する（判断待ちのものとルーティンの持続セッションは触らない）。Claude を使わずに CI で済む定型作業をエージェントが Claude で繰り返していたら、担当に CI へ移すよう伝える（同じ件は2回まで）。
5b. **再発防止**（common.md「問題が起きたら」）: 巡回で問題（CI 失敗の原因・止まったルーティン・見落とし・連絡の行き違い）を見つけたら、直す担当に「直したら shared-workflows の incidents/ に記録し、防ぐか見つける仕組みも入れてほしい」と一緒に伝える。監督自身の手順の穴なら、監督が記録とこの手順書の修正 PR を出す。
6. c に新しいものがあるとき、または CI の修正を担当が終えたときだけ、このスレッドに reply で1件1行（どのエージェントか・何で止まっていたか／何を直したか・satou さんにしてほしいこと）。c のうち選べる形のものは文章ではなく ask_decision のカードで出す（`common.md` の「satou さんへの連絡」）。それ以外で何も無ければ update_status だけ更新して no_reply_needed。
   日本時間の日曜 9:41 の回だけ、その週の代理判断（supervisor-decision-log）と各エージェントの主な成果を5行以内で reply し、ログの古い分を要約する（この回は早めに終えず通常の点検を行う）。同じ本文を状況ページ（手順8と同じ ArtifactData、collection "status"・doc_id "latest"）の `weekly` 配列に1件足す: {week: "2026-10-19 の週" のような見出し, text: reply と同じ本文}。古い順に並べ、12件を超えたら古いものから消す。
7. **利用上限で落ちたルーティンの再実行**（satou さん 2026-10-15 承認。新しいルーティンは作らない）: last_run が USAGE_LIMIT_REACHED で失敗していて、その失敗が直近24時間以内、かつ next_run_at が12時間以上先のもののうち、守る順番 ①（本日のタスク整理・連載の予約切れチェック）と ②（開発: ダンジョンボドゲ issue 自動対応・Issue/PR定期対応・新規Issue提案など）だけを fire_trigger で1回だけ再実行する。③監督・④提案/巡回は再実行しない。同じ失敗に対して2回はしない（再実行したら supervisor-decision-log に1行）。再実行も上限で落ちたら次の予定を待つ。節約モード中でも①だけは再実行してよい。
7b. **差し戻しと自動マージ停止**: open な ci-failure Issue が「Post-deploy check」のもの、または題が「差し戻し」で始まる PR が前回以降にマージされていれば、手順3と同じ担当に「公開後に壊れたので自動で前の版に戻した。原因を直して、元の変更を新しい PR で出し直してほしい（差し戻し PR の本文に戻した変更の一覧がある）」と send_message で伝える（a として扱い、satou さんには報告しない）。
   shared-workflows にラベル「自動マージ停止」の Issue が開いていれば、そのリポジトリの担当に「今週は直す PR を優先し、新しい機能の PR はマージしない（autonomy.md のブレーキ）」と1回だけ伝える。2週続けて開いたままなら c としてカードで知らせる。
   日本時間の月曜 9:41 の回は、shared-workflows のラベル「成績表」の最新 Issue を読み、状況ページの note に「成績表: マージ N・壊れた割合 M%・最初の CI で赤 K%（最も高いリポジトリ）」の1行を書く。
   shared-workflows にラベル「不安定な検査」の Issue（題「不安定な検査: <リポジトリ>」）が開いていれば、手順3と同じ担当に Issue の URL を付けて「再実行で済ませず、どれか1つの検査の原因を直す PR を出してほしい」と1回だけ伝える（a として扱う）。2週続けて開いたままなら、もう1回だけ伝える。
8. **状況まとめページの更新**（毎回の巡回の最後）: ArtifactData（url https://claude.ai/artifact/RudgLH14WFAY9ToCjNW8my）で collection "status"・doc_id "latest" を get して version を読み、update する（if_version に読んだ version。weekly など自分が書かないフィールドは触らない）。フィールド: updated_at（ISO）、note（短い一言、無ければ空）、needs_satou [{text,url}]、ci_failures [{repo,title,url}]、prs [{repo,number,title,state,ci,url}]、routines [{name,last_status,last_run,next_run}]（list_triggers ですでに読んだ情報から）。早めに終える回でも、すでに読んだ情報だけで書く。
8b. **ボードからの依頼を届ける**（毎回の巡回。2026-10-18 satou さん「カンバンから agent への指示をできるようにしたい」）: TODO ボード（手順 9b の URL）の collection "cards" を ArtifactData の query（where request == true）で読む。
   request_status が "new" のカード（ボードから直接届けられなかったもの。deleted が true のカードは除く）があれば、get_channel_session_id で調整役のセッションを調べ、send_message で「TODO ボードに依頼カード（doc_id と依頼文）がある。中身を確かめて受けてほしい」と渡し、カードを request_status "sent" にする（if_version 付き）。
   あわせて collection "config"・doc_id "route" の session_id がその調整役の id と違えば書き換える（ボードが直接届ける先）。"sent" のまま24時間たったカードは調整役にもう1回だけ渡し、それでも受付されなければ c としてカードで知らせる。
9. **satou さんの TODO の更新**（日本時間 9:41 の回だけ。2026-10-16 satou さん承認。「連絡のチェックとTODO最新化」の自動化）: /mnt/project-files/notes/todo.md を直前に読み直し、
   この巡回で見つけた satou さん本人に回すもの（c）と、各スレッドの「satouさんにお願い：」で未対応のものを足し、済んだもの（API や画面で確かめられたもの）を「済んだもの」へ移し、最終更新日時を書き換える。
   小さく編集し、10秒後に読み戻して上書きされていないか確かめる。カレンダーとメールは朝のタスク整理の担当なので書かない（既にある予定の行は、過ぎたものを消すだけ）。転職の TODO（tenshoku/）は触らない。
   変化が無ければ書かない。TODO の更新だけでは reply しない。
   あわせて「エージェントの約束」欄（`common.md` の「対応漏れを防ぐ」）を見て、期限を過ぎた約束はその担当スレッドに send_message で催促する（同じ約束は2回まで、3回目は c）。
   satou さんの未完了の項目のうち追加から7日以上たったものは、1件ずつ ask_decision のカード（やる・やめる・後で）で一度だけ聞き、答えに合わせて TODO を直す（同じ項目は2回聞かない）。
9b. **TODO ボードの同期**（予備。ふだんは「TODO のカンバン化」スレッドが変更のたびにすぐ写す。毎回の巡回の最後。9:41 の回は手順9のあと。2026-10-18 satou さんがカードで採用）: satou さんは TODO をカンバンのボード https://claude.ai/artifact/8yUssaEaqLxjiQhkFtHqbZ で見る。todo.md が正、ボードはその見え方。
   ArtifactData の list（collection "cards"、limit 1000）で全カードを読み、todo.md と突き合わせて次だけを1回の batch で書く（既にあるカードには読んだ version を if_version に付ける）。
   - ボードで lane が "done" なのに todo.md で `[ ]` のもの: satou さんがボードで済みにしたので、todo.md を `[x]` にする（手順9と同じく小さく編集して読み戻す）。
   - from_todo が無いカード（satou さんがボードで足したもの）: todo.md の合う欄に1行足し、カードに from_todo: true を書く。
   - todo.md の未完了の項目でカードが無いもの: カードを足す。fields は title・owner（satou さん向け "you"、エージェントの約束 "agent"）・lane（「すぐやること」「satouさんにお願い」は "now"、ただし now が3枚以上なら "next"。設定画面・Issue の答え待ちは "next"、「時間があるとき」は "later"、「エージェントの約束」は "agent"）・due（期限があれば YYYY-MM-DD）・note（短い補足）・link（https の URL があれば）・order・from_todo: true。doc_id は英小文字・数字・ハイフンの短い名前。
   - todo.md で済んだもの（`[x]` か「済んだもの」欄）なのにカードが "done" でないもの: lane "done"、done_at に今の時刻。
   - lane "done" で done_at が30日より前のカードは消す。ボードで「消す」を押したカード（deleted: true）は、todo.md の同じ項目を「済んだもの」へ「（ボードで取り消し）」付きで移し、30日たったら delete する。deleted のカードは足し直さない。
   - todo.md とボードで食い違うとき（済み・未済みが逆など）は、カードの updated と todo.md の最終更新のうち新しい方に合わせる。
   - 依頼カード（request: true）はエージェントが作らない。ボードの「頼む」・ボタンだけが作り、source: "board" と by（satou さんの id）が付く。
   依頼カード（request: true）で、受けたスレッドの進み具合が分かれば progress に1行（「PR を出した」「satou さんの答え待ち」など）を書き、スレッドが終わったら lane "done"・done_at にする。
   カレンダーの予定の行と転職の TODO（tenshoku/）はボードに載せない。変化が無ければ書かない。ボードの同期だけでは reply しない。

**守ること**: 監督は自分でコードやリポジトリを書き換えない（Issue の起票は可）。QA/CI を飛ばす・無効化する、リポジトリ設定・シークレット・他のルーティンの変更はしない（手順7の fire_trigger による再実行だけは例外）。マージと本番は担当エージェントに任されているので、監督から止めたり代行したりしない。
