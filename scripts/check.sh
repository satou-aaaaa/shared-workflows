#!/usr/bin/env bash
# push する前の確認を1コマンドで行う（CI の Lint と同じ中身）。先に bash scripts/setup.sh を1回。
set -euo pipefail
cd "$(dirname "$0")/.."
# 道具は scripts/setup.sh が .tools/bin に入れた版を使う（CI の Lint と同じ版）
export PATH="$PWD/.tools/bin:$PATH"
# shellcheck が無いと actionlint は run: を調べず、手元だけ通って CI で落ちる（shared-workflows #83）
command -v actionlint >/dev/null && command -v shellcheck >/dev/null || { echo "✗ actionlint と shellcheck が要る（先に bash scripts/setup.sh）" >&2; exit 1; }
actionlint .github/workflows/*.yml
(cd template && actionlint .github/workflows/*.yml)
if command -v uvx >/dev/null; then z=(uvx zizmor==1.31.1); else z=(pipx run zizmor==1.31.1); fi
"${z[@]}" --offline --config zizmor.yml --min-severity medium .github/workflows template/.github/workflows
node scripts/check-bootstrap.mjs
node scripts/check-routines.mjs
node scripts/check-incidents.mjs
node scripts/check-capture.mjs
bash scripts/check-setup-template.sh
echo "✓ 確認が通った"
