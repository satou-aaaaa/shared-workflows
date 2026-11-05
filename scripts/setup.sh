#!/usr/bin/env bash
# 開発の準備を1コマンドで行う。人も、どの AI も同じ手順で動かせるようにするためのもの。何度実行してもよい。
#   使い方: bash scripts/setup.sh   （Windows は Git Bash で）
# Claude Code のクラウドセッションでは .claude/settings.json の SessionStart フックが自動で呼ぶ。
# 入れるもの: actionlint と shellcheck（.tools/bin に。CI の Lint もこれで入れるので、手元と CI で同じ版になる）。
#   zizmor は scripts/check.sh が uvx か pipx でその都度動かす。
#   push の前に scripts/check.sh を自動で回すフック（.githooks/pre-push）を git に登録する。
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "✗ $*" >&2; exit 1; }
session_env() { if [ -n "${CLAUDE_ENV_FILE:-}" ]; then echo "export $1" >> "$CLAUDE_ENV_FILE"; fi; }

# Node.js（版は .nvmrc）
want=$(tr -dc '0-9' < .nvmrc)
command -v node >/dev/null || fail "Node.js $want が要る（https://nodejs.org/ か、nvm・fnm で .nvmrc の版を入れる）"
have=$(node -p 'process.versions.node.split(".")[0]')
[ "$have" -ge "$want" ] || fail "Node.js $want 以上が要る（今は $have）"

# actionlint（版はここだけに書く）
ver=1.7.7
if [ "$(.tools/bin/actionlint -version 2>/dev/null | head -1)" != "$ver" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) plat=linux_amd64 ;; Linux-aarch64) plat=linux_arm64 ;;
    Darwin-x86_64) plat=darwin_amd64 ;; Darwin-arm64) plat=darwin_arm64 ;;
    MINGW*|MSYS*) plat=windows_amd64 ;;
    *) fail "actionlint を自動で入れられない環境（https://github.com/rhysd/actionlint の手順で入れる）" ;;
  esac
  mkdir -p .tools/bin
  if [ "$plat" = windows_amd64 ]; then
    curl -sSfL --retry 3 --retry-delay 5 --retry-all-errors -o .tools/al.zip "https://github.com/rhysd/actionlint/releases/download/v$ver/actionlint_${ver}_$plat.zip"
    unzip -oq .tools/al.zip actionlint.exe -d .tools/bin
  else
    curl -sSfL --retry 3 --retry-delay 5 --retry-all-errors "https://github.com/rhysd/actionlint/releases/download/v$ver/actionlint_${ver}_$plat.tar.gz" | tar xz -C .tools/bin actionlint
  fi
fi
session_env "PATH=\"$PWD/.tools/bin:\$PATH\""

# shellcheck（actionlint は shellcheck が無いと run: の中を黙って調べない。無いと手元だけ通って CI で落ちる。shared-workflows #83）
# 以前は「入っているか」だけ確かめていたので、クラウドのセッション（shellcheck が無い）では準備が止まり、
# 手元の確認を回せないまま push して Lint で落ちていた（incidents/2026-11-03-lint-failed-after-push.md）。版とチェックサムを決めて入れる。
sc_ver=0.11.0
if [ "$(.tools/bin/shellcheck --version 2>/dev/null | sed -n 's/^version: //p')" != "$sc_ver" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) sc_file="shellcheck-v$sc_ver.linux.x86_64.tar.xz" sc_sum=8c3be12b05d5c177a04c29e3c78ce89ac86f1595681cab149b65b97c4e227198 ;;
    Linux-aarch64) sc_file="shellcheck-v$sc_ver.linux.aarch64.tar.xz" sc_sum=12b331c1d2db6b9eb13cfca64306b1b157a86eb69db83023e261eaa7e7c14588 ;;
    Darwin-x86_64) sc_file="shellcheck-v$sc_ver.darwin.x86_64.tar.xz" sc_sum=3c89db4edcab7cf1c27bff178882e0f6f27f7afdf54e859fa041fca10febe4c6 ;;
    Darwin-arm64) sc_file="shellcheck-v$sc_ver.darwin.aarch64.tar.xz" sc_sum=56affdd8de5527894dca6dc3d7e0a99a873b0f004d7aabc30ae407d3f48b0a79 ;;
    MINGW*|MSYS*) sc_file="shellcheck-v$sc_ver.zip" sc_sum=8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e ;;
    *) fail "shellcheck を自動で入れられない環境（https://github.com/koalaman/shellcheck の手順で $sc_ver を入れ、.tools/bin/shellcheck に置く）" ;;
  esac
  mkdir -p .tools/bin .tools/dl
  curl -sSfL --retry 3 --retry-delay 5 --retry-all-errors -o ".tools/dl/$sc_file" "https://github.com/koalaman/shellcheck/releases/download/v$sc_ver/$sc_file"
  if command -v sha256sum >/dev/null; then got=$(sha256sum ".tools/dl/$sc_file" | cut -d' ' -f1); else got=$(shasum -a 256 ".tools/dl/$sc_file" | cut -d' ' -f1); fi
  [ "$got" = "$sc_sum" ] || fail "shellcheck のチェックサムが合わない（$sc_file）"
  case "$sc_file" in
    *.zip) unzip -oq ".tools/dl/$sc_file" shellcheck.exe -d .tools/bin ;;
    *) tar xJf ".tools/dl/$sc_file" -C .tools/dl && cp ".tools/dl/shellcheck-v$sc_ver/shellcheck" .tools/bin/shellcheck ;;
  esac
  rm -rf .tools/dl
fi

# push の前に scripts/check.sh を自動で回す（git の pre-push フック。git push --no-verify で飛ばせるが、手順では使わない）
if git rev-parse --git-dir >/dev/null 2>&1; then git config core.hooksPath .githooks; fi

# zizmor は uvx か pipx で動かす
command -v uvx >/dev/null || command -v pipx >/dev/null || fail "uv（https://docs.astral.sh/uv/ ）か pipx が要る（zizmor を動かすため）"

echo "✓ 準備できた。次は: bash scripts/check.sh"
