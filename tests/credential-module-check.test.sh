#!/usr/bin/env bash
# tests/credential-module-check.test.sh — exercise the safety contract
# of scripts/credential-module-check.sh.
#
# Run from repo root:
#   bash tests/credential-module-check.test.sh
#
# Exits 0 if all cases pass, 1 on any failure. Per cubic + Copilot
# review on PR #14688: this script gates credential workflows, so a
# small regression suite around enabled/disabled/missing/unknown/
# inline-comment paths is worth its weight.

set -u

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/scripts/credential-module-check.sh"
PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── Fixture: a minimal but representative config ─────────────────────────────
cat > "$TMP/config.yml" <<'YAML'
modules:

  - id: enabled-mod
    description: present and enabled
    enabled: true

  - id: disabled-mod
    description: present and disabled
    enabled: false

  - id: commented-disabled
    description: disabled with inline comment (regression for the bug we just fixed)
    enabled: false  # keep off until reconciled

  - id: commented-enabled  # inline comment on the id line itself
    description: enabled with inline comment on the id
    enabled: true
YAML

# ── Test harness ────────────────────────────────────────────────────────────
assert_exit() {
  # assert_exit <expected_code> <description> -- <command...>
  local expected="$1"; shift
  local desc="$1"; shift
  [[ "$1" == "--" ]] && shift
  local got
  "$@" >/dev/null 2>&1
  got=$?
  if [[ "$got" == "$expected" ]]; then
    echo "  ✓ $desc (exit $got)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected $expected, got $got)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== credential-module-check.sh contract tests ==="

# 1. Usage error returns 2
assert_exit 2 "no args → exit 2 (usage)" -- bash "$SCRIPT"

# 2. Enabled module returns 0
CREDENTIAL_MODULES_CONFIG="$TMP/config.yml" \
  assert_exit 0 "enabled module → exit 0" -- bash "$SCRIPT" enabled-mod

# 3. Disabled module returns 78
CREDENTIAL_MODULES_CONFIG="$TMP/config.yml" \
  assert_exit 78 "disabled module → exit 78" -- bash "$SCRIPT" disabled-mod

# 4. Disabled with INLINE COMMENT — the bug Copilot caught
CREDENTIAL_MODULES_CONFIG="$TMP/config.yml" \
  assert_exit 78 "disabled with inline comment → exit 78 (no fail-open)" -- bash "$SCRIPT" commented-disabled

# 5. Enabled module with INLINE COMMENT on the id line
CREDENTIAL_MODULES_CONFIG="$TMP/config.yml" \
  assert_exit 0 "enabled with inline comment on id → exit 0" -- bash "$SCRIPT" commented-enabled

# 6. Unknown module → fail-open (exit 0) per documented safety contract
CREDENTIAL_MODULES_CONFIG="$TMP/config.yml" \
  assert_exit 0 "unknown module → fail-open exit 0" -- bash "$SCRIPT" not-in-config

# 7. Missing config file → fail-open
CREDENTIAL_MODULES_CONFIG="$TMP/does-not-exist.yml" \
  assert_exit 0 "missing config → fail-open exit 0" -- bash "$SCRIPT" enabled-mod

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "passed: $PASS  failed: $FAIL"
[[ "$FAIL" -eq 0 ]] || exit 1
exit 0
