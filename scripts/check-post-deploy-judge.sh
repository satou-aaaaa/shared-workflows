#!/usr/bin/env bash
# Post-deploy check（.github/workflows/post-deploy.yml）の「公開側の問題か（差し戻さないか）」の判定を、開いたページの見本で試す。
# JavaScript のエラーのあるページ（5xx を除く）があれば差し戻しへ進み、エラーの無い 4xx だけなら公開側の問題とみる
# （incidents/2026-11-17-post-deploy-js-error-not-reverted.md）。判定は post-deploy.yml の PUBLIC_SIDE をそのまま使う。
set -euo pipefail
cd "$(dirname "$0")/.."
f=$(sed -n "s/^ *PUBLIC_SIDE='\(.*\)'$/\1/p" .github/workflows/post-deploy.yml)
[ -n "$f" ] || { echo "✗ post-deploy.yml に PUBLIC_SIDE='…' が無い" >&2; exit 1; }
fail=0
try() { # ページの見本（JSON） 期待（0=公開側の問題 1=差し戻しへ）
  local got=0
  jq -e "$f" <<<"$1" >/dev/null 2>&1 || got=1
  if [ "$got" != "$2" ]; then echo "✗ Post-deploy の判定: $1 は $([ "$2" = 0 ] && echo 公開側の問題 || echo 差し戻し) のはずが、ちがった" >&2; fail=1; fi
}
try '[{"path":"（トップ）","status":200,"errors":["TypeError: x is undefined"]}]' 1
try '[{"path":"（トップ）","status":200,"errors":[]},{"path":"a11y/a11y.html","status":200,"errors":["ReferenceError"]}]' 1
try '[{"path":"（トップ）","status":404,"errors":["ReferenceError"]}]' 1
try '[{"path":"（トップ）","status":404,"errors":[]}]' 0
try '[{"path":"（トップ）","status":200,"errors":[]},{"path":"a11y/a11y.html","status":404,"errors":[]}]' 0
try '[{"path":"（トップ）","status":503,"errors":["開けません"]}]' 0
[ "$fail" = 0 ] && echo "✓ Post-deploy の判定（JavaScript のエラーは差し戻し・エラーの無い 4xx だけなら公開側）"
exit "$fail"
