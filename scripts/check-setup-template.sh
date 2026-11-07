#!/usr/bin/env bash
# ひな形 template/scripts/setup.sh が「準備できた」と言うときに本当に使えるかを、作り物の環境で確かめる（Lint から呼ぶ。Claude は使わない）。
#   使い方: bash scripts/check-setup-template.sh   （要るのは Node.js と npm と Python 3。ネットにはつながない）
# 見ること（2026-11-03 batsu-doko #1 の CodeRabbit の指摘。shared-workflows incidents/2026-11-03-setup-false-ready.md）:
#   1. ふつうに通ると「✓」で終わり、見つけたブラウザを CLAUDE_ENV_FILE に書く
#   2. 依存の一部が消えた node_modules（目印のファイルは新しいまま）を入れ直す
#   3. 使えるブラウザが無いと止まり、「✓」を出さない
#   4. CHROMIUM_PATH が動かせない場所を指すと止まる（フォルダも。ひな形の版 4）
#   5. CLAUDE_ENV_FILE が無いと、このシェルで打つ export を出し、「✓」を出さない
#   6. nvm で Node を入れたときは「nvm use」を出し、「✓」を出さない
#   7. ブラウザを起動できない（Linux のライブラリ不足など）と止まり、「✓」を出さない（ひな形の版 5）
#   13. 相対パスの CHROMIUM_PATH でも起動の試しが通る（ひな形の版 8）
#   8. 空白のあるブラウザの場所を、引用して CLAUDE_ENV_FILE に書く（版 5）
#   9. lock も依存も変わっていなければ入れ直さない（QA の最中に node_modules を消さない。版 5）
#  10. NODE_ENV=production でも devDependencies を入れる・11. requirements.txt が無ければ Python を飛ばす（版 6）
#  12. package.json にある Playwright を読み込めないと止まり、「✓」を出さない（版 7）
#  14. .nvmrc が v22.1.0 の形でも読める・15. nvm install が失敗したら止まって知らせる・
#  16. require では読めても import() で読めない Playwright（ESM の入口の欠け）で止まる・17. 2つ同時に動いても両方通る（版 10）
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
bad=0
ok()  { echo "✓ $1"; }
ng()  { echo "✗ $1" >&2; echo "--- 出力 ---" >&2; cat "$tmp/out" >&2; bad=1; }

# --- 作り物のリポジトリ（ひな形の <> を埋める。依存は手元の file: なのでネットは要らない）---
repo="$tmp/repo"; mkdir -p "$repo/scripts" "$repo/app/dep" "$repo/app/pw" "$tmp/bin"
sed -e 's|^npm_dir=qa |npm_dir=app |' -e 's|^next="node qa/run.mjs"|next="node app/check.js"|' \
  "$root/template/scripts/setup.sh" > "$repo/scripts/setup.sh"
if grep -n '<[^<>]*[ぁ-んァ-ヶ一-龠][^<>]*>' "$repo/scripts/setup.sh"; then echo "✗ 埋めていない <> がある（この検査の sed を直す）" >&2; exit 1; fi
# 埋めたあとの形を shellcheck で見る（check.sh と Lint の actionlint の準備で入っている）
if command -v shellcheck >/dev/null; then shellcheck -S warning "$repo/scripts/setup.sh" || { echo "✗ shellcheck が template/scripts/setup.sh を指摘した" >&2; exit 1; }; fi
want=$(node -p 'process.versions.node.split(".")[0]')
echo "$want" > "$repo/.nvmrc"
python3 -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")' > "$repo/.python-version"
: > "$repo/requirements.txt"
echo '{"name":"dep","version":"1.0.0"}' > "$repo/app/dep/package.json"
# 作り物の Playwright：FAKE_LAUNCH_FAIL があると起動に失敗する（ライブラリが足りない Linux の代わり）
echo '{"name":"playwright","version":"1.0.0","exports":{"import":"./index.mjs","require":"./index.js"}}' > "$repo/app/pw/package.json"
# ESM の入口（QA は import で読む）。FAKE_IMPORT_FAIL があると import だけ失敗する（index.mjs の欠けの代わり。版 10）
echo 'import { createRequire } from "node:module"; if (process.env.FAKE_IMPORT_FAIL) throw new Error("Cannot find module index.mjs"); const pw = createRequire(import.meta.url)("./index.js"); export const chromium = pw.chromium; export default pw;' > "$repo/app/pw/index.mjs"
echo 'if(process.env.FAKE_REQUIRE_FAIL)throw new Error("Cannot find module playwright-core");exports.chromium={executablePath:()=>"",launch:async(o)=>{if(o&&o.executablePath&&!require("fs").existsSync(o.executablePath))throw new Error("Failed to launch: "+o.executablePath+" not found");if(process.env.FAKE_LAUNCH_FAIL)throw new Error("libnss3.so: cannot open shared object file");return{close:async()=>{}}}};' > "$repo/app/pw/index.js"
echo '{"name":"fx","version":"1.0.0","private":true,"dependencies":{"dep":"file:./dep"},"devDependencies":{"playwright":"file:./pw"}}' > "$repo/app/package.json"
(cd "$repo/app" && npm install --package-lock-only --no-audit --no-fund >/dev/null)
printf '#!/bin/sh\nexit 0\n' > "$tmp/bin/chromium"; chmod +x "$tmp/bin/chromium"   # 作り物のブラウザ

