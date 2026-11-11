#!/usr/bin/env bash
# Self-check for docs/skills/github-read-write-admin.
# Prints tool versions, the gh login, the oauth scope header, and repo
# permission flags. Never prints a token value.
# Usage:
#   bash docs/skills/github-read-write-admin/self-check.sh [OWNER/REPO]
#   bash docs/skills/github-read-write-admin/self-check.sh --offline [OWNER/REPO]
set -u

offline=0
repo="midnghtsapphire/revvel-standards"
for arg in "$@"; do
  case "$arg" in
    --offline) offline=1 ;;
    *) repo="$arg" ;;
  esac
done

fail=0

say() { printf '%s\n' "$*"; }

redact() {
  sed -E 's/(gho_|github_pat_|ghp_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+/[REDACTED]/g'
}

check_cmd() {
  local name="$1"
  local ver
  if command -v "$name" >/dev/null 2>&1; then
    ver="$("$name" --version 2>&1 | head -n 1 | redact)"
    say "OK: $name — $ver"
  else
    say "MISSING: $name"
    fail=1
  fi
}

check_cmd git
check_cmd gh
check_cmd jq

if [ "$offline" -eq 1 ]; then
  say "MODE: offline"
  exit "$fail"
fi

if ! command -v gh >/dev/null 2>&1; then
  say "AUTH: skipped because gh is missing"
  say "TOKEN_ENV: not inspected"
  exit "$fail"
fi

auth_out=$(mktemp)
user_json=$(mktemp)
user_err=$(mktemp)
headers=$(mktemp)
headers_err=$(mktemp)
perms=$(mktemp)
perms_err=$(mktemp)
cleanup() {
  rm -f "$auth_out" "$user_json" "$user_err" "$headers" "$headers_err" "$perms" "$perms_err"
}
trap cleanup EXIT

if gh auth status >"$auth_out" 2>&1; then
  say "OK: gh auth"
  redact <"$auth_out"
else
  say "MISSING: gh auth. Run: gh auth login"
  say "Do not paste a token into chat or into a file in the repo."
  redact <"$auth_out" || true
  fail=1
fi

login=""
if command -v jq >/dev/null 2>&1 && gh api user >"$user_json" 2>"$user_err"; then
  login=$(jq -r '.login // empty' "$user_json")
fi
if [ -n "$login" ]; then
  say "LOGIN: ${login}"
else
  # GitHub App installation tokens often 403 on /user. gh auth status still
  # names the account, and that is enough to know who the calls act as.
  login=$(sed -n 's/.*account \([^ ]*\).*/\1/p' "$auth_out" | head -n 1)
  if [ -n "$login" ]; then
    say "LOGIN: ${login} (from gh auth status; /user is blocked for this token)"
    redact <"$user_err" || true
  else
    say "LOGIN: unavailable"
    redact <"$user_err" || true
    fail=1
  fi
fi

if gh api user -i >"$headers" 2>"$headers_err"; then
  awk 'BEGIN{IGNORECASE=1} /^[Xx]-[Oo]auth-[Ss]copes:/ { sub(/\r/,""); print; found=1 } END{ if (!found) print "x-oauth-scopes: (empty — fine-grained token or GitHub App installation)" }' "$headers"
  awk 'BEGIN{IGNORECASE=1} /^[Xx]-[Aa]ccepted-[Oo]auth-[Ss]copes:/ { sub(/\r/,""); print }' "$headers"
else
  say "SCOPES: unavailable"
  redact <"$headers_err" || true
fi

if gh api "repos/${repo}" --jq '{admin:.permissions.admin,maintain:.permissions.maintain,push:.permissions.push,triage:.permissions.triage,pull:.permissions.pull}' >"$perms" 2>"$perms_err"; then
  say "REPO: ${repo}"
  cat "$perms"
  if command -v jq >/dev/null 2>&1 && jq -e '.admin == false and .push == false and .pull == false' "$perms" >/dev/null; then
    say "NOTE: this gh credential reports no pull, push, or admin on ${repo}. Tier 2 and Tier 3 calls with this credential will be refused."
  fi
else
  say "REPO_PERMISSIONS: unavailable for ${repo}"
  redact <"$perms_err" || true
  fail=1
fi

if [ -n "${GH_TOKEN:-}" ] || [ -n "${GITHUB_TOKEN:-}" ]; then
  say "TOKEN_ENV: set (value not printed)"
else
  say "TOKEN_ENV: unset"
fi

exit "$fail"
