#!/usr/bin/env bash
# Print "run" or "skip" for a product image/deploy job.
# Skip only when git can prove this revision does not touch the product.
# If the merge base cannot be found, print "run" so a shallow checkout
# cannot hide a broken image. Added 2026-11-11 by MarketShipper.
set -euo pipefail

PRODUCT="${1:?product name required}"
if [[ ! "$PRODUCT" =~ ^[a-z0-9-]+$ ]]; then
  echo "invalid product name" >&2
  exit 1
fi

if [[ "${FORCE_PRODUCT_IMAGE_GATE:-}" == "1" ]]; then
  printf 'run\n'
  exit 0
fi

git fetch origin main --depth=200 >/dev/null 2>&1 || true

changed=""
if [[ "${CIRCLE_BRANCH:-}" == "main" ]]; then
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    changed="$(git diff --name-only HEAD~1 HEAD || true)"
  else
    printf 'run\n'
    exit 0
  fi
elif git rev-parse --verify origin/main >/dev/null 2>&1; then
  base="$(git merge-base HEAD origin/main 2>/dev/null || true)"
  if [[ -z "$base" ]]; then
    printf 'run\n'
    exit 0
  fi
  changed="$(git diff --name-only "${base}...HEAD" || true)"
else
  printf 'run\n'
  exit 0
fi

if printf '%s\n' "$changed" | grep -Eq "^(products/${PRODUCT}/|\\.circleci/|\\.dockerignore$|tests/${PRODUCT}-image-gate\\.test\\.js$|tests/select-do-app\\.test\\.js$)"; then
  printf 'run\n'
else
  printf 'skip\n'
fi
