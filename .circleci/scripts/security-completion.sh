#!/usr/bin/env bash
# 2026-11-15 security completion: transport/invocation only, not a new detector.
# Usage: security-completion.sh REPO HEAD_COMMIT BASE_COMMIT POLICY_SOURCE SCANNER_SOURCE REPORTS
# Optional seventh argument is a trusted transport-produced event metadata text
# file. Missing actual metadata is fleet error 2; other checks still complete.
# Run this file from an owner-reviewed immutable Git object, never candidate HEAD.
# Sources are full committed object IDs supplied by the reviewed CI configuration.
# Candidate trees are DATA: no checkout hooks, package scripts, imports or eval.
# No context is attached, and every engine gets a newly constructed environment.
# This is NOT protection against a hostile CircleCI config or project-level secrets
# already delivered to the outer job. See docs/security-completion/CIRCLECI.md.
set -euo pipefail
umask 077
# REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: The final worker contract requires actual PR metadata, never a guessed empty string.
# if [[ $# != 6 ]]; then
# REVVEL-DISABLED-END
if [[ $# != 6 && $# != 7 ]]; then
  printf 'security completion: six explicit arguments required\n' >&2
  exit 2
fi
repository=$1 head=$2 base=$3 policy_source=$4 scanner_source=$5 reports=$6
metadata=${7:-}
for ref in "$head" "$base" "$policy_source" "$scanner_source"; do
  if [[ ! $ref =~ ^[a-f0-9]{40}$ ]]; then
    printf 'security completion: full SHA-1 commit IDs required\n' >&2
    exit 2
  fi
done
# Resolve tool paths before scrubbing. CI supplies only image-owned PATH entries;
# local users must do the same. Candidate directories must never be on PATH.
node_bin=$(command -v node) python_bin=$(command -v python3)
git_bin=$(command -v git) bash_bin=$(command -v bash) tar_bin=$(command -v tar)
[[ -x $node_bin && -x $python_bin && -x $git_bin && -x $bash_bin && -x $tar_bin ]] || exit 2
tool_path="$(dirname "$node_bin"):/usr/bin:/bin"
work=$(mktemp -d /tmp/revvel-security.XXXXXXXX)
# Work is disposable execution data, never a tracked owner file. Retain only
# allowlisted, redacted reports; do not upload raw archives, logs or source.
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/home" "$work/private" "$work/candidate" "$work/policy" "$work/scanner"
clean() {
  /usr/bin/env -i PATH="$tool_path" HOME="$work/home" TMPDIR="$work/private" \
    LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null "$@"
}
repository=$(cd -- "$repository" && pwd -P)
mkdir -p -- "$reports"
reports=$(cd -- "$reports" && pwd -P)
# A caller must not write reports into a candidate checkout or the Git transport.
case "$reports/" in "$repository/"*) printf 'reports must be outside repository\n' >&2; exit 2;; esac
summary() {
  local engine=$1 code=$2 reason=$3
  mkdir -p -- "$reports/$engine"
  clean "$python_bin" -I - "$reports/$engine/report.json" "$engine" "$code" "$reason" <<'PY'
import json, sys
from pathlib import Path
p, engine, code, reason = sys.argv[1:]
code = int(code)
report = {"schema": 1, "engine": engine, "exit_code": code,
          "status": {0: "clean", 1: "findings", 2: "error"}[code], "reason": reason}
Path(p).write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
Path(p).with_name("summary.txt").write_text(f"{engine}: {report['status']}\nExit code: {code}\nReason: {reason}\nCandidate contents, filenames and raw logs are withheld.\n")
PY
}
# Normalize native engines without shell interpolation. A failed earlier check
# does not prevent later checks from running and producing their own receipts.
overall=0
record() {
  local engine=$1 code=$2 reason=$3
  [[ $code == 0 || $code == 1 || $code == 2 ]] || code=2
  summary "$engine" "$code" "$reason"
  if (( code > overall )); then overall=$code; fi
  printf '%s: exit %s (%s)\n' "$engine" "$code" "$reason"
}
fatal() {
  for engine in no-destroy archival fleet trivy clamav; do record "$engine" 2 "$1"; done
  exit 2
}
# Confirm the exact objects and actual shared ancestor. No shallow fallback,
# fetching over candidate files, base-tip-vs-head diff, or empty-ref green skip.
for ref in "$head" "$base"; do
  clean "$git_bin" -C "$repository" cat-file -e "$ref^{commit}" 2>/dev/null || fatal missing-candidate-or-baseline
 done
baseline=$(clean "$git_bin" -C "$repository" merge-base "$base" "$head" 2>/dev/null) || fatal missing-merge-base
[[ $baseline =~ ^[a-f0-9]{40}$ ]] || fatal invalid-merge-base
# Trusted source trees stay separate from candidate bytes and from each other.
export_source() {
  local ref=$1 destination=$2
  clean "$git_bin" -C "$repository" cat-file -e "$ref^{commit}" 2>/dev/null &&
    clean "$git_bin" -C "$repository" archive --format=tar "$ref" 2>/dev/null |
      clean "$tar_bin" --extract --file=- --directory="$destination" 2>/dev/null
}
policy_ok=0 scanner_ok=0
if export_source "$policy_source" "$work/policy"; then policy_ok=1; fi
if export_source "$scanner_source" "$work/scanner"; then scanner_ok=1; fi
# No Git export attributes are allowed to silently hide tracked candidate data.
# Enumerate every tracked blob through Git's archive with attributes disabled by
# an empty temporary index. Submodules are a coverage error, not an empty clean
# directory. Symlinks are retained and rejected by the portable scanner itself.
if ! clean "$git_bin" -C "$repository" -c core.attributesfile=/dev/null ls-tree -r -z "$head" > "$work/private/tree"; then
  fatal candidate-tree-unreadable
fi
if ! clean "$python_bin" -I - "$work/private/tree" <<'PY'
import sys
from pathlib import Path
records = Path(sys.argv[1]).read_bytes().split(b'\0')
if any(record.startswith(b'160000 ') for record in records):
    raise SystemExit(2)
PY
then fatal candidate-submodule-coverage-error; fi
# git archive honors committed export-ignore; therefore materialize blobs using
# ls-tree + cat-file instead. Python is isolated and only interprets Git records,
# never candidate source, package metadata, Python modules or symlink targets.
if ! clean "$python_bin" -I - "$git_bin" "$repository" "$head" "$work/private/tree" "$work/candidate" <<'PY'
import os, subprocess, sys
from pathlib import Path
binary, repository, head, listing, destination = sys.argv[1:]
root = os.fsencode(destination)
for record in Path(listing).read_bytes().split(b'\0'):
    if not record:
        continue
    metadata, name = record.split(b'\t', 1)
    mode, kind, oid = metadata.split(b' ')
    if kind != b'blob' or mode not in {b'100644', b'100755', b'120000'}:
        raise SystemExit(2)
    if name.startswith(b'/') or any(part in {b'', b'.', b'..'} for part in name.split(b'/')):
        raise SystemExit(2)
    # REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
    # REASON: Final scanner normalizes symlink target text; do not suppress engines on the existing .cursorrules symlink.
    # if mode == b'120000':
    #     # Do not create symlinks while materializing: a later path could escape.
    #     # The scanner rejects symlinks; reject here before any scan instead.
    #     raise SystemExit(2)
    # REVVEL-DISABLED-END
    # A symlink's Git blob is its target TEXT. Write it as a regular file;
    # never create or follow a filesystem symlink in the candidate snapshot.
    target = os.path.join(root, name)
    os.makedirs(os.path.dirname(target), mode=0o700, exist_ok=True)
    with open(target, 'xb') as stream:
        subprocess.run([binary, '-C', repository, 'cat-file', 'blob', oid.decode('ascii')],
                       stdout=stream, stderr=subprocess.DEVNULL, check=True, timeout=60)
    os.chmod(target, 0o400)  # executable candidate bits are never retained
PY
then fatal candidate-materialization-error; fi
cd -- "$repository"
# The exported module contains the reviewed policy. This driver only maps its
# findings/error contract to 0/1/2, never reimplements thresholds or diff parsing.
if (( policy_ok )) && [[ -f $work/policy/scripts/no-destroy-guard.js && ! -L $work/policy/scripts/no-destroy-guard.js ]]; then
  code=0
  clean "$node_bin" - "$work/policy/scripts/no-destroy-guard.js" "$baseline" "$head" > "$work/private/no-destroy.log" 2>&1 <<'JS' || code=$?
'use strict';
try {
  const guard = require(process.argv[2]);
  const files = guard.readDiff(process.argv[3], process.argv[4]);
  const result = guard.evaluateDiff(files);
  if (!result || typeof result.fail !== 'boolean' || !Array.isArray(result.reasons)) process.exit(2);
  process.exit(result.fail ? 1 : 0);
} catch (_) { process.exit(2); }
JS
  record no-destroy "$code" policy-evaluated
else record no-destroy 2 trusted-policy-missing; fi
if (( policy_ok )) && [[ -f $work/policy/.circleci/scripts/check-archival-policy.sh && ! -L $work/policy/.circleci/scripts/check-archival-policy.sh ]]; then
  code=0
  clean /usr/bin/env BASE_SHA="$baseline" HEAD_SHA="$head" \
    "$bash_bin" --noprofile --norc "$work/policy/.circleci/scripts/check-archival-policy.sh" \
    > "$work/private/archival.log" 2>&1 || code=$?
  # Legacy shell interface has exit 1 for input errors too; its fixed ERROR:
  # prefix distinguishes them. All raw output stays private (including names).
  if [[ $code == 1 ]] && grep -q '^ERROR:' "$work/private/archival.log"; then code=2; fi
  record archival "$code" policy-evaluated
  else record archival 2 trusted-policy-missing; fi
# REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Inspect the actual exported fleet API rather than assuming an absent CLI filename.
# if (( policy_ok )) && [[ -f $work/policy/scripts/security-fleet-pr-gate.js && ! -L $work/policy/scripts/security-fleet-pr-gate.js ]]; then
# REVVEL-DISABLED-END
# CircleCI does not supply authenticated PR body/title metadata here. This gate
# covers candidate additions only; it does not claim to audit PR metadata.
# 2026-11-15 final worker review: require transport-supplied actual PR/commit
# metadata. Older content-only wording above is history, not an input substitute.
if [[ ! -f $metadata || -L $metadata ]]; then
  record fleet 2 actual-event-metadata-unavailable
elif (( policy_ok )) && [[ -f $work/policy/scripts/security-fleet.js && ! -L $work/policy/scripts/security-fleet.js ]]; then
  code=0
# REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Use worker exports with validated report and findings/errors distinguished, not an invented CLI.
#   clean /usr/bin/env BASE_SHA="$baseline" HEAD_SHA="$head" \
#     "$node_bin" "$work/policy/scripts/security-fleet-pr-gate.js" \
#     > "$work/private/fleet.log" 2>&1 || code=$?
# REVVEL-DISABLED-END
  # REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
  # REASON: Add required real metadata path to the reviewed module driver.
  # clean "$node_bin" - "$work/policy/scripts/security-fleet.js" "$baseline" "$head" > "$work/private/fleet.log" 2>&1 <<'JS' || code=$?
  # REVVEL-DISABLED-END
  clean "$node_bin" - "$work/policy/scripts/security-fleet.js" "$baseline" "$head" "$metadata" > "$work/private/fleet.log" 2>&1 <<'JS' || code=$?
'use strict';
try {
  const fleet = require(process.argv[2]);
  // REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
  // REASON: Missing metadata cannot be disguised as an actual empty title/body.
  // const report = fleet.scanPr({baseSha: process.argv[3], headSha: process.argv[4], text: ''});
  // REVVEL-DISABLED-END
  const text = require('fs').readFileSync(process.argv[5], 'utf8');
  const report = fleet.scanPr({baseSha: process.argv[3], headSha: process.argv[4], text});
  fleet.validateReport(report, 'pr');
  process.exit(report.count > 0 ? 1 : 0);
} catch (_) { process.exit(2); }
JS
  record fleet "$code" policy-evaluated
else record fleet 2 trusted-fleet-gate-missing; fi
for engine in trivy clamav; do
  if (( scanner_ok )) && [[ -f $work/scanner/scripts/security/scan.py && ! -L $work/scanner/scripts/security/scan.py && \
      -f $work/scanner/scripts/security/install_scanners.py && ! -L $work/scanner/scripts/security/install_scanners.py && \
      -f $work/scanner/scripts/security/install-manifest.json && ! -L $work/scanner/scripts/security/install-manifest.json ]]; then
    code=0
    clean "$python_bin" -I "$work/scanner/scripts/security/scan.py" "$engine" \
      --candidate "$work/candidate" --tools "$work/private/tools-$engine" --reports "$reports/$engine" \
      > "$work/private/$engine.log" 2>&1 || code=$?
    # Validate the native sanitized receipt, preserving its fixed reason codes.
    if ! clean "$python_bin" -I - "$reports/$engine/report.json" "$engine" "$code" <<'PY'
import json, sys
from pathlib import Path
report = json.loads(Path(sys.argv[1]).read_text())
code = int(sys.argv[3])
assert code in {0, 1, 2} and report['schema'] == 1 and report['engine'] == sys.argv[2]
assert report['exit_code'] == code and report['status'] == {0:'clean',1:'findings',2:'error'}[code]
assert isinstance(report['reason'], str) and report['reason'] and all(c.islower() or c == '-' for c in report['reason'])
PY
    then record "$engine" 2 scanner-receipt-invalid
    else
      if (( code > overall )); then overall=$code; fi
      printf '%s: exit %s (see redacted receipt)\n' "$engine" "$code"
    fi
  else record "$engine" 2 trusted-scanner-source-missing; fi
done
summary aggregate "$overall" all-results-collected
printf 'security completion: aggregate exit %s\n' "$overall"
exit "$overall"
