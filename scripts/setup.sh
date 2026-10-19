#!/usr/bin/env bash
# 開発の準備を1コマンドで行う。人も、どの AI も同じ手順で動かせるようにするためのもの。何度実行してもよい。
#   使い方: bash scripts/setup.sh   （Windows は Git Bash で）
# Claude Code のクラウドセッションでは .claude/settings.json の SessionStart フックが自動で呼ぶ。
# 入れるもの: actionlint（.tools/bin に。CI の Lint もこれで入れる）。zizmor は scripts/check.sh が uvx か pipx でその都度動かす。
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
    curl -sSfL -o .tools/al.zip "https://github.com/rhysd/actionlint/releases/download/v$ver/actionlint_${ver}_$plat.zip"
    unzip -oq .tools/al.zip actionlint.exe -d .tools/bin
  else
    curl -sSfL "https://github.com/rhysd/actionlint/releases/download/v$ver/actionlint_${ver}_$plat.tar.gz" | tar xz -C .tools/bin actionlint
  fi
fi
session_env "PATH=\"$PWD/.tools/bin:\$PATH\""

# zizmor は uvx か pipx で動かす
command -v uvx >/dev/null || command -v pipx >/dev/null || fail "uv（https://docs.astral.sh/uv/ ）か pipx が要る（zizmor を動かすため）"

echo "✓ 準備できた。次は: bash scripts/check.sh"
