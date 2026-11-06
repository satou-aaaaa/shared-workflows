# ゲームを作る・磨く（新作は頼まれたとき／磨くのは週1・水曜 10:17 JST）
<!-- style: v1 -->

先に `common.md` と `autonomy.md` を読むこと。（satou さんの依頼 2026-11-04「それぞれのゲームを、さらにおもしろく」「やりこみ要素も」「ゲームとしてのおもしろさも」「ゲーム作成agentも良いですね」）

## 目的

satou さんのブラウザゲーム（GitHub Pages で公開・無料）を、企画から公開まで同じ形で作り、公開したあとも1本ずつおもしろくし続ける。

## satou さんの好み（変えない）

- 文字少なめ・一画面一問・ほどよい難しさ・見た目リッチ。説明なしで目的が分かる遊び。
- 時間制限・無理なお笑い・人狼の仕組み・クセを読む系は入れない（2026-10-31〜11-03 の感想）。頼まれない限り本物っぽさを優先する。
- 漢字・言葉を答えるゲームは、選択肢でなく入力して答える形にする（satou さん 2026-11-04）。変換中の Enter で送らない（`e.isComposing || e.keyCode === 229`）・`normalize("NFKC")` と空白のゆれを許す・かなだけはまちがいに数えない・別解も正解。候補から選ぶのはヒントの最後の段だけ（[Chrome: IME セーフな Enter 送信](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/ime-safe-enter-submit?hl=ja)）。
- ほかの作品の名前・キャラ・見た目・既存ゲームの再現は使わない。実在の会社名・ロゴもまねない。
- お金をかけない。外へ通信しない（外から読むのは Google Fonts の文字だけ）。記録は遊ぶ人のブラウザ（localStorage）だけ。名前・メールを聞かない。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクを、結果の画面に1行だけ（共有フォルダ `kofi/app-guide.md`）。有料版は置かない。

## 考え方（調べた要点と出典）

- まず遊びそのもの（手ごたえ・難しさの山・迷ったときの助け）を良くし、やりこみはその上に足す。やりこみだけ足しても、遊びが退屈なら続かない。
- 遊んだ人の声は「何が困ったか」を集めるのに使い、直し方はこちらで考える（[game-feedback.md](game-feedback.md)）。

### 研究の要点（ゲーミフィケーションの論文。satou さん 2026-11-05「論文も広く参照して」）

