# Security guard completion — 2026-11-15

## Owner task and delivery status

Audrey requested working checks/alerts for destructive changes, leaked credentials and instruction smuggling, with agents finishing outcomes and fixing inherited blockers rather than ignoring them. The governing rule is **never delete, never wholesale-rewrite existing work**; superseded blocks remain commented in place with dated `REVVEL-DISABLED` metadata. Labels and environment flags do not authorize deletion. This work is on `fix/security-no-destroy-20261115`, started from main `e6b5a9965`, for a **draft PR only**. No merge is authorized.

Status is **CAN-PARTIAL**: portable implementations and local tests are available; remote enforcement is not established. The coordinator observed an account-wide GitHub Actions failure/no-step condition and a Checks API permission failure (403). Existing CircleCI is the active CI route. This task does not edit `.circleci/config.yml`, spend money, change billing, start paid jobs, or move untrusted scans onto a self-hosted runner. Required-check activation and trusted CircleCI invocation belong to the integration/owner review step, not to this local test receipt.

## Existing components extended

- `scripts/no-destroy-guard.js`: removes the active `allowDestroy` bypass while preserving the old code as comments. Deleted tracked files are blocked everywhere, including docs, scripts, data and lockfiles. Renames deliberately appear as deletion plus addition. Existing file-type changes and unquantified binary modifications are blocked.
- The retained protected-path line budget is 400, excluding lockfile churn as before. A separate **global budget of 1,000 removed lines includes every path and lockfile**. Removal of more than the budget fails; exactly the budget is allowed unless another rule fails.
- Replacement/stripping of at least **80% of a file's baseline lines**, when the file has **at least 20 baseline lines**, fails globally. Counting is against the actual merge-base, not a diverged base tip. Threshold configuration is strictly validated; missing refs, malformed records and Git failures fail closed.
- Git paths are NUL-delimited and parsed without splitting tabs/newlines. Unknown statuses, invalid UTF-8 paths, inconsistent status/count records and unreadable baseline blobs fail rather than silently skipping files. File content is Git blob data; external diff/textconv drivers are disabled. Control characters in guard filenames are escaped before logging.
- `.circleci/scripts/check-archival-policy.sh`: fixes the inherited live `allow-destroy` label/environment bypass. No token or label lookup is now required. Deleted-file and changed-file Git calls are checked before NUL-delimited iteration. The base is always resolved to the real merge-base. Metadata validation reads exact HEAD blobs, not mutable files or symlink targets; the final non-newline-terminated line is validated. Raw header excerpts are no longer printed. Existing metadata checks remain in place.
- `scripts/security-fleet.js`: adds `--event-file` input selection and a portable `pr` command. `issue_comment` scans **comment.body**, even when issue.body is nonempty. Missing/malformed inputs and reports fail; valid empty bodies remain supported. Complete recognized credential values are redacted, including the previously printed eight-character prefixes.
- PR mode scans explicit metadata and **added text only**, using the actual merge-base, so removing an already-leaked credential is not a new exfil finding. It also calls the existing no-destroy evaluator. Reports contain rule/location only, not attacker excerpts. Git diff is explicitly uncolored, has fixed output indicators and is forced to text for known-pattern scanning; hunk parsing does not confuse added lines beginning with `++` with file headers.
- `.github/workflows/no-destroy-guard.yml`: uses trusted BASE scripts, fetches the exact PR head only as Git data, verifies `FETCH_HEAD`, grants read-only contents access, and never checks out or executes PR security scripts.
- `.github/workflows/security-fleet.yml`: retains the existing fleet and adds a read-only `pull_request` blocking job, separate from trusted `pull_request_target`/issue write alerts. Write jobs execute only base/default-branch scripts; no PR dependencies or lifecycle scripts run in event/PR jobs. Sweep dependency installation is trusted and uses `--ignore-scripts`. Missing/invalid scans are red, not a clean pass or grounds for auto-closing an inherited finding. Findings are filed without source excerpts. Existing subject dedup, content fingerprints, repeat-sighting comments and own-finding issue exclusion remain; issue lookup now paginates beyond the first 100 results. Scheduled runs remain frozen.

## Immutable action pins

Full real upstream commits were resolved with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha` on 2026-11-15. GitHub CLI colored output was captured and normalized rather than treated as clean JSON. The repository visibility API confirmed this repository is public, allowing credential-free PR-ref fetches after checkout.

| Action | Resolved tag | Full upstream commit |
| --- | --- | --- |
| actions/checkout | v4 | 11d5960a326750d5838078e36cf38b85af677262 |
| actions/setup-node | v4 | 49933ea5288caeca8642d1e84afbd3f7d6820020 |
| actions/github-script | v7 | f28e40c7f34bde8b3046d885e986cb6290c5673b |

Every active checkout in the two scoped workflows has `persist-credentials: false`. PR refs are fetched and verified as data; no head checkout, package install, dynamic loading of PR scripts or PR executable invocation occurs in write-capable lanes.

## Portable calls for the existing CircleCI integration

No new runtime service is needed. The event/PR scanners use only Node built-ins; YAML is lazy-loaded only for the trusted workflow sweeps. The CircleCI integration should load security scripts from a verified trusted base checkout, supply the exact tested head commit, and keep PR contents as Git data. Do not invoke a PR-modified guard as the authority that evaluates that same PR.

```bash
# Set these to fetched, verified immutable commits. BASE_SHA may be a base tip;
# each implementation computes merge-base itself. HEAD_SHA is the real PR head.
export BASE_SHA='<verified base commit>'
export HEAD_SHA='<verified PR head commit>'

