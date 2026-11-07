# プロジェクトの進め方の見直し（分野ごとの台帳）

（satou さん 2026-10-18「各agentにも、プロジェクトの進め方のベストプラクティスを調査して、フローを定期的に見直すようにしてほしい」）

各リポジトリ・プロジェクトの担当が、自分の分野（ゲーム開発・学習アプリ・研究・業務ツール・執筆）での進め方のベストプラクティスと比べて、自分の作業の流れを見直すための台帳。
エージェント全般の使い方は [agent-practices.md](agent-practices.md) が受け持ち、ここでは扱わない（重複させない）。

- 見直しは土曜の見直し（[routine-review.md](routine-review.md) の F）が、1回に1プロジェクトずつ順番に行う。新しいルーティンは作らない。
- 担当は、自分のプロジェクトの作業の流れ（手順・検査・公開のしかた）を変える前に、この台帳の自分の行を読む。
- 個人情報を扱うプロジェクト（転職など）の台帳は、公開リポジトリであるここには置かない。そのプロジェクトの共有フォルダに同じ形で置く（名前もここに書かない）。
- kotlin-csv は他の人のものなので対象外。

## 分野ごとの要点

| 分野 | 要点 | 出典 |
| --- | --- | --- |
| ゲーム開発 | 遊んでほしい体験（体験目標）を先に言葉にし、変更はその目標に照らして確かめる | [Game Design Workshop 抜粋（Tracy Fullerton）](https://gamedeveloper.com/design/book-excerpt-game-design-workshop) |
| ゲーム開発 | 作る→遊んでもらう→目標と比べる→直す、の小さな周回を全工程で回す。核の遊びは作り込む前に確かめる | 同上 |
| ゲーム開発 | テスターの声はそのまま実装せず、困っている点（症状）を拾い、直し方は作る側が決める | [Playtesting best practices（Wayline）](https://www.wayline.io/blog/game-playtesting-best-practices-implementing-player-suggestions) |
| ゲーム開発 | 1日1回の問題と練習があるゲームは、途中経過をモードごとに分けて保存し、答えを入れる前に保存した進み具合が画面と同じか確かめる（練習で今日の途中を消さない・古いタブで二重に入れない）。QA で「今日の途中→練習→今日に戻る」と「別のタブで先に進めてから古い画面で答える」を通す。保存のたびに時刻を付けて、メモリと保存のうち新しい方を読み（書き込みだけ失敗しても、別のタブの新しい記録を上書きしない）、終えた進み具合は日付が変わっても終えた日の記録にし、前の日の結果から今日の次のモードを始めさせない。sw.js のキャッシュの保存はイベントの中で `waitUntil` に預け、失敗は `.catch` で無視する（QA で「前の記録あり＋書き込みだけ失敗」「別のタブがあとで保存」「0時をまたいで開く」を通す） | [incidents/2026-11-03-daily-run-overwritten.md](../incidents/2026-11-03-daily-run-overwritten.md)・[incidents/2026-11-04-daily-game-save-gaps.md](../incidents/2026-11-04-daily-game-save-gaps.md) |
| ゲーム開発 | 「だれでも同じ問題」のゲームは、種から作る乱数を `sort` の比較の中で引かない（比較の回数と順はブラウザごとに違うので、同じ日でも端末で問題が変わる）。候補ごとに1回ずつ引いて選ぶ。QA でソースを検査する | [Array.prototype.sort（MDN）](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) |
| 学習アプリ | 効果が高いのは「思い出す練習（小テスト）」と「間隔をあけた復習」。読み返し・要約・線引きは効果が低い | [Dunlosky ら 2013 の報告（APS）](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html) |
| 学習アプリ | 内容の正しさは一次資料（条文・判例）で確かめ、出典を付ける | tenbin のスキル add-ronbun-questions（既に実施） |
| セキュリティ（防御の資料・道具） | 資料は一次の指針（NIST・IPA・OWASP など）を出典にし、調べた日を書いて定期的に古さを見直す。道具は防御用だけにし、秘密を作らない・混ぜない（push 前に検査） | [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)・[OWASP DevSecOps Guideline: Secrets Management](https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management) |
| 研究（ゲームAI） | 強くなったかは対戦数を決め打ちせず、逐次検定（SPRT）で「強い・変わらない」が決まるまで打つ。誤りの率を先に決める | [Fishtest FAQ（Stockfish）](https://github.com/official-stockfish/fishtest/wiki/Fishtest-faq)・[SPRT（Chess Programming Wiki）](https://chessprogramming.org/Sequential_Probability_Ratio_Test) |
| 研究（ゲームAI） | 学習の結果は複数のシードで回し、ばらつき（信頼区間）と再現のコマンドを必ず添える。条件をそろえた比較だけを比べる | [Deep Reinforcement Learning that Matters（Henderson ら）](https://arxiv.org/abs/1709.06560) |
| 業務ツール | 作る人が自分で使う（ドッグフーディング）。実際の案件の流れ（ダミーデータ）で端から端まで通して、詰まった所を次の作業にする | [Dogfooding（GitLab Handbook）](https://handbook.gitlab.com/handbook/product/product-processes/dogfooding-for-r-d) |
| 業務ツール | 小さく出して早く戻す。変更の量・失敗の率・直すまでの時間を見る | [DORA](https://dora.dev/) |
| 執筆（連載） | 決まった更新の間隔を守る。書きためか少なくとも筋書きを先に作り、間隔が空かないようにする | [What I Learned From 100+ Serials（Erica Drayton）](https://ericadrayton.substack.com/p/what-i-learned-from-70-serials-on) |
| 執筆（連載） | 読者が付いたら、反応（好き・嫌い）を次の話と直しの材料にする | 同上 |

## プロジェクトごとの状況

「今の流れの置き場所」は、その担当が毎回読む手順。「次に試すこと」は見直しで見つけた差で、F の回に取り入れるか判断する（取り入れたら「取り入れたこと」へ移す）。

| プロジェクト | 分野 | 今の流れの置き場所 | 取り入れたこと | 次に試すこと |
| --- | --- | --- | --- | --- |
| last-tell（LAST TELL） | ゲーム開発 | last-tell `CLAUDE.md`・`README.md`、スキル last-tell-release-check・last-tell-proposal-demo | 自動対戦（毎日）・画面の QA・テスターの報告欄（Issues） | 体験目標を短く書き、毎日の改善提案と自動対戦の結果をそれに照らす。テスターの声を「症状」で集計する |
| last-tell-godot（LAST TELL Godot 版） | ゲーム開発 | last-tell-godot `AGENTS.md`・`README.md` | qa.yml（Web 版との照合・画面・重さ、Linux と Windows） | Web 版と同じ結果になることを自動の照合で確かめてから入れる |
| naitei-no-michi（内定への道） | ゲーム開発（ノベル） | naitei-no-michi `CLAUDE.md` | 全エンディングに届くかの自動プレイ（QA） | 体験目標（どんな気持ちで終わってほしいか）を書く。遊んだ人の感想の受け口を作るか決める |
| dungeon-boardgame（ダンジョンボドゲ） | ゲーム開発（ボードゲーム） | [dungeon-issue.md](dungeon-issue.md) | satou さんの Issue に自動で対応 | 体験目標と、試遊のたびに見る点を書く |
| local-kanban（カンバン） | 業務ツール | local-kanban `AGENTS.md`・`README.md` | 見本データでの自動検査（QA）・satou さん自身が毎日使う | 実際の使い方（スマホでの追加・済み・確認への答え）で詰まった所を Issue にする |
| security-toolkit（防御の資料・道具。非公開） | セキュリティ（防御の資料・道具） | security-toolkit `AGENTS.md`・`README.md` | テスト付きの道具・手元の `sh run_tests.sh`（テストと gitleaks） | 資料の「調べた日」が古いものを見直す周期を決める |
| articles（公開記事） | 業務ツール | articles `AGENTS.md`・`README.md` | サイトの検査（QA：リンク・画像・フィード）・Site watch | 記事はメモアプリで直す。サイトの作り（tools/）だけを Issue にする |
| usotsuki-roppo（うそつき六法） | 学習アプリ | usotsuki-roppo `AGENTS.md`・`README.md` | 一問ずつ・正解率8〜9割に合わせる難しさ・見誤った話の再出題・QA（村を900回作る検査） | 話を足すときは tenbin の問題から作り、一次資料で確かめる。遊んだ人の正解率を見て段の分け方を直す |
| wagamama-burger（わがままバーガー） | パズルゲーム | wagamama-burger `AGENTS.md`・`README.md` | 答えが1つ・章ごとに新しい条件を1つ・時間制限なし・ヒントと戻す・QA（全問の全部の並べ方を試す） | 問題は tools/gen-levels.cjs で作り、台詞は手で書く。目的は説明なしで納得できるものに |
| kabu-news（株ニュース5本勝負） | 学習ゲーム | kabu-news `AGENTS.md`・`README.md` | 1日1回・全員同じ問題・答えを出さない共有・続きから・時間制限なし・QA（5本の組み方を5000回） | 会社とニュースは架空で本物っぽく（お笑いは入れない）。投資の助言にしない。ニュースを足すときは上げ下げを4割以上ずつに保つ |
| batsu-doko（×はどこだ） | ゲーム（タイムアタック） | batsu-doko `AGENTS.md`・`README.md` | 今日の1本（全員同じ並び）・上級・メダル・図鑑・挑戦状リンク・QA（広告の組み合わせを500回） | 広告・サイト・商品はすべて架空で本物っぽく（笑わせる文言は入れない）。外へ通信しない。ふさぐ広告の間は0.75画面以上 |
| kasane-zome（かさね染め） | ゲーム（色あわせ） | kasane-zome `AGENTS.md`・`README.md` | 今日の5色（全員同じ）・上級（見本を覚えて染める）・色帳・QA（お手本の計算し直し・3000日分の組み方） | 色は実在の伝統色の色見本から。染めの計算は QA が別の式で突き合わせる。お笑いは入れない |
| rosen-hitofude（路線図ひと筆） | パズルゲーム | rosen-hitofude `AGENTS.md`・`README.md` | 今日の3路線（全員同じ）・特急・乗車スタンプ・QA（答えが1つ・線路が交わらないを各大きさで何百回） | 道が1つだけであることを数え上げで確かめてから出す。駅の間はスマホ幅でも40px以上 |
| seiza-tsunagi（星座つなぎ） | 学習ゲーム（星） | seiza-tsunagi `AGENTS.md`・`README.md` | 今夜見ごろの3星座（全員同じ）・上級（見本なし）・星座帳・QA（星の向き・3年分の選び方） | 星の位置は Yale 輝星表から作り、東西を取り違えない（QA がベテルギウスとリゲルの位置で見る） |
| mannaka-kanji（まんなか漢字） | 学習ゲーム（漢字） | mannaka-kanji `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級（札12枚・ヒントなし）・漢字帳・QA（答えが1つ・難しさの並び） | 熟語は JMdict（CC BY-SA）から作り、出典と使い方の決まりを README に書く |
| kippu-10（きっぷで10） | パズルゲーム（数字） | kippu-10 `AGENTS.md`・`README.md` | 今日の5枚（全員同じ）・上級・切符帳・別解・QA（715通りを別の数え方で解き直す・3年分の組み方） | 計算は分数で正確に。難しさは式の数で決め、data.js は tools/make-data.cjs で作る。切符は架空 |
| bento-zume（お弁当づめ） | パズルゲーム（形） | bento-zume `AGENTS.md`・`README.md` | 今日の3箱（全員同じ）・上級・図鑑・QA（4つの大きさ×400箱が答えどおりに埋まる・詰め方の数を別の数え方で確かめる） | 先に箱を切り分けてから出すので必ず解ける。回すのはよいが裏返しはしない |
| todofuken-relay（都道府県リレー） | 学習ゲーム（地理） | todofuken-relay `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級・通行止め・QA（1年分の問題で最短と地図の字の大きさ） | 県の形ととなりは国土数値情報から作る。海をこえるつながりは決めた5か所だけ |
| shiritori-saitan（しりとり最短） | パズルゲーム（言葉） | shiritori-saitan `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級・QA（まよう札を足しても最短が変わらない） | 言葉は JMdict（CC BY-SA）から作り、出典を README に書く。字のきまり（小さい字・ー・濁音）を遊び方と README で同じに |
| madori-puzzle（間取りパズル） | パズルゲーム | madori-puzzle `AGENTS.md`・`README.md` | 今日の3軒（全員同じ）・上級・家の種類ごとに新しい希望を1つ・QA（答えが1つ・要らない希望が無い・1年同じ家なし） | 上が北・右が東、「となり」は壁を共有する部屋だけ。data.js は tools/gen-levels.cjs で作る |
| tenkizu-yomi（天気図よみ） | 学習ゲーム（気象） | tenkizu-yomi `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級（8方位）・QA（答えが迷う所を出さない） | 天気図は架空で実際の予報として出さない。風は等圧線から低気圧側へ30度（北半球） |
| bushu-tashizan（部首たし算） | 学習ゲーム（漢字） | bushu-tashizan `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級（部品3つ）・QA（答えが1つ・つらい言葉の字を使わない） | 字の組み立ては KanjiVG、読み・熟語は KANJIDIC2/JMdict（CC BY-SA）から作り、出典を README に書く |
| amida-haitatsu（あみだ配達） | パズルゲーム | amida-haitatsu `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級・QA（いちばん少ない本数を gen.js の solve で全部数える） | 出す前に最少の本数を数え上げで確かめる。同じ回数の古いタブでもヒントの数は多いほうを残す |
| kotoba-narabe（ことばならべ） | 学習ゲーム（言葉） | kotoba-narabe `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級（7字・8字）・QA（全読みで答えが1つか数え直す） | 言葉は JMdict（CC BY-SA）から作り、出典を README に書く。答えが1つの言葉だけを出す |
| jobun-tobatsu（条文討伐） | 学習ゲーム（法律） | jobun-tobatsu `AGENTS.md`・`README.md`・`docs/design.md` | 今日の5体（全員同じ）・上級（無法大君）・おさらい・条文帳・QA（3年分の組み方） | 条文は e-Gov の本文と tools/check-laws.py で1字ずつ照らす。法律相談にしない。順位表は入れない |
| machi-michijun（町の道順） | 頭の体操（高齢の人向け・道順を覚える） | machi-michijun `AGENTS.md`・`README.md` | 今日の道3本（全員同じ）・上級・練習・とことん・目印帳・思い出し・QA（3年分の道・練習4000本） | 「認知症を予防できる」と言い切らない（WHO 2019 を出典に）。押すだけ・時間制限なし・文字3段 |
| hikari-michi（ひかり道） | パズルゲーム | hikari-michi `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級・部屋帳・QA（いちばん少ない鏡の数を別のたどり方と全部の置き方で数え直す） | 出す前に最少の鏡の数を数え上げで確かめる |
| otsukai-memo（おつかいメモ） | 頭の体操（高齢の人向け・覚える・計算） | otsukai-memo `AGENTS.md`・`README.md` | 今日の3回（全員同じ）・上級・練習・とことん・QA（3年分の組み方・言い方） | 「認知症を予防できる」と言い切らない（WHO 2019 を出典に）。押すだけ・時間制限なし・文字3段 |
| bunshi-tsukuri（分子づくり） | 学習ゲーム（化学） | bunshi-tsukuri `AGENTS.md`・`README.md` | 今日の3分子（全員同じ）・上級・とことん・分子帳・QA（手の数・化学式・同じ形の分子を別の数え方で） | 分子のデータは手の数と化学式を確かめてから足す |
| kimari-sagashi（きまり探し） | 頭の体操（高齢の人向け・並びのきまり） | kimari-sagashi `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級・練習・とことん・きまり帳・QA（19種類×2000問を別の数え方で解き直し、答えが1つか） | 「認知症を予防できる」と言い切らない（otsukai-memo とそろえる）。押すだけ・時間制限なし・文字3段・選び肢72px以上 |
| kengen-check（この許可、いる？） | 学習ゲーム（怪しいアプリ・権限・偽の警告を見ぬく） | kengen-check `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級・練習・とことん・見ぬき帳・QA（726問の中身・権限の答えをアプリの仕事から決め直す・出典） | 中身は IPA・総務省・Android の公式の案内だけで作る。アプリ・会社・URL は作りもの（URL は `.test`） |
| kenko-minuki（健康情報みぬき） | 学習ゲーム（健康食品の広告・投稿から根拠のない言い回しを見抜く） | kenko-minuki `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級・練習・とことん・見抜き帳・QA（17種類×3000問：答えは1つ・ふつうの行にあやしい言葉が無い・出典） | 中身は消費者庁・食品安全委員会・国立健康・栄養研究所の資料で確かめたものだけ。医療の助言にしない・商品は架空。data.js を変える PR は CodeRabbit を待つ |
| dashisugi-check（出しすぎチェック） | 学習ゲーム（SNS の投稿の写真・文から、住所・学校・予定がばれる手がかりを見つける） | dashisugi-check `AGENTS.md`・`README.md` | 今日の5つ（全員同じ）・上級・練習・とことん・手がかり帳・QA（4つの難しさ×6場面×1500投稿：手がかりの数・置き場所・出典） | 手がかりの説明は公的な資料（総務省・京都府警察・北九州市教育委員会）から書き、出典を付ける。人・町・学校・店・電話番号は作り話 |
| bousai-handan（防災の判断） | 学習ゲーム（地震・津波・大雨で次の行動を選ぶ・架空の町のハザードマップを読む） | bousai-handan `AGENTS.md`・`README.md` | 今日の5問（全員同じ）・上級・練習・とことん・防災ノート・QA（17種類×2000問を別の決まりで解き直す・地図の答えが1つ・出典） | 中身は内閣府の避難情報ガイドライン（令和8年3月）・首相官邸・気象庁・国交省で確かめたものだけ。警戒レベルの名前はガイドラインの表のまま。町・施設は架空 |
| denki-kairo（でんき回路） | 学習ゲーム（理科・小4「電流のはたらき」） | denki-kairo `AGENTS.md`・`README.md` | 今日の3問（全員同じ）・上級・練習・QA（直列・並列・ショートの見本で回路の計算を別の解き方と照らす・いちばん少ない導線の数を総当たりで数え直す） | 回路のきまりを変えたら遊び方・README と QA の見本もそろえる。ショートは色だけで分けない |
| akushitsu-miyaburi（悪質商法みやぶり） | 学習ゲーム（くらし・悪質商法とクーリング・オフ） | akushitsu-miyaburi `AGENTS.md`・`README.md` | 今日の5件（全員同じ）・上級・練習・とことん・QA（日付の問題を別の数え方で3000問・今日の5件と上級を3年分・出典が公的機関か） | 手口と決まりは消費者庁・国民生活センター・自治体のページで確かめ、`data.js` の `SRC` に出典。法律相談にしない。詐欺みぬき（sagi-minuki）と題材を重ねない |
| tenbin（天秤の書） | 学習アプリ | tenbin `CLAUDE.md`、スキル add-ronbun-questions・law-app-ui-check | 間隔反復の復習ドリル・一次資料での確認 | 問題を足すときに「思い出させる形（答える前に考えさせる）」になっているかを見る点に加える |
| carcassonne-research | 研究（ゲームAI） | carcassonne-research `CLAUDE.md`・`.claude/skills/steward/`・`docs/EXPERIMENTS.md` | シードを決めた先後入替の対戦・信頼区間・再現コマンド | 強さの判定に SPRT を使い、対戦数を減らしつつ誤りの率をそろえる |
| sandbox（許可申請ツール） | 業務ツール | sandbox `CLAUDE.md`・`docs/DEVELOPMENT_GUIDE.md`・`docs/routines/` | 小さな PR・多層の検査・運用エージェント | ダミー案件で端から端まで通す確認を定期の作業に入れ、詰まった所を Issue にする |
| 連載（カクヨム） | 執筆 | スキル kakuyomu-story-craft-guide・連載のプロジェクト | 予約切れのチェック | 書きためと筋書きの残りを見る点に加える。読者の反応（PV・コメント）を次の話の材料にする |

## 見直しの記録

| 日付 | プロジェクト | 見たもの | 変えたこと |
| --- | --- | --- | --- |
| 2026-10-18 | 全部（初回） | 上の出典 | この台帳を作り、土曜の見直しに F を追加 |
| 2026-10-31 | last-tell | 10/17〜10/30 のマージ（v0.98.3〜v0.98.12 の演出・QA の揺れ止め・CI 失敗の見回り）、CLAUDE.md・AGENTS.md | 変更なし。2週ほぼ演出と検査の直しで、体験目標はまだ書かれていない。目標の中身は satou さんの判断なので「次に試すこと」に残す（次回は last-tell-godot） |
