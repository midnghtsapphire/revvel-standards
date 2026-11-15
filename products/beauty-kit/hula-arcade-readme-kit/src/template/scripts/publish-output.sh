#!/usr/bin/env bash
# Copies the generated SVGs in a folder onto the `output` branch of this repository (creates it the first time).
# Existing files on that branch are kept, so several workflows can share it. Plain git only, nothing third-party.
# Usage (inside a checkout made by actions/checkout):  bash scripts/publish-output.sh dist
set -euo pipefail
src="${1:?usage: publish-output.sh <folder-with-generated-files>}"
src="$(cd "$src" && pwd)"
wt="$(mktemp -d)/output-wt"
trap 'git worktree remove --force "$wt" >/dev/null 2>&1 || true' EXIT
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
if git ls-remote --exit-code --heads origin output >/dev/null 2>&1; then
  git fetch --quiet --depth=1 origin output
  git worktree add --quiet -B output "$wt" FETCH_HEAD
else
  git worktree add --quiet --detach "$wt"
  git -C "$wt" checkout --quiet --orphan output
  git -C "$wt" rm -rq --cached . || true
  find "$wt" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
fi
cp -R "$src"/. "$wt"/
git -C "$wt" add -A
if git -C "$wt" diff --cached --quiet; then
  echo "No changes to publish."
else
  git -C "$wt" commit --quiet -m "chore: update generated svgs"
  git -C "$wt" push --quiet origin HEAD:output
  echo "Published to branch output."
fi