# 共通の環境：取ってこない設定・決まった場所のブラウザは作り物・Playwright の置き場は空
run() {
  ( cd "$repo" && env -u CHROMIUM_PATH -u CLAUDE_ENV_FILE PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
      PLAYWRIGHT_BROWSERS_PATH="$tmp/none" PW_PREINSTALLED="$tmp/bin/chromium" "$@" bash scripts/setup.sh ) > "$tmp/out" 2>&1
}

# 1. ふつうに通る
envf="$tmp/env"; : > "$envf"
if run CLAUDE_ENV_FILE="$envf" && grep -q '^✓ 準備できた' "$tmp/out" && grep -q "CHROMIUM_PATH=$tmp/bin/chromium" "$envf"; then
  ok "ふつうに通ると ✓ で終わり、ブラウザの場所を CLAUDE_ENV_FILE に書く"
else ng "1. ふつうに通らない"; fi

# 2. 壊れた node_modules を入れ直す（v1 は目印のファイルの日付だけを見て飛ばしていた）
rm -rf "$repo/app/node_modules/dep"; touch "$repo/app/node_modules/.package-lock.json"
if run CLAUDE_ENV_FILE="$envf" && [ -f "$repo/app/node_modules/dep/package.json" ]; then
  ok "依存の消えた node_modules を入れ直す"
else ng "2. 消えた依存を入れ直さない"; fi

# 3. 使えるブラウザが無い
if run CLAUDE_ENV_FILE="$envf" PW_PREINSTALLED="$tmp/none/chromium"; then ng "3. ブラウザが無いのに止まらない"
elif grep -q '^✓' "$tmp/out"; then ng "3. ブラウザが無いのに ✓ を出した"
else ok "使えるブラウザが無いと止まる"; fi

# 4. CHROMIUM_PATH が動かせない
if run CLAUDE_ENV_FILE="$envf" CHROMIUM_PATH="$tmp/none/chrome"; then ng "4. 動かせない CHROMIUM_PATH で止まらない"
else ok "動かせない CHROMIUM_PATH で止まる"; fi

# 4b. CHROMIUM_PATH・決まった場所がフォルダ（-x だけではフォルダも通る。ひな形の版 4）
mkdir -p "$tmp/dir"
if run CLAUDE_ENV_FILE="$envf" CHROMIUM_PATH="$tmp/dir"; then ng "4b. フォルダの CHROMIUM_PATH で止まらない"
else ok "フォルダの CHROMIUM_PATH で止まる"; fi
if run CLAUDE_ENV_FILE="$envf" PW_PREINSTALLED="$tmp/dir"; then ng "4b. 決まった場所がフォルダなのに止まらない"
elif grep -q '^✓' "$tmp/out"; then ng "4b. 決まった場所がフォルダなのに ✓ を出した"
else ok "決まった場所がフォルダだと止まる"; fi

# 5. CLAUDE_ENV_FILE が無い（人の端末・ほかの AI）
if run && ! grep -q '^✓' "$tmp/out" && grep -q "export CHROMIUM_PATH=$tmp/bin/chromium" "$tmp/out" && grep -q 'activate' "$tmp/out"; then
  ok "CLAUDE_ENV_FILE が無いと、打つ export と activate を出し ✓ を出さない"
else ng "5. CLAUDE_ENV_FILE が無いときに打つ操作を出さない"; fi

