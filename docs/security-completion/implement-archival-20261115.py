#!/usr/bin/env python3
"""Owner-authorized additive hardening of the existing CircleCI archival script."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEADER = (
    "REVVEL-DISABLED | AGENT: security-specia"
    "list | MODEL: runtime-unspecified | WR: "
    "security-no-destroy-20261115 | DATE: 202"
    "6-11-15 | STATUS: REPLACED"
)


def replace(s, old, new, reason, prefix="#"):
    assert s.count(old) == 1, old[:100]
    retired = (
        f"{prefix} {HEADER}\n{prefix} REASON: {reason}\n"
        + "\n".join((prefix + " " + x).rstrip() for x in old.splitlines())
        + f"\n{prefix} REVVEL-DISABLED-END\n"
    )
    return s.replace(old, retired + new, 1)


p = ROOT / ".circleci/scripts/check-archival-policy.sh"
s = p.read_text()
start = s.index("resolve_allow_destroy() {")
end = s.index("\nERRORS=0", start)
s = replace(
    s,
    s[start:end],
    "",
    (
        "2026-10-30 owner rule prohibits all file"
        " deletion; labels/env cannot override it"
        ". No token or label lookup is needed."
    ),
)
start = s.index('if [ -z "${BASE_SHA:-}" ]; then')
end = s.index('\necho "🔍', start)
s = replace(
    s,
    s[start:end],
    (
        "# Resolve both commits and their actual "
        "common ancestor. Explicit BASE_SHA may\n#"
        " name a diverged base tip; never diff th"
        "at tip directly against the PR.\nif ! HEA"
        'D_SHA="$(git rev-parse --verify --end-of'
        '-options "${HEAD_SHA:-HEAD}^{commit}" 2>'
        '/dev/null)"; then\n  echo "ERROR: Could n'
        'ot resolve HEAD_SHA." >&2; exit 1\nfi\nif '
        '! BASE_COMMIT="$(git rev-parse --verify '
        '--end-of-options "${BASE_SHA:-origin/mai'
        'n}^{commit}" 2>/dev/null)"; then\n  echo '
        '"ERROR: Could not resolve BASE_SHA; ensu'
        're the base is fetched." >&2; exit 1\nfi\n'
        'if ! BASE_SHA="$(git merge-base "$BASE_C'
        'OMMIT" "$HEAD_SHA" 2>/dev/null)"; then\n '
        ' echo "ERROR: Could not determine merge '
        'base." >&2; exit 1\nfi\n# Disposable check'
        "ed Git outputs only; no repository work "
        'is removed by cleanup.\nSCAN_DIR="$(mktem'
        'p -d "$PWD/.archival-policy.XXXXXX")"\ntr'
        "ap 'rm -rf -- \"$SCAN_DIR\"' EXIT\n"
    ),
    "Fail closed on missing refs or Git errors and compare the PR to its merge-base.",
)
start = s.index('if [ "$ALLOW_DESTROY" != "true" ]; then')
end = s.index("\n# ── 2.", start)
s = replace(
    s,
    s[start:end],
    (
        "if ! git diff --no-ext-diff --no-textcon"
        "v --no-renames --name-only -z --diff-fil"
        'ter=D "$BASE_SHA" "$HEAD_SHA" -- > "$SCA'
        'N_DIR/deleted"; then\n  echo "ERROR: Coul'
        'd not read deleted-file diff." >&2; exit'
        ' 1\nfi\nif [ -s "$SCAN_DIR/deleted" ]; the'
        'n\n  echo "❌ Deleted files detected:" >&2'
        "\n  while IFS= read -r -d '' f; do\n    pr"
        'intf \'   - %q\\n\' "$f" >&2\n  done < "$SCA'
        'N_DIR/deleted"\n  echo "   Owner rule: ne'
        "ver delete tracked files; no label/env b"
        'ypass is permitted." >&2\n  echo "   Pres'
        "erve existing work with dated REVVEL-DIS"
        'ABLED comments and additive edits." >&2\n'
        "  ERRORS=$((ERRORS + 1))\nfi\n"
    ),
    "Global deletion block; checked NUL-delimited paths cannot be split by tabs/newlines.",
)
s = replace(
    s,
    """CHANGED_FILES=$(git diff --name-only --diff-filter=ACM "$BASE_SHA" HEAD 2>/dev/null || true)

