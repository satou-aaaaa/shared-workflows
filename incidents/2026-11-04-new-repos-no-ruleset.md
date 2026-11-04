# 公開のゲーム15本で、main を守るルールセットが入っていなかった

- 種類: 手順の抜け
- 場所: usotsuki-roppo・wagamama-burger・kabu-news・batsu-doko・kasane-zome・rosen-hitofude・seiza-tsunagi・mannaka-kanji・kippu-10・bento-zume・todofuken-relay・shiritori-saitan・madori-puzzle・tenkizu-yomi・bushu-tashizan
- 気づいた人: 新しいゲーム7本の受け入れのスレッド（API の `rules/branches/main` で確かめた）
- 影響: main を消す・force push で履歴を書き換えることを止める守りが無かった。実際に消えた・書き換わったものは無い。

## 起きたこと
- 2026-10-31〜11-04 にゲームのリポジトリを次々に作った。`routines/onboarding.md` 手順5のルールセットは設定画面でしか入れられず、Chrome がつながっていない日は `notes/todo.md` に「satou さんにお願い」と書いて終わっていた。
- 2026-11-04 夜、7本の受け入れで API を見ると、7本だけでなく前からの公開ゲーム7本も0件だった（mannaka-kanji はこのセッションから読めず未確認）。

## 原因
- 手順は「頼む」で終わり、入ったかを後で確かめる場所が無かった。TODO の行は増え続け、どれが済んだかを API で見直す人がいなかった。

## なぜ見つからなかったか
- ずれの検査（`scripts/drift-check.mjs`）はファイルと共通部品の呼び出しだけを見て、リポジトリの設定は見ていなかった。CI も ruleset が無くても赤にならない。

## 対策
- [x] 直す: 15本（14本と mannaka-kanji）の settings/rules に「main protection」（Active・既定のブランチ・Restrict deletions と Block force pushes だけ）を Claude が satou さんの Chrome で作った（2026-11-04 夜、パスキーは satou さん）。API の `rules/branches/main` で14本の deletion・non_fast_forward を確かめ、mannaka-kanji は設定画面で確かめた
- [x] 防ぐ: `routines/onboarding.md` 手順5に「受け入れの終わりに drift-check を回して ruleset の行が残っていないか見る」を足した（この PR）
- [x] 見つける: `scripts/drift-check.mjs` が公開リポジトリの既定のブランチのルールを API で読み、削除と force push の禁止が無ければ1行出す（週次まとめの「ひな形からのずれ」に毎週載る。この PR）
