#!/usr/bin/env bash
# publish-malama.sh — extract the open-core Mālama engine into a clean,
# standalone, publishable directory (ready to push to a PUBLIC repo).
#
# This does NOT publish anything by itself. It copies skills/malama/ into a
# dist dir, verifies it's secret-free, and prints the exact git commands to
# create the public repo when YOU decide to.
#
# Usage:
#   scripts/publish-malama.sh [dest_dir]      # default: ./dist/malama
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/skills/malama"
DEST="${1:-$REPO_ROOT/dist/malama}"

echo "→ Source : $SRC"
echo "→ Dest   : $DEST"

if [[ ! -d "$SRC" ]]; then
  echo "✗ $SRC not found" >&2; exit 1
fi

# 1. Secret scan — refuse to package if anything looks like a credential.
echo "→ Scanning for secrets…"
# -l lists only matching FILE PATHS, never the matched content, so a real
# credential is never echoed to stdout/CI logs.
hits="$(grep -rliE 'sk-[a-z0-9]{20}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|xox[baprs]-|-----BEGIN [A-Z ]*PRIVATE KEY-----' "$SRC" || true)"
if [ -n "$hits" ]; then
  echo "✗ Potential secret found in these files — aborting (remove before publishing):" >&2
  echo "$hits" >&2
  exit 2
fi
echo "  ✓ no credential-shaped strings found"

# 2. Stage a clean copy.
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC"/. "$DEST"/

# 3. Make README the front page (LICENSE already inside).
[[ -f "$DEST/README.md" ]] || echo "⚠ no README.md in package"

echo
echo "✓ Packaged Mālama engine at: $DEST"
echo "  Contents:"
( cd "$DEST" && ls -1 )

cat <<EOF

Next step — publish when ready (this script intentionally does NOT do it):

  cd "$DEST"
  git init -b main
  git add .
  git commit -m "Mālama — open self-evolving agent engine (AGPL-3.0)"
  # create an EMPTY public repo first, then:
  git remote add origin git@github.com:<you>/malama.git
  git push -u origin main

Reminder: AGPL publication is effectively irreversible. Confirm the secret
scan above passed and that this is the version you want public.
EOF
