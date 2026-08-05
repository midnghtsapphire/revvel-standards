#!/usr/bin/env bash
# generate-wr.sh — corrected WR generator. Fixes the five recurring review failures at the source.
# Usage: generate-wr.sh --issue <n> --title "<title>" --body-file <path> [--class auto|basic|full] [--meta <json>]
# Emits a clean WR to wr/issues/. Runs wr-lint.mjs at the end and FAILS if output is dirty.
set -euo pipefail

ISSUE=""; TITLE=""; BODY_FILE=""; CLASS="auto"; META="{}"
while [[ $# -gt 0 ]]; do case "$1" in
  --issue) ISSUE="$2"; shift 2;;
  --title) TITLE="$2"; shift 2;;
  --body-file) BODY_FILE="$2"; shift 2;;
  --class) CLASS="$2"; shift 2;;
  --meta) META="$2"; shift 2;;
  *) echo "unknown arg $1" >&2; exit 2;;
esac; done

[[ -z "$TITLE" ]] && { echo "need --title" >&2; exit 2; }
# wr/ — env-overridable so tests can point HERE at a sandbox instead of the
# real wr/issues/ (tests set HERE=<tmpdir>; without this default-only
# assignment the override is silently ignored and test runs mutate tracked
# fixture files).
HERE="${HERE:-$(cd "$(dirname "$0")/.." && pwd)}"
ISSUE_BODY="$( [[ -n "$BODY_FILE" && -f "$BODY_FILE" ]] && cat "$BODY_FILE" || echo "_No issue body provided._" )"

# ---- FIX (class 2): select template by issue class instead of always FULL ----
# ERE doesn't support \b word boundaries — they're matched literally and the
# whole pattern fails to fire, so EVERY auto-classified WR fell through to
# `full` (per Copilot review on #14227). Use grep -wiE so word matching is
# done by grep itself.
if [[ "$CLASS" == "auto" ]]; then
  # The DRAGNET fix persona (/dragnet and its fix aliases) files *permanent bug
  # fixes*, so its WRs use the BASIC short-form template like any other fix WR —
  # a long-form product template here just trips wr-lint rule 4 and stalls the
  # PR (issue #15122). Check this BEFORE the generic slash-command → FULL rule.
  # Mirrored in wr-pr-creation.yml and wr-lint.mjs (isSlashCommandTitle).
  if printf '%s' "$TITLE" | grep -qiE '^[[:space:]]*(\[WR\][[:space:]]*)?/(dragnet(-fix)?|errorfix|perm-?fix)([^a-z0-9-]|$)'; then
    CLASS="basic"
  # Other persona slash-command WRs (e.g. research personas) are substantive
  # research requests: use the FULL long-form template even though the title
  # often contains "fix". Check this BEFORE the fix/bug keyword downgrade.
  elif printf '%s' "$TITLE" | grep -qiE '^[[:space:]]*(\[WR\][[:space:]]*)?/[a-z]'; then
    CLASS="full"
  elif echo "$TITLE" | grep -qwiE '(fix|bug|typo|lint|refactor|chore|docs?|remove|pin|normalize|standardize|unreachable|duplicate)'; then
    CLASS="basic"
  elif echo "$TITLE" | grep -qiE '\<add (missing|test)\>'; then
    CLASS="basic"
  else
    CLASS="full"
  fi
fi
TEMPLATE="$HERE/WR_TEMPLATE_${CLASS^^}.md"
[[ -f "$TEMPLATE" ]] || { echo "template missing: $TEMPLATE" >&2; exit 2; }

# ---- FIX (class 1): strip leading HTML-comment guidance so the H1 lands at line 1.
# WR_TEMPLATE_FULL.md has author-instruction <!-- --> comments above the # WR:
# header. Without stripping, the linter sees H1 at line 3 and refuses the
# whole generation (Devin finding on #14227 — would have broken all
# FULL-template WRs). Strip ONLY leading comment lines, not body comments.

# ---- helpers ----
jq_get() {
  # Empty meta values must produce "N/A" not "", or the contract
  # (every section filled or explicit N/A) is silently violated per
  # Copilot review on #14227.
  local v
  v="$(echo "$META" | (command -v jq >/dev/null && jq -r ".$1 // \"\"" || echo ""))"
  [[ -z "$v" ]] && echo "N/A" || echo "$v"
}

DATE="$(date -u +%Y-%m-%d)"
# Strip the [WR] routing prefix — meaningful on the GitHub issue but redundant
# inside the document (template already starts with "# WR:"). If absent, no-op.
TITLE_CLEAN="$(printf '%s' "$TITLE" | sed -E 's/^\[WR\][[:space:]]*//')"

