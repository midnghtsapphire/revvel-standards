#!/usr/bin/env bash
# clamav-scan.sh — ClamAV on the files a PR changes. Proofy security gate 2b.
#
# Free: ClamAV from the distro package, signatures from freshclam. Scans only the
# files the PR adds or changes. BLOCKS on any detection.
#
# It will not pass quietly when it cannot work:
#   - signature download is retried 3 times, then the job FAILS with the reason
#   - an EICAR self-test (built at run time, never stored whole in the repo) must
#     be detected before the real scan runs, or the job FAILS
# A red job from a down signature mirror is fixed by re-running the job.
#
# Test hooks: CLAMSCAN_BIN, SKIP_INSTALL=1, SKIP_FRESHCLAM=1.
# Exit: 0 clean, 1 detection, 2 scanner not working (also blocks).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="${SECURITY_GATES_WORK:-/tmp/security-gates-work}/clamav"
out="${SECURITY_GATES_OUT:-/tmp/security-gates}"
mkdir -p "$out"

if [ "${SKIP_INSTALL:-0}" != "1" ] && ! command -v clamscan >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq clamav
fi
clamscan_bin="${CLAMSCAN_BIN:-clamscan}"

if [ "${SKIP_FRESHCLAM:-0}" != "1" ]; then
  ok=0
  for attempt in 1 2 3; do
    if sudo freshclam --quiet; then ok=1; break; fi
    echo "freshclam attempt $attempt failed; retrying in $((attempt * 10))s" >&2
    sleep $((attempt * 10))
  done
  if [ "$ok" != "1" ]; then
    echo "clamav-scan: could not download virus signatures after 3 attempts. Failing closed. Re-run the job." >&2
    exit 2
  fi
fi

# Self-test: the scanner must catch the standard harmless test string.
selftest="$work/selftest"
mkdir -p "$selftest"
p1='X5O!P%@AP[4\PZX54(P^)7CC)7}$'
p2='EICAR-STANDARD-ANTIVIRUS-'
p3='TEST-FILE!$H+H*'
printf '%s%s%s' "$p1" "$p2" "$p3" > "$selftest/eicar.com.txt"
set +e
"$clamscan_bin" --no-summary "$selftest/eicar.com.txt" >/dev/null 2>&1
st=$?
set -e
if [ "$st" -ne 1 ]; then
  echo "clamav-scan: self-test failed (clamscan exited $st on the EICAR test file, expected 1). The scanner is not working; failing closed." >&2
  exit 2
fi
echo "ClamAV self-test: detected EICAR as expected."

staged="$(bash "$here/stage-changed-files.sh" "$work/files" | tail -1)"
echo "$staged"
if [[ "$staged" == "staged 0 file(s)"* ]]; then
  echo "No added or changed files: nothing to scan."
  exit 0
fi

set +e
"$clamscan_bin" -r --infected --no-summary "$work/files" | tee "$out/clamav.txt"
st=${PIPESTATUS[0]}
set -e
case "$st" in
  0) echo "ClamAV: no detections in the changed files." ;;
  1) echo "ClamAV: DETECTION in the changed files (listed above). BLOCKED." >&2; exit 1 ;;
  *) echo "clamav-scan: clamscan exited $st (error). Failing closed." >&2; exit 2 ;;
esac
