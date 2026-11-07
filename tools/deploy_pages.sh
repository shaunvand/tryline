#!/usr/bin/env bash
# Deploy TryLine to GitHub Pages (free). Run from the project root with gh authenticated.
# Pages serves the repo root of branch main; no build step.
set -euo pipefail
REPO="${1:-shaunvand/tryline}"
cd "$(dirname "$0")/.."
git add -A
git -c user.name="Shaun" -c user.email="shaun@yazimedia.com" commit -qm "TryLine: deploy $(date -u +%Y-%m-%dT%H:%MZ)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" || true
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source . --remote origin --push --description "TryLine — live rugby pocket companion PWA"
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
  git push -u origin main
fi
# enable Pages (idempotent)
gh api -X POST "repos/$REPO/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 || \
gh api -X PUT "repos/$REPO/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 || true
gh api "repos/$REPO/pages" --jq '.html_url + "  status=" + (.status // "pending")'