# ---- FIX (class 4): issue body goes to its own section, NEVER into a table cell ----
# ---- FIX (class 3): substitute every token; unknown metadata becomes 'unknown', not '{TOKEN}' ----
out="$(cat "$TEMPLATE")"
# Strip leading HTML comments before the H1 — `awk` walks the head of the
# template, drops any `<!-- ... -->` block (single-line or multi-line) and
# blank lines, until the first non-comment / non-blank line, then prints the
# rest verbatim. Without this, WR_TEMPLATE_FULL.md's leading author comments
# push the H1 to line 3+ and the lint gate refuses the output (Devin finding
# on #14227; multi-line comment fixes on #15215 / #15307 / #15313).
#
# LESSON (2026-07-08, see standards/GREEN_MAIN_STANDARD.md): six agents each
# pasted their own variant of this awk block on top of the previous one,
# leaving five unterminated "$(" — the script would not run at all. The gate
# that would have caught it (tests/generate-wr*.test.js) was already red on
# main, so nobody looked. Keep exactly ONE implementation here; a red gate is
# a stop sign, not scenery.
out="$(printf '%s\n' "$out" | awk '
  BEGIN { stripping=1; in_comment=0 }
  stripping && in_comment && /-->/ { in_comment=0; next }
  stripping && in_comment          { next }
  stripping && /^[[:space:]]*<!--/ {
    if (/-->/) { next }   # single-line comment — skip it
    in_comment=1; next    # opening of a multi-line comment
  }
  stripping && /^[[:space:]]*$/    { next }
  { stripping=0; print }
')"
# Escape & in replacement to prevent bash parameter-expansion from treating it
# as a backreference (& expands to the matched pattern text in ${var//pat/rep}).
subst() { local _r="${2//&/\\&}"; out="${out//\{$1\}/$_r}"; }
subst TITLE             "$TITLE_CLEAN"
subst ISSUE_REF         "#${ISSUE:-N/A}"
subst REPO              "midnghtsapphire/revvel-standards"
subst DATE              "$DATE"
subst RESEARCH_DATE     "$DATE"
subst RESEARCHER        "$(jq_get researcher)"
subst STATUS            "🟡 In Progress"
subst ISSUE_BODY        "$ISSUE_BODY"
subst SUMMARY           "$(jq_get summary)"
subst OBJECTIVE         "$(jq_get objective)"
subst REQUIRED_BUNDLE   "$(jq_get required_bundle)"
subst DEFINITION_OF_DONE "$(jq_get definition_of_done)"
subst VALIDATION        "$(jq_get validation)"
subst BLOCKERS          "None."
subst STARS             "$(jq_get stars)"
subst OPEN_ISSUES       "$(jq_get open_issues)"
subst IS_PRIVATE        "$(jq_get is_private)"
subst IS_ARCHIVED       "$(jq_get is_archived)"
subst EXECUTIVE_SUMMARY "$(jq_get executive_summary)"
subst PRODUCT_SELECTIONS "$(jq_get product_selections)"
subst DEEP_WEB_RESEARCH "$(jq_get deep_web_research)"
subst REQUIREMENTS      "$(jq_get requirements)"
subst RECOMMENDATIONS   "$(jq_get recommendations)"
subst RISKS             "$(jq_get risks)"

# Any token left unfilled becomes an explicit N/A marker, never a raw {TOKEN} or empty.
out="$(echo "$out" | sed -E 's/\{[A-Z_]+\}/N\/A/g')"
# Any empty filled section line -> N/A with reason (basic class has no market sections to worry about).
out="$(echo "$out" | sed -E 's/^([A-Za-z].*:)[[:space:]]*$/\1 N\/A/')"

SLUG="$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-50)"
DEST="$HERE/issues/issue-${ISSUE:-x}-${SLUG}.md"
mkdir -p "$HERE/issues"
printf '%s\n' "$out" > "$DEST"

# ---- FIX (class 5 guard): warn if no code fix is staged alongside a fix-class WR ----
# `\b` doesn't work in ERE — using grep -wi for actual word matching.
if [[ "$CLASS" == "basic" ]] && echo "$TITLE" | grep -qwi "fix"; then
  echo "REMINDER: This is a fix WR. The SAME PR must also modify the actual buggy file, not just add this WR." >&2
fi

# ---- Sanitize markdown before the gates (MD012/MD025/MD049; issue #15604) ----
# Pasted bodies carry extra H1s, double blank lines, and asterisk emphasis that
# fail the CircleCI changed-Markdown gate. $HERE is this script's wr/ directory
# (resolved at the top of this file), so the sanitizer lives at
# $HERE/scripts/sanitize-wr-markdown.mjs — same layout wr-lint.mjs uses below.
# Conditional so sandboxed copies of this script (tests) still work without
# the sanitizer alongside.
if command -v node >/dev/null && [[ -f "$HERE/scripts/sanitize-wr-markdown.mjs" ]]; then
  node "$HERE/scripts/sanitize-wr-markdown.mjs" "$DEST"
fi

# ---- HARD GATE: lint the output; fail if dirty ----
if command -v node >/dev/null && [[ -f "$HERE/scripts/wr-lint.mjs" || -f "$HERE/../workflows/wr-lint.mjs" ]]; then
  LINT="$HERE/scripts/wr-lint.mjs"; [[ -f "$LINT" ]] || LINT="$HERE/../workflows/wr-lint.mjs"
  node "$LINT" "$DEST" || { echo "GENERATOR REFUSED: output failed wr-lint. Not committing dirty WR." >&2; exit 1; }
fi

echo "WR written: $DEST  (class=$CLASS)"
