#!/usr/bin/env bash
# TriageChief, 2026-11-19, WR #18488. Runs ONE scheduled generator in CircleCI and,
# when its output meaningfully changed, commits it to a bot branch and opens or
# updates ONE draft PR into the newest daily/YYYY-MM-DD branch. Never main.
# Never force-pushes. Never prints the token: no `set -x`, no env dumps, and the
# token reaches git only through GIT_ASKPASS and the GitHub API only through node fetch.
#
# Usage: run-scheduled-generator.sh <dashboard|agent-creator|flow-charts|connections-registry>
# Env:   GENERATORS_GITHUB_TOKEN  (from CircleCI context generators-bot; missing = clean skip)
#        GENERATORS_REPO          (default midnghtsapphire/revvel-standards)
#        GENERATORS_BASE_BRANCH   (optional override; default = newest daily/YYYY-MM-DD)
#        GENERATORS_DRY_RUN=1     (generate and report, but do not push or open a PR)
#        GENERATORS_REMOTE_URL    (test hook: replaces https://github.com/<repo>.git)
set -euo pipefail

JOB="${1:-}"
REPO="${GENERATORS_REPO:-midnghtsapphire/revvel-standards}"
OWNER="${REPO%%/*}"
ASSIGNEE="midnghtsapphire"
WORK_DIR="$(pwd)"

case "$JOB" in
  dashboard)
    PATHS=(dashboard.html dashboard-data.json state.json)
    # Lines that change on every run and carry no information.
    VOLATILE='"lastUpdated"|Dashboard generated at|class="stat-value">[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}, '
    NEEDS_NPM=0
    ;;
  agent-creator)
    PATHS=(agent-creator-data.json agent-creator-data.js)
    VOLATILE=''
    NEEDS_NPM=1
    ;;
  flow-charts)
    PATHS=("docs/Master Revvel-Standards Flow Charts")
    VOLATILE='Last auto-sync:|Last sync:|Last_Sync'
    NEEDS_NPM=0
    ;;
  connections-registry)
    PATHS=(docs/CONNECTIONS_REGISTRY.md connections-dashboard.html README.md)
    VOLATILE='Last generated:'
    NEEDS_NPM=1
    ;;
  *)
    echo "usage: $0 <dashboard|agent-creator|flow-charts|connections-registry>" >&2
    exit 2
    ;;
esac

if [ -z "${GENERATORS_GITHUB_TOKEN:-}" ]; then
  echo "SKIP ($JOB): GENERATORS_GITHUB_TOKEN is not set. Add it to the CircleCI context 'generators-bot' (docs/SCHEDULED_GENERATORS.md). Nothing was run."
  exit 0
fi

# Helpers are copied out first because we switch the working tree to the daily
# branch, which may not contain this file yet.
HELPERS="$(mktemp -d)"
trap 'rm -rf "$HELPERS"' EXIT
cp "$(dirname "$0")/generator-pr.mjs" "$HELPERS/generator-pr.mjs"
printf '%s\n' '#!/bin/sh' 'case "$1" in' 'Username*) echo x-access-token ;;' '*) printf "%s\n" "$GENERATORS_GITHUB_TOKEN" ;;' 'esac' > "$HELPERS/askpass.sh"
chmod 700 "$HELPERS/askpass.sh"
export GIT_ASKPASS="$HELPERS/askpass.sh" GIT_TERMINAL_PROMPT=0

REMOTE_URL="${GENERATORS_REMOTE_URL:-https://github.com/${REPO}.git}"
git remote remove gen >/dev/null 2>&1 || true
git remote add gen "$REMOTE_URL"

# 1. Base branch: newest daily/YYYY-MM-DD (America/Denver dating is the repo's, we just sort).
BASE="${GENERATORS_BASE_BRANCH:-}"
if [ -z "$BASE" ]; then
  BASE="$(git ls-remote --heads gen 'refs/heads/daily/*' \
    | sed 's|.*refs/heads/||' \
    | grep -E '^daily/[0-9]{4}-[0-9]{2}-[0-9]{2}$' | sort | tail -n 1 || true)"
fi
if [ -z "$BASE" ]; then
  echo "ERROR ($JOB): no daily/YYYY-MM-DD branch found on $REPO. Refusing to fall back to main." >&2
  exit 1