| # | 分かっていること | このゲームたちでの決まり | 出典 |
| --- | --- | --- | --- |
| 1 | ゲームの要素を足すと、学び・やる気・行動にそれぞれ小〜中くらいの良い効果がある。物語（フィクション）や、ほかの人との関わりがあると行動への効果が安定する | 世界観を一言でそえる（例：切符・お弁当・乗車記録）。要素は飾りでなく遊びの意味と結びつける | [Sailer & Homner 2020（メタ分析）](https://doi.org/10.1007/s10648-019-09498-w) |
| 2 | 効果は「どんな場面・どんな人か」で大きく変わる。足せば効くわけではない | 1回に1つずつ足し、何を良くしたいのかを PR に書く | [Hamari, Koivisto & Sarsa 2014（文献レビュー）](https://research.aalto.fi/fi/publications/does-gamification-work-a-literature-review-of-empirical-studies-o/)・[Koivisto & Hamari 2019](https://doi.org/10.1016/j.ijinfomgt.2018.10.013) |
| 3 | 物めずらしさの効果は時間とともに薄れる | 同じ実績を増やすより、週ごとに変わる目当て（今週のお題など）や新しい種類の問題で変化を出す | [Koivisto & Hamari 2019](https://doi.org/10.1016/j.ijinfomgt.2018.10.013) |
| 4 | ゲームの楽しさは「できた感（有能感）」「自分で選べる感（自律性）」「人とのつながり」で説明できる | 正解・まちがいのたびに理由が分かる知らせを出す。モード（今日・上級・練習）は自分で選べ、強制しない | [Ryan, Rigby & Przybylski 2006](https://doi.org/10.1007/s11031-006-9051-8) |
| 5 | 先に約束した「ごほうび」はやる気を下げることがある。ほめ言葉や「どれだけできたか」の知らせは下げない | 実績・★は「できたことの知らせ」として出す。Ko-fi やお金を、遊んだごほうびに結びつけない | [Deci, Koestner & Ryan 1999（メタ分析）](https://doi.org/10.1037/0033-2909.125.6.627) |
| 6 | 点数・レベル・ランキングは「量」を増やすが、内側からのやる気は増やさない | 点・回数だけの実績を増やさない。腕前（ヒントなし・一発）と集めることを混ぜる | [Mekler ほか 2017](https://doi.org/10.1016/j.chb.2015.08.048) |
| 7 | バッジ（実績）は、条件が見えると行動を増やす | まだの実績は条件と「いま/目標」を出す | [Hamari 2017（フィールド実験）](https://doi.org/10.1016/j.chb.2015.03.036) |
| 8 | 他人と比べるランキング・バッジを授業に入れたら、やる気・満足・成績が下がった | 全国ランキングは置かない。比べるのは自分のベストと、遊ぶ人が自分で選んだ挑戦状だけ | [Hanus & Fox 2015](https://doi.org/10.1016/j.compedu.2014.08.019) |
| 9 | ランキングは「目標」として働き、むずかしくても届く目標がいちばん効く | 目安（★3・メダル・最短の数）は「がんばれば届く」所に置く | [Landers, Bauer & Callan 2017](https://doi.org/10.1016/j.chb.2015.08.008) |
| 10 | 連続（ストリーク）はやる気を上げるが、途切れると、そのあと続ける人が大きく減る | 連続より合計の日数を主にする。途切れても責めず、取りこぼした日をあとから遊べるようにし、戻った人を迎える言葉を出す | [Silverman & Barasch 2023](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions) |
| 11 | 最初から少し進んだ状態で始まると、最後までやりとげる人が増える（与えられた進み） | はじめての1回で取れる実績を置き、進み具合のバーは0からでなく「もう1つ進んだ」所から見せる | [Nunes & Drèze 2006](https://doi.org/10.1086/500480) |
| 12 | ゴールに近いほど人はがんばる（ゴール勾配） | 結果の画面で「あと少しの実績」を1つだけ見せる（「あと1日で○○」） | [Kivetz, Urminsky & Zheng 2006](https://doi.org/10.1509/jmkr.43.1.39) |
| 13 | 実績は「腕前」「集める」「続ける」などを混ぜ、運だけ・回数だけのものは避ける | 実績は10〜14個で種類を混ぜる | [Hamari & Eranti 2011（DiGRA）](https://dl.digra.org/index.php/dl/article/view/545) |

### 勉強になるゲームの要点（教育ゲームの論文。satou さん 2026-11-05「勉強になるようなゲームをたくさん」）

| # | 分かっていること | このゲームたちでの決まり | 出典 |
| --- | --- | --- | --- |
| 14 | 学ぶ中身そのものを遊びの仕組みにしたゲーム（内側に組みこむ）は、クイズにゲームの飾りをかぶせたものより7倍以上長く遊ばれ、ふり返りと合わせると成績も上がった | 知識を使わないと進めない仕組みにする（例：原子の手の数で分子を組む）。正解ごとのごほうび画面で知識と遊びを切りはなさない | [Habgood 2015（Habgood & Ainsworth 2011 のまとめ）](https://core.ac.uk/download/42540939.pdf) |
| 15 | ゲームで学ぶと、ふつうの授業より学びと記憶が少し良い。ただしやる気が上がるとは限らず、1回より何回も遊ぶほうが効く | 1日1回・毎日戻る形にする。1回で全部を教えない | [Wouters ほか 2013（メタ分析）](https://karlkapp.com/?p=4333)・[Clark ほか 2014（SRI のまとめ）](https://www.sri.com/wp-content/uploads/2021/12/digital-games-design-and-learning-brief.pdf) |
| 16 | 効くかどうかはゲームという形でなく作り方で決まる。手助け（足場）を厚くしたもの・図のように簡単な見た目が効き、1人で他人と競うだけのものはいちばん効かなかった | ヒントは段階で出す。図・記号は簡単に。全国ランキングは置かない（8と同じ） | [Clark ほか 2014](https://www.sri.com/wp-content/uploads/2021/12/digital-games-design-and-learning-brief.pdf) |
| 17 | 思い出して答える練習（小テスト）は、読み直すより記憶に残る | 答えを選ぶ・入力する形にし、答えたあとすぐに「なぜ」を一言出す | [Adesope, Trevisan & Sundararajan 2017（メタ分析）](https://journals.sagepub.com/doi/10.3102/0034654316689306) |
| 18 | 間をあけてくり返すと長く覚えている。覚えておきたい期間が長いほど、間を長くするのがよい | まちがえた問題を数日後にもう一度出す（復習）。帳・図鑑から見直せるようにする | [Cepeda ほか 2006（メタ分析）](https://pubmed.ncbi.nlm.nih.gov/16719566/) |
| 19 | 学ぶ人が好むのは、できたことの知らせ・認めてもらうこと・目標。いやがるのは、役に立たない要素と、不安・ねたみを生む要素 | 結果の画面で「覚えたこと」を見せる。他人との比べっこで不安にさせない | [Bai, Hew & Huang 2020（メタ分析。要約ページ）](https://www.gbl.uzh.ch/quartz/references/Bai-et-al.-(2020)) |

- 中身（事実・数値・用語）は一次資料（公的機関・教科書・辞典のデータ）で確かめ、遊び方と README に出どころを書く。事前の知識なしで遊べるよう、はじめの1問で仕組みが分かるようにする。

- 1日1回のゲームは「1回で終わり」になりやすい（[PeerPush](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game)・[GameGrin](https://www.gamegrin.com/articles/do-streaks-and-leaderboards-still-work)）。上の 3・10・12 で手当てする。

## 共通の形（どのゲームもこれにそろえる）

| 部品 | 中身 | 見本 |
| --- | --- | --- |
| 今日のお題 | 日本時間の日付の種から作り、だれでも同じ。1日1回・途中で閉じても続きから | kippu-10 |
| 上級・練習 | 上級は今日のお題と重ねない。練習は記録を増やさない | kasane-zome |
| 帳・図鑑 | 遊んだお題が集まる | kippu-10 の切符帳 |
| 実績 | 10〜14個。記録から毎回数え、まだのものは「いま/目標」を出す | seiza-tsunagi #4・batsu-doko の `ACH` |
| カレンダー | 遊んだ日に★の印。連続日数は1以上のときだけ | seiza-tsunagi #4 |
| 取りこぼした日 | 過去7日のお題をあとから。連続・今日の記録・Ko-fi に数えない | wagamama-burger #5・seiza-tsunagi #4 |
| 感想 | Issue フォームへのただのリンク | [game-feedback.md](game-feedback.md) |
| PWA・OGP | `sw.js`・`manifest.webmanifest`・アイコン・`og.png`（答えを入れない） | どのゲームも |
| 見やすさ | 見やすさの設定（`template/a11y/a11y.html`）と検査（`template/qa/a11y.mjs`）。下の「だれでも遊べるように」 | kippu-10 |
| 引き継ぎ | 記録を別の端末へ移す「引き継ぎコード」と QR（`template/transfer.js`）と検査（`template/qa/transfer-check.mjs`）。下の「引き継ぎコード」 | kippu-10 |
| QA | `qa/run.mjs`。乱数で作る所は何百日分も作って確かめる。とことんのように `Math.random` で並べる所も、何百回作って重なり・作れない問題が無いかを見る（5回では0.1%の重なりに当たらない）。押せる所は44px以上、幅320px。キーボードで選んだボタンに枠が出る（`all:unset` で消えるので、枠の規則は style の最後に `:is(button,a):focus-visible{outline:…!important}`） | どのゲームも |

## だれでも遊べるように（色覚・ディスレクシア・弱視・キーボード・動き・ジェンダー。satou さん 2026-11-05）

satou さん「色覚異常や、ディスレクシアの人でも遊べるようにしたい」「他に配慮できるものがあれば、できるだけ」「ジェンダーバイアスも取り除く」。

### 共通の部品（どのゲームにも同じものを入れる）

| 部品 | 入れ方 | 守ること |
| --- | --- | --- |
| 見やすさの設定 `template/a11y/a11y.html` | 中身をそのまま `index.html` の `</head>` の前に写す（直すのはひな形だけ）。設定を開くリンク・ボタンに `data-a11y-open` を付けてホームに置く | 読みやすい文字（BIZ UDP ゴシック・行間1.7〜1.8）・色の見分けを助ける・動きを減らす（端末の「視差効果を減らす」で自動で入る）・読み上げ（端末の中の声だけ。外へ送る声は使わない）・ふりがな（`<ruby class="a11y-rb">` を置いたゲームだけ）。設定は同じサイトのゲームどうしで共通（localStorage `a11y-v1`） |
| 検査 `template/qa/a11y.mjs` | `qa/a11y.mjs` に写し、`qa/run.mjs` の最後で `node qa/a11y.mjs` を回す（落ちたら QA も落とす）。遊ぶ画面までの押し方は `qa/a11y.json` の `screens` | コントラスト 4.5:1・字間を広げても崩れない・動き続けない・Tab の枠・名前の無いボタン・知らせの場所・斜体・決めつけの言葉。許すときは `qa/a11y.json` に理由（理由の無い許しは落ちる） |

### 各ゲームで作るときの決まり

| # | 決まり | 出典 |
| --- | --- | --- |
| A1 | 色だけで分けない。正解・まちがい・選んだ・済み・種類などは、色に加えて形・記号（✓ ✕ ● ▲ ■）・模様・文字のどれかでも分かるようにする。ふだんからそうし、「色の見分けを助ける」（`html.a11y-cvd`）では色そのものも見分けやすい組（青と橙など）に替える。`qa/run.mjs` に「記号・文字が出ている」検査を足す | [WCAG 2.2 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)・[Game Accessibility Guidelines（色だけで伝えない）](https://gameaccessibilityguidelines.com/) |
| A2 | 色を当てるゲーム（重ね染めなど）は色そのものが遊びなので、数字（濃さ・赤み/青み）や言葉の手がかりも出し、色覚の人も近づけられるようにする | 同上・[カラーユニバーサルデザイン推奨配色セット](https://jfly.uni-koeln.de/colorset/) |
| A3 | 字と地のコントラストは 4.5:1 以上（24px 以上・太字 18.7px 以上は 3:1）。押す所の縁・記号は 3:1 以上。地に絵・グラデーションがある所は qa/a11y.mjs が測れないので、地の色だけにした画面でも自分で測る（html・body の模様は地の色で測る） | [WCAG 2.2 1.4.3・1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| A4 | 文は短く、左寄せ。斜体にしない。全部大文字・長い太字の段落を作らない。地は真っ白より生成り色。1行は短めに | [BDA Dyslexia Style Guide](https://www.wigan.gov.uk/Docs/PDF/Business/Professionals/SEN/HEFA/Dyslexia-Style-Guide.pdf) |
| A5 | 拡大を禁じない（`user-scalable=no` を付けない）。字間・行間を広げても崩れないように、高さを決め打ちした箱に字を入れない | [WCAG 2.2 1.4.4・1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) |
| A6 | 全部をキーボードでも遊べる（押す所は `button`。なぞる操作には押すだけの方法も置く）。片手・指1本で遊べる | [WCAG 2.2 2.1.1・2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)・Game Accessibility Guidelines |
| A7 | 正解・まちがい・ヒントの知らせは `aria-live="polite"` か `role="status"` の所に文字で出す（読み上げソフトに届く）。読み上げたい問題文・知らせに `data-a11y-say`。html の class は `classList` で足し引きし、`className =` で丸ごと書き換えない（設定の印 a11y- が消える） | [WCAG 2.2 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) |
| A8 | 音だけで知らせない（音には必ず文字・絵の知らせを添える）。振動・点滅は「動きを減らす」で止める。1秒に3回より多く光らせない。点滅は `step-end` で「見える・消える」の2つだけにする（`steps(2)` だと半分の濃さの時ができ、コントラストの検査が時刻しだいで落ちる。incidents/2026-11-05-batsu-blink-half-opacity.md） | [WCAG 2.2 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)・Game Accessibility Guidelines |
| A9 | 時間制限を付けない（もとからの決まり）。説明はいつでも開き直せる | [WCAG 2.2 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) |
| A10 | 役割や性別を決めつけない。登場人物は男女や年齢がかたよらないよう混ぜ、職業・家事・趣味を性別で決めない。呼び方は「さん」でそろえる（「くん・ちゃん」で性別を分けない）。「主婦→家事をする人」「ビジネスマン→会社員」「看護婦→看護師」などは言いかえる（一覧は `qa/a11y.mjs` の WORDS）。条文・判例の引用は原文のまま変えない。辞書（JMdict など）から問題を作るゲームは、作る段階で WORDS の言葉を外す（あとから外すと過去の日の問題が変わるので、区切りの日を決めて選ぶ所で外す。2026-11-06 satou さん「これからの問題だけ外す」） | [UNESCO: Promoting gender equality through textbooks](https://webarchive.unesco.org/web/20170509214808/http://unesdoc.unesco.org/images/0024/002473/247337e.pdf)・[欧州評議会：ジェンダーに配慮した言葉](https://rm.coe.int/168070ab79) |
| A11 | 説明・知らせは「やさしい日本語」で書く：一文を短く（目安40字）、一文に一つのこと、むずかしい言葉・二重否定・あいまいな言い方を避ける。むずかしい漢字の言葉には `<ruby class="a11y-rb">漢字<rt>かんじ</rt></ruby>` でふりがなを付ける（設定の「ふりがなを出す」で出る）。漢字を当てる・読むゲームの問題そのものには付けない | [出入国在留管理庁・文化庁「在留支援のためのやさしい日本語ガイドライン」](https://www.moj.go.jp/isa/support/coexistence/04_00004.html)・BDA Dyslexia Style Guide |
| A12 | 遅い回線・古い端末でも開ける：はじめに読むファイル（index.html と同じサイトのスクリプト・データ）は合わせて 1.5MB 以下（`qa/a11y.mjs` が見る）。オフラインでも遊べる（PWA） | [web.dev: Fast load times](https://web.dev/explore/fast) |

- 磨くとき（手順 B）は、`node qa/a11y.mjs` が出す色覚の見え方の絵（`qa-report/a11y-*-P型.png` など）を自分で見て、色だけで分けている所が無いか確かめる。

## 引き継ぎコード（別の端末へ記録を移す。satou さん 2026-11-05）

ゲームの記録はその端末のブラウザの中だけにあり、機種変更で消える。iPhone の Safari は7日使わないと消すこともある（[WebKit blog: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)・[web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web)）。サーバーを置かず、記録を「コード」と「QR」にして移す。

| 部品 | 入れ方 | 守ること |
| --- | --- | --- |
| `template/transfer.js` | そのまま `transfer.js` に写し、`index.html` の `</head>` の前（ゲームの script より前・`defer` なし）に `<script src="transfer.js" data-game="<リポジトリ名>" data-keys="<記録のキー>"></script>`。ホーム（いつも出るフッターなど）に `<a href="#" data-hk>引き継ぎ</a>` を置く。`sw.js` の `SHELL` に `./transfer.js` を足して `CACHE` の版を上げる | 直すのはひな形だけ（各ゲームは写す。版は `引き継ぎの版:` の行）。同じサイト（satou-aaaaa.github.io）のゲームは localStorage を分け合うので、`data-keys` には自分の記録のキーだけを書く（`*` だけは不可。`xdoko-*` のように頭の文字なら可。全部のゲームで分け合う `a11y-v1` は入れない：取り込むとほかのゲームの設定まで変わる） |
| `template/qa/transfer-check.mjs` | `qa/` に写し、`qa/run.mjs` の最後で `checkTransfer({ browser, url, game, sample, check, open })` を呼ぶ。`sample` はゲームが読める記録 | 書き出し → 別の端末で QR の URL を開いて取り込み → 同じ記録・前の記録は控え・控えに戻せる、写しまちがい・別のゲーム・知らないキー・HTML の印の文字・新しい版のコードを弾く、ボタン44px以上 |

- 取り込みは上書きなので、必ず確認の画面を出し、前の記録を控え（`hk-backup:<ゲーム>`）に残して「控えに戻す」で戻せるようにする（部品がやる。控えを先に書き、書けなければ入れ替えない）。
- コードは他人から届くこともある。部品は記録の中に `< > " ' ` + "`" + ` が入ったコードを弾く（ゲームは記録を innerHTML に入れるので、作ったコードでスクリプトを入れられないように。2026-11-05 CodeRabbit が6本で指摘）。ゲーム側も、記録の値を画面に出すときは数なら `Number()`、文字なら `esc()` を通す。縮めたコードは広げる途中でも大きさを数え、4MB を超えたらやめる（小さなコードが何百MBにも膨らむと、開いただけでタブが固まる。部品がやる）。
- 控えは、その中身の写しがほかに無いあいだは上書きしない。取り込むときはいまの記録を先に控えにし（書けなければ入れ替えない）、控えに戻すときは入れ替えが済むまで控えに触らない（控えそのものが戻したい記録のただ1つの写し。部品がやる。2026-11-05 条文討伐 #6 で CodeRabbit が指摘）。
- ゲームが記録を読む前に入れ替えるため、部品は sessionStorage に預けてページを読み直す。ゲーム側で `load` の形を変えたら `sample` も合わせる。
- QR の中身は `ページの URL#hk=コード`。`#` より後ろはサーバーへ送られない（[MDN: URL.hash](https://developer.mozilla.org/docs/Web/API/URL/hash)）。外へ通信しない決まりのままでよい。
- iPhone はブラウザ（Safari）とホーム画面のアプリで記録が別。ホーム画面のアプリで遊ぶ人は、アプリの中の「引き継ぎ」にコードを貼る（画面にも書いてある）。
- `node scripts/drift-check.mjs` が、PWA のゲームに `transfer.js` が無い・版が古いのを知らせる。

## 使う道具

- GitHub の道具（PR を作る・読む・マージ）。検索は `gh api -X GET search/...`。
- Playwright（クラウドに入っている Chromium。`playwright install` はしない）で、幅320px・390px の画面を撮って自分で見る。
- 報告は元のスレッドへの message_thread（ほかの AI は [tool-map.md](tool-map.md) の「スレッドへの返信」）。
- 並列にするときは [parallel.md](parallel.md)（同時に3つまで・1つのエージェントは1つのリポジトリ）。

## 手順

### A. 新しいゲームを作る（satou さんに頼まれたとき）

1. 案を3つ出す。どれも上の「好み」に当てはまるか表で確かめる。
2. 動く見本（単体の HTML）を Artifact で出し、satou さんに選んでもらう（カード）。
3. リポジトリは [onboarding.md](onboarding.md) 手順0で AI が作る（A：Actions「Create repo」を起こす。だめなら B：Chrome。そのときはこのスレッドに satou さんの一言を頼む）。リンクを渡すのは両方使えないときだけ。
4. はじめの commit は README だけ。workflows・`qa/`・本体は同じ PR #1 で入れる（incidents/2026-11-04-new-repo-main-qa-without-qa-dir.md）。
5. 上の「共通の形」と「だれでも遊べるように」を全部入れる。AGENTS.md は既存のゲーム（kippu-10 など）を写して直す。
   `.github/workflows/` は既存のゲームからでなく `template/.github/workflows/` から写す（古いゲームの写しはひな形の直しが届いていない。QA も `template/.github/workflows/qa.yml`（時間切れ20分）を写す）。PR #1 を出す前に、shared-workflows で `LOCAL_ROOT=<clone の親> REPOS=<リポジトリ> node scripts/drift-check.mjs` を回し、出た行を直す（2026-11-05 あみだ配達・ことばならべ・ひかり道が、前の日に直した link-check の設定なしで出た）。
6. `node qa/run.mjs` が全部通ってから PR。`sw.js` を含む PR は `@coderabbitai review` とコメントし、レビューを読んでから手でマージする。
7. Pages を main のルートで公開する（[onboarding.md](onboarding.md) 手順5の1）。`node scripts/drift-check.mjs` に `pages` の行が出ないこと、Actions の Post-deploy check が緑になったことを見るまで、X などで紹介しない（2026-11-04 3本が 404 のまま紹介された。incidents/2026-11-04-pages-never-enabled.md）。
8. 新しいリポジトリを [project-practices.md](project-practices.md) の表と README.md の一覧に足す。

### B. 公開中のゲームを1本磨く（週1・水曜）

1. 節約モード（common.md）なら何もせず、update_status に1行書いて終える。
2. 下の一覧を1つずつ `git clone --depth 1 https://github.com/satou-aaaaa/<リポジトリ>` し、`git -C <リポジトリ> log -1 --format=%cs` で最後に直した日を見る。
3. いちばん日がたったゲームを1つ選ぶ。開いている PR があるゲームは飛ばす。
4. `bash scripts/setup.sh` と `node qa/run.mjs` を回し、スマホ幅で3回遊ぶ。
5. 「退屈・分かりにくい・手ごたえが薄い」所を3つ書き出す。
6. 下の表で直すものを1つ決める。

   | もし | すること |
   | --- | --- |
   | 「共通の形」に足りない部品がある | それを足す |
   | 手ごたえ・難しさ・迷ったときの助けに困りごとがある | いちばん効くものを1つ直す |
   | 上の「研究の要点」「勉強になるゲームの要点」の決まりに合っていない所がある | 番号を PR に書いて、1つ直す |
   | 遊び方を変える案（ルール・世界観・お金・外への通信） | 直さない。satou さんにカードで1件だけ聞く（質問の先頭に「satouさんにお願い：」） |
   | どれにも当たらない | 止めて、Issue（ラベル needs-decision）に状況を書く |

7. 直し、`qa/run.mjs` に検査を足す。そのリポジトリの AGENTS.md と [pr.md](pr.md) に従う。
8. PR 本文に「遊んで気づいたこと」「なぜそれを直したか」「調べた要点と出典」を書く。
9. CI が緑ならマージする（`sw.js`・`manifest.webmanifest` を変えたら CodeRabbit を待つ）。

## 一覧（磨く対象）

usotsuki-roppo・wagamama-burger・kabu-news・batsu-doko・kasane-zome・rosen-hitofude・seiza-tsunagi・mannaka-kanji・kippu-10・bento-zume・todofuken-relay・shiritori-saitan・madori-puzzle・tenkizu-yomi・bushu-tashizan・amida-haitatsu・kotoba-narabe・jobun-tobatsu・machi-michijun・hikari-michi・otsukai-memo・bunshi-tsukuri・kimari-sagashi・denki-kairo（新しく作ったら足す）

## 完了条件

- A：PR #1 がマージされ、Pages の Post-deploy check が緑。project-practices.md の表に1行ある。
- B：選んだゲームの PR が1つマージされたか、止まった理由が Issue かメモリに書いてある。

## 報告

- マージした PR があるときだけ、元のスレッドに1〜3行（どのゲームの・何を・PR のリンク）。
- 何も無ければ update_status を1行更新して no_reply_needed で終える。

## やってはいけないこと

- 今日のお題の作り方（種・乱数・データ）を、理由を PR に書かずに変える（過去の日の問題が変わる）。
- 記録（localStorage）の形を壊す・古い記録を消す。
- 検査を飛ばす・弱める・消して緑にする。
- 1回の実行で2本以上のゲームを直す（どれが壊したか分からなくなる）。
