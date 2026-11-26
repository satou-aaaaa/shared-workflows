#!/usr/bin/env bash
# Link check（.github/workflows/link-check.yml）の「リンク切れがあれば落とす」手順を、結果の表の見本で試す。
# 時間切れ・相手のサーバーの不調（5xx）だけなら通し、リンク切れ・分からないもの・読めない表・lychee 自身の失敗は落とす
# （2026-11-17 incidents/2026-11-17-link-check-timeout-flaky.md）。手順は ==judge-begin==〜==judge-end== をそのまま使う。
set -euo pipefail
cd "$(dirname "$0")/.."
judge=$(sed -n '/# ==judge-begin==/,/# ==judge-end==/p' .github/workflows/link-check.yml | sed 's/^          //')
[ -n "$judge" ] || { echo "✗ link-check.yml に ==judge-begin==〜==judge-end== が無い" >&2; exit 1; }
fail=0
try() { # 見本 終わりの番号 期待（0=通す 1=落とす）
  local fx=$1 code=$2 want=$3 tmp got
  tmp=$(mktemp -d)
  if [ -n "$fx" ]; then mkdir -p "$tmp/lychee"; cp "scripts/fixtures/lychee/$fx" "$tmp/lychee/out.md"; fi
  got=0; (cd "$tmp" && CODE=$code bash -euo pipefail -c "$judge") >/dev/null 2>&1 || got=1
  rm -rf "$tmp"
  if [ "$got" != "$want" ]; then echo "✗ Link check の判定: ${fx:-（表なし）}・番号 ${code} は $([ "$want" = 0 ] && echo 通す || echo 落とす) はずが、ちがった" >&2; fail=1; fi
}
try timeout-only.md 0 0
try timeout-only.md 2 0
try error.md 2 1
try server-error-only.md 2 0
try server-error-and-404.md 2 1
try unknown.md 2 1
try broken-table.md 2 1
try "" 2 1
try timeout-only.md 1 1
[ "$fail" = 0 ] && echo "✓ Link check の判定（時間切れ・相手の不調（5xx）だけ通す・リンク切れは落とす）"
exit "$fail"
