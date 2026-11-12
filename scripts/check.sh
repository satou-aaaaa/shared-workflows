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
node scripts/check-repo-lists.mjs
node scripts/check-issue-forms.mjs
node scripts/check-transfer.mjs
node template/qa/depth-check.mjs template/depth.js
node scripts/check-template-watch.mjs
node scripts/check-sw-check.mjs
node scripts/check-game-patterns.mjs
node scripts/check-link-text.mjs
node scripts/check-budgets.mjs
node scripts/fit-body.mjs
node scripts/check-game-wip.mjs
# Issue の重なりを見るのに検索（--search）を使わない。索引が遅れて、閉じた・作ったばかりの Issue を取りちがえる（incidents/2026-11-05-ci-time-report-missing-repos.md）
if grep -rn 'gh issue list.*-[-]search' .github/workflows template/.github/workflows; then echo "✗ Issue の一覧で検索の索引を使わない（--json と --jq で題を見る）" >&2; exit 1; fi
bash scripts/check-setup-template.sh
echo "✓ 確認が通った"
