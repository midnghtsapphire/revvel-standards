#!/usr/bin/env bash
# Build the whole revvel-standards site in one pass.
# Sources:
#   docs/<slug>/      -> /docs/<slug>/        (your slug pages - copied as-is)
#   projects/<slug>/  -> project registry entries (cards on the hub index)
#   projects/<slug>/docs/ -> ALSO copied to /projects/<slug>/ (if present)
# Output: public/  (Vercel outputDirectory)
set -e
cd "$(dirname "$0")/.."
OUT=public
rm -rf "$OUT"
mkdir -p "$OUT"

echo "[*] Copying docs/ -> public/docs/"
cp -r docs "$OUT/docs" 2>/dev/null || true

echo "[*] Copying projects/*/docs -> public/projects/<slug>/"
mkdir -p "$OUT/projects"
if [ -d projects ]; then
  for d in projects/*/; do
    slug=$(basename "$d")
    [ "$slug" = "_self" ] && continue
    if [ -d "$d/docs" ]; then
      mkdir -p "$OUT/projects/$slug"
      cp -r "$d/docs/." "$OUT/projects/$slug/" 2>/dev/null || true
    fi
    # always carry the project.json so the site can read registry data
    [ -f "$d/project.json" ] && cp "$d/project.json" "$OUT/projects/$slug/" 2>/dev/null || true
  done
fi

echo "[*] Regenerating hub-registry.json"
node scripts/build-hub-registry.js || echo "[!] registry build skipped (node missing?)"

echo "[*] Generating site index"
node scripts/build-site-index.js

# root convenience: / -> hub index (already at public/index.html via script)
echo "[+] Build complete: $(find "$OUT" -type f | wc -l) files in $OUT/"
