## Owner request and scope

Audrey requested actual Trivy and malware PR checks with durable outcomes. This extends the existing `.github/workflows/trivy.yml`, not a duplicate scanner system. Base: `e6b5a99659bf454874f62e8c8e4fba8f5aed32d5`. Branch: `fix/security-trivy-malware-20261115`. Draft only for owner review; no merge is authorized.

## Implemented requirements

- Legacy workflow permissions, pinned action, report-only exit code, unfixed suppression and SARIF `continue-on-error` blocks remain visible in dated comments. The source-retention regression test checks every original line.
- Both active action references are official full commit SHAs. Trivy v0.76.2 and ClamAV 1.5.4 official release artifacts have repository-pinned SHA-256 checksums for Linux x86_64 and ARM64. Bytes are verified before extraction or execution; no mutable shell installer, wrapper default or compromised v0.69.4 is used.
- Portable executable Python scripts under `scripts/security/` install without sudo or package hooks. ClamAV's bundled libraries and CVD certificates use the verified private prefix, not disabled signature verification.
- Trusted base scripts/manifest scan candidate checkout only as data. No candidate hooks, package install/build, script execution, repository secrets, `pull_request_target`, self-hosted runner, persisted checkout credentials or shared scanner cache.
- Trivy blocks HIGH/CRITICAL vulnerabilities, misconfigurations and secrets, including unfixed vulnerabilities. Candidate ignore/config files cannot override trusted policy. Missing/malformed reports, engine errors, status disagreement and stale/missing database fail.
- Independent ClamAV signature job updates and verifies official main/daily definitions, requires daily age at most 48 hours and fails on updater errors/cooldown, missing/stale/malformed definitions, scan errors or incomplete reports. No candidate file execution or bytecode execution. Scan-limit/encrypted/broken-content alerts block rather than silently green.
- Symlinks are scanned as Git target-text blobs without following them. LFS pointer payloads, submodule declarations and special files fail closed with a coverage reason.
- Exit 0 clean, exit 1 blocking findings and exit 2 operational/coverage failure remain distinct. Always-collected concise artifacts contain counts/metadata, never filenames, secret matches, candidate contents or raw logs. The central no-spam alert protocol and existing manual workflow-monitor limitations are documented.

## Tests and receipts

`python3 -I tests/scanner_checks_test.py`: 20 offline tests passed. Covers allowlisted install pins, invalid checksums before execution, compromised/mutable versions, redirects, environment isolation, unfixed/secret/misconfiguration blocking, malformed/missing reports, status mismatch, stale/future/missing definition dates, updater failure/cooldown, missing defs, data-only symlink normalization, LFS/submodule coverage and isolated entrypoint execution.

`python3 tests/scanner_workflow_test.py`: 6 tests passed. Covers scoped YAML, active action SHAs, read-only/no-secret permissions, trusted-base entrypoint, independent hosted Linux jobs, always-artifact policy and complete legacy preservation. PyYAML is a test-only dependency; production scripts use the standard library.

Official actionlint v1.7.12 ARM64 artifact SHA-256 was verified before execution. `actionlint -shellcheck= .github/workflows/trivy.yml` passed. `git diff --check` passed.

Actual ARM64 Trivy v0.76.2 install-and-scan completed with exit 1 and one HIGH Dockerfile misconfiguration. A real-engine fixture with candidate ignore/config overrides also returned exit 1. Database build timestamp: 2026-11-15T12:50:30.599818Z. This is runtime evidence, not a mock.

Actual checksum-verified ClamAV 1.5.4 engine: safe temporary EICAR synthetic-signature fixture returned exit 1; clean file returned 0; missing database returned engine error 2. This does not substitute for official-definition freshness evidence. The final official-definition result is recorded in `docs/scanners/TEST_RESULTS.json` and the scanner runbook.

Repository visiting-agent check returned exit 1 with four pre-existing `products/oaudrey-home/public/index.html` affiliate-text hits at lines 220, 221, 222 and 265. That file and the rule baseline were not changed. No unrelated worktree, `.circleci/config.yml`, security-fleet worker files or private Manus repository was edited.

## Exact resume and activation steps

1. Review the pinned sources and complete diff. Keep this PR draft until Audrey chooses the reviewed change; agents do not merge it.
2. Use the existing CircleCI Linux execution lane. The integration owner must call the exact `python3 -I .../scripts/security/scan.py` commands in `docs/security-completion/SCANNERS.md` from a separately reviewed base checkout, with candidate as data, no project contexts/secrets and always-run redacted artifact storage. This PR intentionally does not edit `.circleci/config.yml`.
3. Preserve both scanner exit statuses and independent jobs. Never add `|| true`, report-only exit codes or `continue-on-error` around scanning.
4. For future GitHub activation, resolve the account-wide hosted Actions startup problem without paid queues or Windows self-host substitution. Do not infer that no steps ran because a scanner passed. Existing example: security-fleet run 43736022589 failed before steps; checks-details access was HTTP 403 according to coordinator evidence.
5. The bootstrap PR's trusted-base scripts are absent on old main, so its trusted-base execution must fail closed pre-merge. Owner acceptance of locally tested implementation and owner merge is distinct from a verified running CI scanner. After scripts exist on the reviewed base and an available Linux job runs, verify actual artifacts and statuses for a clean fixture, HIGH/CRITICAL fixture, harmless EICAR fixture and deliberate engine error.
6. Require stable checks `trivy` and `malware-clamav` in GitHub rulesets, or the integration owner's exact CircleCI check names. Branch protection is an owner-controlled activation gap and was not modified here. No claim of enforced required checks is made.
7. Keep this PR/workstream as the single central implementation alert record. Subscribe reviewers and attach only redacted reason/count/SHA/run receipts. Wire any unattended alert through the existing central GitHub workstream and verify delivery without adding per-finding issue spam or provider calls.

No external paid calls or manual CI dispatch were made. Runtime artifacts alone do not establish whole-repository cleanliness, branch protection or unattended alert delivery.