if [ -n "$CHANGED_FILES" ]; then
  while IFS= read -r file; do
    [ -f "$file" ] || continue""",
    (
        "if ! git diff --no-ext-diff --no-textcon"
        "v --no-renames --name-only -z --diff-fil"
        'ter=ACMT "$BASE_SHA" "$HEAD_SHA" -- > "$'
        'SCAN_DIR/changed"; then\n  echo "ERROR: C'
        'ould not read changed-file diff." >&2; e'
        'xit 1\nfi\n\nif [ -s "$SCAN_DIR/changed" ];'
        " then\n  while IFS= read -r -d '' file; d"
        'o\n    if ! git cat-file blob "$HEAD_SHA:'
        '$file" > "$SCAN_DIR/content" 2>/dev/null'
        '; then\n      echo "ERROR: Could not read'
        ' changed Git blob as data." >&2; exit 1\n'
        "    fi"
    ),
    "Do not execute or dereference PR working-tree symlinks; inspect exact HEAD blobs as data.",
)
s = replace(
    s,
    "    grep -aqF 'REVVEL-DISABLED' -- \"$file\" || continue",
    "    grep -aqF 'REVVEL-DISABLED' -- \"$SCAN_DIR/content\" || continue",
    "Token pre-scan reads the checked Git blob, not an untrusted filesystem target.",
)
s = replace(
    s,
    "    while IFS= read -r line; do",
    '    while IFS= read -r line || [ -n "$line" ]; do',
    "Validate the final line even without a trailing newline.",
)
s = replace(
    s,
    '              echo "   Header: $BLOCK_HEADER" >&2',
    '              echo "   Header excerpt omitted; review the source locally." >&2',
    "Metadata headers may contain credentials; never publish raw excerpts.",
)
s = replace(s, '    done < "$file"', '    done < "$SCAN_DIR/content"', "Validate only committed PR blob data.")
s = replace(
    s,
    '  done <<< "$CHANGED_FILES"',
    '  done < "$SCAN_DIR/changed"',
    "NUL-safe file iteration instead of newline splitting.",
)
s = s.replace(
    "# Reference: standards/COMMENT-DONT-DELETE.md",
    (
        "# 2026-11-15: owner no-delete rule super"
        "sedes the historical label descriptions."
        "\n# No GitHub token/network access is nee"
        "ded. HEAD_SHA defaults to HEAD.\n# Refere"
        "nce: standards/COMMENT-DONT-DELETE.md"
    ),
    1,
)
p.write_text("\n".join(x.rstrip() for x in s.splitlines()) + "\n")

p = ROOT / "tests/circleci-allow-destroy.test.js"
s = p.read_text()
# Keep every old assertion visible and add the owner-policy expectations beside it.
for old, new in [
    (
        "  assert.equal(r.status, 0, `expected the label to ratify:\\n${r.stdout}\\n${r.stderr}`);",
        '  assert.equal(r.status, 1, "Owner no-delete rule blocks even a labelled PR");',
    ),
    (
        "  assert.match(r.stderr, /allow-destroy label found on PR #1234/);",
        "  assert.match(r.stderr, /no label\\/env bypass/);",
    ),
    ("  assert.match(r.stderr, /no GITHUB_TOKEN in this job/);", "  assert.match(r.stderr, /Deleted files detected/);"),
    ("  assert.match(r.stderr, /Add GITHUB_TOKEN/);", "  assert.doesNotMatch(r.stderr, /Add GITHUB_TOKEN/);"),
    ("  assert.match(r.stderr, /allow-destroy lookup failed/);", "  assert.match(r.stderr, /Deleted files detected/);"),
    (
        "  assert.equal(r.status, 0, 'an explicit setting is a decision already taken');",
        "  assert.equal(r.status, 1, 'ALLOW_DESTROY is inert under the owner no-delete rule');",
    ),
]:
    s = replace(s, old, new + "\n", "Legacy bypass assertions are superseded by owner no-delete policy.", "//")
# Keep fixtures inside the authorized worktree; cleanup only our disposable data.
s = replace(
    s,
    "const os = require('node:os');",
    "const os = { tmpdir: () => path.join(__dirname, '..', 'docs/security-completion') };\n",
    "Fixture writes stay in the authorized worktree.",
    "//",
)
s += """
// 2026-11-15: fixtures are disposable test data, not repository source.
process.on('exit', () => {
  for (const name of fs.readdirSync(os.tmpdir())) {
    if (/^(allow-destroy-|archival-scan-|archival-scan-edge-)/.test(name)) {
      fs.rmSync(path.join(os.tmpdir(), name), { recursive: true, force: true });
    }
  }
});
"""
p.write_text(s)
