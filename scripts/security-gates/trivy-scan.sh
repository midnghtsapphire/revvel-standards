#!/usr/bin/env bash
# trivy-scan.sh — Trivy on the files a PR changes. Proofy security gate 2a.
#
#   secrets (HIGH/CRITICAL)        BLOCK. No vulnerability DB needed.
#   vulnerabilities, misconfig     report only (the repo has an old backlog).
#
# Trivy is installed from the pinned GitHub release and its SHA-256 is checked
# against the constant below, so a swapped tarball fails. Set TRIVY_BIN to use an
# existing binary (tests). Honors .trivyignore.yaml when present.
# Exit: 0 clean, 1 secret found, 2 could not scan (also blocks).
set -euo pipefail

TRIVY_VERSION="0.76.2"
TRIVY_SHA256="bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf" # trivy_0.76.2_Linux-64bit.tar.gz
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="${SECURITY_GATES_WORK:-/tmp/security-gates-work}/trivy"
out="${SECURITY_GATES_OUT:-/tmp/security-gates}"
mkdir -p "$out"

trivy="${TRIVY_BIN:-}"
if [ -z "$trivy" ]; then
  dest="${TRIVY_INSTALL_DIR:-/tmp/trivy-bin}"
  mkdir -p "$dest"
  url="https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz"
  curl -fsSL --retry 3 -o "$dest/trivy.tgz" "$url"
  echo "${TRIVY_SHA256}  $dest/trivy.tgz" | sha256sum -c - >&2
  tar -xzf "$dest/trivy.tgz" -C "$dest" trivy
  trivy="$dest/trivy"
fi

staged="$(bash "$here/stage-changed-files.sh" "$work/files" | tail -1)"
echo "$staged"
if [[ "$staged" == "staged 0 file(s)"* ]]; then
  echo "No added or changed files: nothing to scan."
  exit 0
fi

ignore=()
[ -f .trivyignore.yaml ] && ignore=(--ignorefile "$PWD/.trivyignore.yaml")

# 1) Secrets: blocking, needs no database. A stale report must never be read.
rm -f "$out/trivy-secrets.json" "$out/trivy-other.json"
"$trivy" fs --scanners secret --severity HIGH,CRITICAL --format json --quiet \
  "${ignore[@]}" -o "$out/trivy-secrets.json" "$work/files" || true

# 2) Vulnerabilities + misconfig: report only. A failure here (DB download, rate
#    limit) is printed, never hidden, and never blocks.
other=""
if "$trivy" fs --scanners vuln,misconfig --severity HIGH,CRITICAL --format json --quiet \
     "${ignore[@]}" -o "$out/trivy-other.json" "$work/files"; then
  other="$out/trivy-other.json"
else
  echo "trivy vuln/misconfig scan did not complete (see log above); report-only, continuing." >&2
fi

set +e
node "$here/trivy-report.js" "$out/trivy-secrets.json" ${other:+"$other"}
rc=$?
set -e
exit "$rc"
