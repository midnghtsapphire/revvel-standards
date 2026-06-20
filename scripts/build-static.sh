#!/usr/bin/env bash
# Assemble a static-site output directory for Vercel.
#
# Copies only the intended static assets from the repo root into public/, so the
# repository's source, workflows, and config files are NOT published to the web.
# Kept as a script (not an inline vercel.json buildCommand) because Vercel caps
# buildCommand at 256 characters.
set -euo pipefail

rm -rf public
mkdir -p public

# Top-level static files.
find . -maxdepth 1 -type f \( \
  -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' \
  -o -name '*.cjs' -o -name '*.svg' -o -name '*.png' -o -name '*.jpg' \
  -o -name '*.jpeg' -o -name '*.gif' -o -name '*.webp' -o -name '*.ico' \
  -o -name '*.txt' -o -name '*.xml' -o -name '*.webmanifest' \
\) -exec cp {} public/ \;

# Common static asset directories, if present.
for dir in assets static css js img images fonts; do
  if [ -d "$dir" ]; then
    cp -R "$dir" public/
  fi
done

# Publish the docs site so each app is reachable at /docs/<app>/ (its generated
# index.html test page). Markdown is copied alongside for direct linking.
if [ -d docs ]; then
  cp -R docs public/docs
fi

echo "Static site assembled in public/"