# From the trusted base checkout, with the head objects fetched but not checked out:
node scripts/no-destroy-guard.js
bash .circleci/scripts/check-archival-policy.sh

# Populate an explicit metadata text file from trusted CI/API event data.
# This must contain the actual PR title/body, not a guessed empty string.
# Fetch via a read-only API call if CircleCI lacks PR text in its environment.
node scripts/security-fleet.js pr --text-file '<PR metadata text file>' --json --strict

# GitHub event alternative (issue_comment selects comment.body):
GITHUB_EVENT_NAME=pull_request \
  node scripts/security-fleet.js pr --event-file '<GitHub event JSON>' --json --strict
```

PR metadata is required explicitly. Passing an empty file is valid **only when the actual supplied title/body are empty**, not as a substitute for missing API access. A read-only gate and a trusted write alert are different responsibilities; do not add issue-write credentials to the PR execution lane. The integration agent should wire these calls into existing CircleCI policy checks and establish required checks after successful owner-reviewed runs. This draft does not claim that integration is already active.

## Tests and definition of done

Local focused tests cover global deletion, inert labels/env flags, threshold boundaries, replacement detection, NUL paths, renames, binary modification, merge-base divergence, missing/invalid refs, Git failures, exact HEAD blobs, actual comment bodies, complete secret redaction, report contracts, immutable actions, read-only versus trusted-write permissions, pagination wiring, dedup/recursion, and adversarial PR scripts/manifests that must never execute. The adversarial test checks that an `EXECUTED` marker is never created.

A real regression surfaced during testing: inherited colored Git diff output hid all added lines from the first PR parser. The malicious-payload assertion was retained, the parser was fixed with `--no-color` and explicit hunk handling, and a color/custom-indicator/binary-attribute regression was added. YAML archived blocks inside literal script/run bodies also needed correctly indented language comments; malformed versions were fixed, not waived. Old assertions approving label bypasses remain dated comments, with new blocking assertions beside them.

Definition of done for this specialist draft is: implementations extended in place, original superseded code visible, focused local tests green, full-root results honestly recorded, no secret-bearing output introduced, exact-path Conventional Commits pushed, draft PR opened, remote/integration blockers and resume commands documented. **Merge and branch-required-check activation are explicitly outside this draft's done state.** Final counts/PR link are recorded in the test receipt and PR body.

```bash
cd /home/ubuntu/work/governance-guard
npm ci --ignore-scripts --no-audit --no-fund
node --test \
  tests/no-destroy-guard.test.js tests/no-destroy-guard-integration.test.js \
  tests/circleci-allow-destroy.test.js tests/circleci-archival-hardening.test.js \
  tests/security-fleet.test.js tests/security-fleet-dedup.test.js \
  tests/security-fleet-does-not-scan-itself.test.js \
  tests/security-fleet-no-duplicate-issues.test.js tests/security-fleet-hardening.test.js
node scripts/visiting-agent-scan.js
npm run workflows:validate
```

Implementation helper scripts in this directory record the one-time scoped transformations. They are historical reproducibility artifacts, **not CI entrypoints**; do not rerun them against the already-modified branch. Resume with the tested production commands above, inspect `git status`, and stage only explicit scoped paths. Never reset, delete, rebase over other work, force-push or merge the draft.

## Limits and remaining blockers

These deterministic tripwires are **heuristics, not universal malware, prompt-injection, secret, or destruction detection**. Small replacements below 20 baseline lines, distributed edits below thresholds, obfuscated/encoded or unknown credentials, encrypted malware and novel instruction-smuggling can evade the patterns. Security documentation/test fixtures can legitimately quote attack strings and trigger review; no content-label bypass has been added to the blocking PR scan. Binary additions are not asserted to be safe. Existing locked/generated-file metadata-scan exceptions are preserved, not broadened or presented as approval.

The fleet's own-finding issue label exclusion is preserved to prevent recursion, and its reporting dedup remains an anti-spam heuristic, not a transaction or universal event ordering guarantee. Concurrent alert events can still race between read and issue creation. Generic rule-only published bodies intentionally omit details; authorized reviewers inspect source locally. CircleCI trusted-script wiring, successful remote execution and owner-selected required checks must be verified separately. Account billing and permissions blockers must not be disguised as green scans, or fixed by paying, retrying paid jobs, or giving untrusted code a more privileged runner.
