# last-tell の main の QA が、Ubuntu の置き場が遅く Playwright を入れる段階だけで時間切れになった

- 種類: 公開・CI
- 場所: satou-aaaaa/last-tell `.github/workflows/qa.yml`（共通部品 game-qa を呼ばず、自前の QA を持つ）
- 気づいた人: 見回り（CI失敗 Issue last-tell#167）
- 影響: 2026-11-26 10:06 UTC の main の QA（run 45798136106、v0.98.16）が ❌。遊ぶ人への害は無い（公開はその前の PR #166 の QA で済んでいた）。

## 起きたこと
- 組「WebKit（iPhone の Safari）ui」だけが、`npx playwright install --with-deps chromium webkit` の apt（ffmpeg・gstreamer など大量の部品）で `Ign:` が並ぶほど置き場が遅く、1回目が 420秒で打ち切り。
- 2回目は残った apt を 600秒待っても終わらず、鍵（dpkg lock）で落ち、3回目の途中で入れる段階の 25分が尽きた。
- 同じ回の WebKit fuzz を含むほかの16組は通った。同じ日の PR #166 でも WebKit fuzz で同じ形が2回あり、retry.sh に「残った apt を待つ」を足したばかりだった。

## 原因
- last-tell の QA は毎回、全部の部品を Ubuntu の置き場から落とし直していて、置き場が遅い日はそれだけで時間を使い切る。
- 2026-11-11 に共通部品 game-qa.yml へ「apt の取り置き（.deb を actions/cache に取っておく）」を入れたが（incidents/2026-11-11-qa-apt-dns-outage.md）、共通部品を呼ばない自前の QA には届かなかった。

## なぜ見つからなかったか
- 共通部品の直しは呼ぶリポジトリにだけ届く。自前で `playwright install --with-deps` するワークフローを探す検査が無く、drift-check も timeout-minutes しか見ていなかった。
- PR #166 で同じ形を見たとき、やり直しの待ち方だけを直し、毎回落とし直す元を見なかった。

## 対策
- [x] 直す: last-tell の qa.yml に game-qa.yml と同じ「apt の取り置き」を入れた（鍵は機械の版＋ブラウザ＋package-lock、戻すのは同じ機械の版だけ。last-tell PR #168、Closes #167）
- [x] 見つける: `scripts/drift-check.mjs` が、`playwright install --with-deps` を自前で回すのに apt の取り置き（qa-apt の actions/cache）が無いジョブを週次まとめに出す（qa:apt-cache。この PR。今は tenbin の check.yml が出る）
- [x] 防ぐ: 入れられなかったときは「置き場の不調でコードのせいではない、今の main で Run workflow し直す」と注釈を出す（last-tell PR #168）
