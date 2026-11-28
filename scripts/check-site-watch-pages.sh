#!/usr/bin/env bash
# Site watch（.github/workflows/site-watch.yml）の「公開URLを Pages の設定から取る」手順を、gh api の答えの見本で試す。
# 404 だけを「Pages が切れている」で落とし、5xx・時間切れなどの揺れは3回まで試して、だめなら github.io の決まった形の URL で見る
# （incidents/2026-11-28-site-watch-api-blip-as-pages-off.md）。手順は ==pages-begin==〜==pages-end== をそのまま使う。
set -euo pipefail
cd "$(dirname "$0")/.."
step=$(sed -n '/# ==pages-begin==/,/# ==pages-end==/p' .github/workflows/site-watch.yml | sed 's/^          //')
[ -n "$step" ] || { echo "✗ site-watch.yml に ==pages-begin==〜==pages-end== が無い" >&2; exit 1; }
fail=0
try() { # gh の答え（1回ごとに空白区切り。ok=URL を返す 404・500=その番号で失敗） 期待（落ちる=1 か、出てくる base）
  local answers=$1 want=$2 tmp got
  tmp=$(mktemp -d)
  mkdir "$tmp/bin"
  cat > "$tmp/bin/gh" <<'GH'
#!/usr/bin/env bash
n=$(( $(cat "$T/n" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$T/n"
a=$(echo "$ANSWERS" | cut -d' ' -f"$n"); a=${a:-500}
case "$a" in
  ok) echo "https://example.github.io/demo/" ;;
  404) echo '{"message":"Not Found"}'; echo "gh: Not Found (HTTP 404)" >&2; exit 1 ;;
  *) echo "gh: Server Error (HTTP $a)" >&2; exit 1 ;;
esac
GH
  chmod +x "$tmp/bin/gh"
  got=$(cd "$tmp" && PATH="$tmp/bin:$PATH" T=$tmp ANSWERS=$answers PAGES_RETRY_DELAY=0 RUNNER_TEMP=$tmp \
    GITHUB_STEP_SUMMARY=$tmp/summary GITHUB_REPOSITORY=Satou-Demo/saibo \
    bash -euo pipefail -c "$step"$'\n''echo "BASE=$base"' 2>/dev/null | sed -n 's/^BASE=//p') || got=1
  [ -n "$got" ] || got=1
  rm -rf "$tmp"
  if [ "$got" != "$want" ]; then echo "✗ Site watch の Pages の読み取り: 答え「$answers」は「$want」のはずが「$got」だった" >&2; fail=1; fi
}
try "ok" "https://example.github.io/demo/"
try "500 ok" "https://example.github.io/demo/"
try "404" 1
try "500 404" 1
try "500 500 500" "https://satou-demo.github.io/saibo/"
[ "$fail" = 0 ] && echo "✓ Site watch の Pages の読み取り（404 だけ落とす・揺れは試し直して決まった形の URL で見る）"
exit "$fail"
