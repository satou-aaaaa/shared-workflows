# 公開した新作17本が repos.txt に無く、週次まとめ・検査・巡回の対象から外れていた

- 種類: 手順の抜け
- 場所: `repos.txt`・`routines/project-practices.md`・`freshness.md`、新作を何本かまとめて作るスレッド（防災シリーズ・哲学シリーズ・動画用の新作）、`.github/workflows/common-check.yml`
- 気づいた人: 全リポジトリ巡回（2026-11-27 夜）
- 影響: 公開済みで CI もある17本（防災10本のうち8本・哲学5本・動画用4本）が一覧に無く、週次まとめ・成績表・CI 時間・共通部品の抜けの検査・古くなる情報の見直し・日本語の読み合わせのどれにも入っていなかった。遊ぶ人に見える不具合は無い。

## 起きたこと
- 2026-11-27、3つのスレッドが新作を何本かずつ並べて作り、公開した（Post-deploy check まで緑）。
- game-dev.md A 手順8（一覧の PR）は1本ごとの手順で、まとめて作るスレッドは全部そろってから出すつもりで後回しにしていた（動画用の4本は shared-workflows #678 で出した直後）。
- 同じ日の Common check（13:34 JST の実行）は公開の前で、17本は出ていなかった。前から一覧に無い bosai-handan などの行は、Issue「共通部品の抜け」の約100行の末尾に何日も残っていた。

## 原因
- 手順8に「いつまでに出すか」が無く、何本かまとめて作るときに溜めてよいように読めた。
- 一覧の足し忘れを知らせる行が、部品の抜け（毎日ほぼ同じ約100行）と同じ Issue の末尾に混ざり、読まれにくかった。

## なぜ見つからなかったか
- 毎日の Common check は「repos.txt に無い公開リポジトリ」を出せるが、出す先が長い Issue の最後で、前からある3本も直されていなかった。
- 一覧に無いリポジトリは、ほかの検査（freshness・check-repo-lists）の対象そのものから外れるので、どの Lint も落ちない。

## 対策
- [x] 直す: 13本（ame-pool・atsusa-keisan・kakazan-monosashi・karaburi-minogashi・machi-enshou・onaji-fune・sokuho-maniau・sunayama-doko・tamatama-atari・tsunami-hayasa・wazato-hantei・yohouen-naka・yume-kikai）を repos.txt・project-practices.md・freshness.md に足した（この PR）。残りの4本（doko-oitsuku・gokaku-line・jogen-noru・nukemichi-fusagi）は #678
- [x] 防ぐ: `routines/game-dev.md` A 手順8を「公開した日に」出すにし、`routines/game-dev-detail.md` に「まとめて作るときも溜めない」を足した（この PR）
- [x] 見つける: `.github/workflows/common-check.yml` が、一覧に無い公開リポジトリを部品の抜けから分けて、毎朝の Issue「一覧に無い公開リポジトリ」に出す（無くなれば閉じる。この PR）