# 6. nvm で Node を入れた（古い node が先に見つかる。作り物の nvm が本物の node を PATH の前に足す）
real=$(dirname "$(command -v node)")
mkdir -p "$tmp/old" "$tmp/nvm"
printf '#!/bin/sh\necho %s\n' "$((want - 1))" > "$tmp/old/node"; chmod +x "$tmp/old/node"
# shellcheck disable=SC2016  # $PATH は nvm.sh の中で広げる
# 本物の nvm.sh は、--no-use なしで読むと .nvmrc の版に切り替えようとし、入っていなければ 3 を返す（set -e だと黙って止まる。2026-11-04）
{ echo 'case " $* " in *" --no-use "*) ;; *) [ -f .nvmrc ] && return 3 ;; esac'
  printf 'nvm() { PATH="%s:$PATH"; }\n' "$real"; } > "$tmp/nvm/nvm.sh"
if run CHROMIUM_PATH="$tmp/bin/chromium" NVM_DIR="$tmp/nvm" PATH="$tmp/old:$PATH" && grep -q "nvm.sh.* && nvm use $want" "$tmp/out" && ! grep -q '^✓' "$tmp/out"; then
  ok "nvm で Node を入れたら nvm use を出し ✓ を出さない"
else ng "6. nvm で入れた Node をこのシェルで使う案内が無い"; fi

# 7. ブラウザを起動できない
if run CLAUDE_ENV_FILE="$envf" FAKE_LAUNCH_FAIL=1; then ng "7. ブラウザを起動できないのに止まらない"
elif grep -q '^✓' "$tmp/out"; then ng "7. ブラウザを起動できないのに ✓ を出した"
elif grep -q 'install-deps' "$tmp/out" || [ "$(uname -s)" != Linux ]; then ok "ブラウザを起動できないと止まり、直し方を出す"
else ng "7. Linux で install-deps の案内が無い"; fi

# 8. 空白のある場所
mkdir -p "$tmp/my apps"; cp "$tmp/bin/chromium" "$tmp/my apps/chromium"
: > "$envf"
if run CLAUDE_ENV_FILE="$envf" PW_PREINSTALLED="$tmp/my apps/chromium" && (set +u; . "$envf"; [ "$CHROMIUM_PATH" = "$tmp/my apps/chromium" ]); then
  ok "空白のあるブラウザの場所を、切れない形で CLAUDE_ENV_FILE に書く"
else ng "8. 空白のある場所が CLAUDE_ENV_FILE で切れる"; fi

# 9. 変わっていなければ入れ直さない（目印を置いて、消えないかを見る）
touch "$repo/app/node_modules/dep/.keep"
if run CLAUDE_ENV_FILE="$envf" && [ -f "$repo/app/node_modules/dep/.keep" ] && grep -q '入れ直さない' "$tmp/out"; then
  ok "lock も依存も変わっていなければ入れ直さない"
else ng "9. 変わっていないのに入れ直した"; fi

# 10. NODE_ENV=production でも devDependencies（playwright）を入れる（2026-11-07 gogen-suiri #1 の CodeRabbit）
rm -rf "$repo/app/node_modules"
if run CLAUDE_ENV_FILE="$envf" NODE_ENV=production && [ -f "$repo/app/node_modules/playwright/package.json" ]; then
  ok "NODE_ENV=production でも devDependencies を入れる"
else ng "10. NODE_ENV=production で playwright が入らない"; fi

# 11. requirements.txt が無ければ Python の節を飛ばす（写し残しで pip が止まった。2026-11-07 kikigaki-techo の Setup check）
mv "$repo/requirements.txt" "$tmp/req.bak"
if run CLAUDE_ENV_FILE="$envf" && grep -q '^✓ 準備できた' "$tmp/out" && [ ! -d "$repo/.venv2" ]; then
  ok "requirements.txt が無ければ Python の節を飛ばして通る"
else ng "11. requirements.txt が無いと止まる"; fi
mv "$tmp/req.bak" "$repo/requirements.txt"

# 12. package.json にある Playwright を読み込めない（2026-11-07 kotowaza-awase #1 の CodeRabbit。前は起動の試しを黙って飛ばしていた）
if run CLAUDE_ENV_FILE="$envf" FAKE_REQUIRE_FAIL=1; then ng "12. Playwright を読み込めないのに止まらない"
elif grep -q '^✓' "$tmp/out"; then ng "12. Playwright を読み込めないのに ✓ を出した"
elif grep -q '読み込めない' "$tmp/out"; then ok "package.json にある Playwright を読み込めないと止まる"
else ng "12. 読み込めない理由を出さない"; fi