fi
case "$BASE" in main|master) echo "ERROR: base branch must not be $BASE" >&2; exit 1 ;; esac
echo "($JOB) base branch: $BASE"
git fetch --quiet gen "+refs/heads/${BASE}:refs/remotes/gen/${BASE}"

# 2. One PR per job: continue an open bot PR for this job if there is one.
PREFIX="bot/generators/${JOB}"
EXISTING_HEAD="$(node "$HELPERS/generator-pr.mjs" find "$REPO" "$BASE" "$PREFIX")"
git config user.name "TriageChief generators-bot"
git config user.email "generators-bot@users.noreply.github.com"
if [ -n "$EXISTING_HEAD" ]; then
  HEAD_BRANCH="$EXISTING_HEAD"
  echo "($JOB) continuing open PR branch: $HEAD_BRANCH"
  git fetch --quiet gen "+refs/heads/${HEAD_BRANCH}:refs/remotes/gen/${HEAD_BRANCH}"
  git checkout --quiet -B generators-work "gen/${HEAD_BRANCH}"
  # Bring the branch up to the daily tip without rewriting history. Generated
  # files are rewritten below, so a conflict on them resolves to this branch.
  git merge --quiet --no-edit -X ours "gen/${BASE}" >/dev/null
else
  HEAD_BRANCH="${PREFIX}-$(date -u +%Y%m%d-%H%M%S)"
  echo "($JOB) no open PR: new branch $HEAD_BRANCH"
  git checkout --quiet -B generators-work "gen/${BASE}"
fi

# 3. Run the existing generator(s) from the checked-out tree.
if [ "$NEEDS_NPM" = "1" ]; then
  npm ci --no-audit --no-fund --loglevel=error
fi
# The agent-creator script must never reach a cloud LLM from here.
unset REVVEL_LLM_ALLOW_CLOUD OPENROUTER_API_KEY || true
case "$JOB" in
  dashboard)
    node scripts/aggregate-project-dashboard.js >/dev/null
    node scripts/populate-state.js
    ;;
  agent-creator) node scripts/build-agent-creator-data.js ;;
  flow-charts) REPO_ROOT="$WORK_DIR" node scripts/sync-flow-charts.js >/dev/null ;;
  connections-registry) node scripts/connections-registry.js --markdown --html ;;
esac

# 4. Anything meaningful? (-I ignores changes made only of volatile lines.)
git add -A -- "${PATHS[@]}"
if [ -n "$VOLATILE" ]; then
  if git diff --cached --quiet -I"$VOLATILE" HEAD; then CHANGED=0; else CHANGED=1; fi
else
  if git diff --cached --quiet HEAD; then CHANGED=0; else CHANGED=1; fi
fi
if [ "$CHANGED" = "0" ]; then
  echo "($JOB) no meaningful change; nothing to commit."
  exit 0
fi
git diff --cached --stat HEAD | tail -n 5

if [ "${GENERATORS_DRY_RUN:-0}" = "1" ]; then
  echo "($JOB) DRY RUN: would commit to $HEAD_BRANCH and open or update a draft PR into $BASE."
  exit 0
fi

RUN_URL="${CIRCLE_BUILD_URL:-CircleCI}"
STAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"
git commit --quiet -m "chore(generators): refresh ${JOB} (automated, CircleCI)" \
  -m "Generated by .circleci/scheduled-generators.yml (WR #18488). Run: ${RUN_URL}" \
  -m "— TriageChief"
git push --quiet gen "generators-work:refs/heads/${HEAD_BRANCH}"

BODY_FILE="$HELPERS/body.md"
{
  echo "**TriageChief:** Automated refresh of the \`${JOB}\` generator output, run by CircleCI (\`.circleci/scheduled-generators.yml\`, WR #18488)."
  echo
  echo "- Base: \`${BASE}\` (never \`main\`)"
  echo "- Last run: ${STAMP}, ${RUN_URL}"
  echo "- Files: $(printf '`%s` ' "${PATHS[@]}")"
  echo "- This PR is kept open and updated by each run until it is merged or closed. Draft-first, assigned to the owner; an agent never merges its own PR."
  echo
  echo "See \`docs/SCHEDULED_GENERATORS.md\`."
  echo
  echo "— TriageChief"
} > "$BODY_FILE"

node "$HELPERS/generator-pr.mjs" upsert "$REPO" "$BASE" "$HEAD_BRANCH" \
  "TriageChief: chore(generators): refresh ${JOB} (automated)" "$BODY_FILE" "$ASSIGNEE"
