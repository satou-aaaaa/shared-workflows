#!/usr/bin/env bash
# push する前の確認を1コマンドで行う（CI の Lint と同じ中身）。先に bash scripts/setup.sh を1回。
set -euo pipefail
cd "$(dirname "$0")/.."
al="$PWD/.tools/bin/actionlint"
[ -x "$al" ] || al=actionlint
"$al" .github/workflows/*.yml
(cd template && "$al" .github/workflows/*.yml)
if command -v uvx >/dev/null; then z=(uvx zizmor==1.31.1); else z=(pipx run zizmor==1.31.1); fi
"${z[@]}" --offline --config zizmor.yml --min-severity medium .github/workflows template/.github/workflows
node scripts/check-bootstrap.mjs
node scripts/check-routines.mjs
echo "✓ 確認が通った"