# 13. 相対パスの CHROMIUM_PATH（起動の試しは npm_dir に移って動く。2026-11-07 dema-tashikame #1 の CodeRabbit）
mkdir -p "$repo/bin2"; cp "$tmp/bin/chromium" "$repo/bin2/chromium"
: > "$envf"
if run CLAUDE_ENV_FILE="$envf" CHROMIUM_PATH=bin2/chromium && grep -q '^✓ 準備できた' "$tmp/out" && (set +u; . "$envf"; [ "$CHROMIUM_PATH" = "$repo/bin2/chromium" ]); then
  ok "相対パスの CHROMIUM_PATH でも起動の試しが通り、絶対パスを CLAUDE_ENV_FILE に書く（版9）"
else ng "13. 相対パスの CHROMIUM_PATH で起動の試しが落ちる"; fi

# 14. .nvmrc が v22.1.0 の形（数字を全部つなぐと 2210 になっていた。版 10）
cp "$repo/.nvmrc" "$tmp/nvmrc.bak"; echo "v$want.1.0" > "$repo/.nvmrc"
if run CLAUDE_ENV_FILE="$envf" && grep -q '^✓ 準備できた' "$tmp/out"; then ok ".nvmrc が v$want.1.0 の形でも読める"
else ng "14. .nvmrc の v$want.1.0 を読めない"; fi
cp "$tmp/nvmrc.bak" "$repo/.nvmrc"

# 15. nvm install が失敗する（nvm が版の一覧を取れないとき。前は何も言わずに止まった）
printf 'nvm() { return 3; }\n' > "$tmp/nvm/nvm.sh"
if run CHROMIUM_PATH="$tmp/bin/chromium" NVM_DIR="$tmp/nvm" PATH="$tmp/old:$PATH"; then ng "15. nvm install が失敗したのに止まらない"
elif grep -q 'nvm install .* に失敗した' "$tmp/out"; then ok "nvm install が失敗したら止まって知らせる"
else ng "15. nvm install の失敗を知らせない"; fi

# 16. require では読めるが import() で読めない（ESM の入口 index.mjs の欠け。chikei-ate #1・kabu-news の CodeRabbit）
if run CLAUDE_ENV_FILE="$envf" FAKE_IMPORT_FAIL=1; then ng "16. import() で読めない Playwright で止まらない"
elif grep -q '^✓' "$tmp/out"; then ng "16. import() で読めないのに ✓ を出した"
else ok "import() で読めない Playwright で止まる（QA と同じ読み方）"; fi

# 17. 2つ同時に動いても npm ci を重ねず、両方通る（hyakunin-awase #1 の CodeRabbit）
rm -rf "$repo/app/node_modules"
( cd "$repo" && env -u CHROMIUM_PATH CLAUDE_ENV_FILE="$envf" PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PLAYWRIGHT_BROWSERS_PATH="$tmp/none" PW_PREINSTALLED="$tmp/bin/chromium" bash scripts/setup.sh ) > "$tmp/out1" 2>&1 & p1=$!
( cd "$repo" && env -u CHROMIUM_PATH CLAUDE_ENV_FILE="$envf" PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PLAYWRIGHT_BROWSERS_PATH="$tmp/none" PW_PREINSTALLED="$tmp/bin/chromium" bash scripts/setup.sh ) > "$tmp/out2" 2>&1 & p2=$!
r1=0; r2=0; wait $p1 || r1=$?; wait $p2 || r2=$?
cat "$tmp/out1" "$tmp/out2" > "$tmp/out"
if [ $r1 = 0 ] && [ $r2 = 0 ] && grep -q '^✓ 準備できた' "$tmp/out1" && grep -q '^✓ 準備できた' "$tmp/out2" && [ ! -d "$repo/app/.setup-lock" ]; then ok "2つ同時に動いても両方通り、ロックを残さない"
else ng "17. 同時に動かすと落ちる・ロックが残る"; fi

[ "$bad" = 0 ] || { echo "✗ ひな形 template/scripts/setup.sh の検査が落ちた" >&2; exit 1; }
echo "✓ ひな形の準備スクリプトの検査が通った"
