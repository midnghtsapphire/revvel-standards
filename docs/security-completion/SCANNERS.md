# Trivy and malware PR checks

The existing `.github/workflows/trivy.yml` is the only workflow changed for this scanner workstream. Trivy filesystem scanning detects dependency vulnerabilities, misconfigurations and secrets; it is not an antivirus scanner. Vulnerability and secret scanners default on, while misconfiguration scanning needs explicit enablement.[1] ClamAV provides the separate signature-based malware check.[4]

The March 2026 incident compromised mutable action tags, the setup wrapper and scanner binary v0.69.4. A full action SHA alone does not pin the binary downloaded by the wrapper.[2] The implementation refuses v0.69.4 and mutable installers. Official GitHub release metadata verified on 2026-11-15 identifies Trivy v0.76.2, published 2026-11-05, as an immutable release. The Linux archive hash is recorded in `scripts/security/install-manifest.json`, not fetched as a new source of trust at runtime.[3] ClamAV 1.5.4 uses the official Cisco-Talos Linux package with a repository-pinned archive checksum even though its GitHub release is not immutable.[5]

## Scoped implementation contract

Context: governance base is `e6b5a99659bf454874f62e8c8e4fba8f5aed32d5`; the old Trivy action reported success on findings, hid unfixed vulnerabilities and treated SARIF upload errors as nonfatal. GitHub-hosted Linux jobs are reported unavailable before steps start. This work does not substitute a Windows self-hosted runner.

Feature: actual fail-closed Trivy and ClamAV PR checks with redacted receipts. Dependencies: Python 3, Linux x86_64, dpkg-deb for package extraction, official GitHub assets, Trivy public vulnerability databases and ClamAV official signature CDN. No repository secret, paid API, candidate build or candidate script is required.

Acceptance gates: pinned download hash verified before extraction or execution; HIGH/CRITICAL findings including unfixed dependencies fail; scanner errors and missing or malformed reports fail; ClamAV update failure, stale or missing definitions fail; clean scan, detection and engine-error statuses remain distinct; malicious filenames and secret contents never enter public reports; action references use full SHAs; local executable smoke tests and workflow syntax checks are recorded.

Files in scope: `.github/workflows/trivy.yml`, `scripts/security/`, `tests/scanner*`, and this scanner document. Existing code is retained in dated comments rather than deleted. Guard/fleet and repository-wide governance edits belong to other workers. Rollback is an owner-reviewed additive PR that comments out the new jobs in place; it must not silently restore report-only green security checks. No database migration exists. Delivery remains a draft PR, never agent-merged.

## Trust boundary and activation

PR jobs check out trusted scripts and the installation manifest from the PR base SHA, then a separate candidate checkout at the merge SHA. They execute only trusted scripts, not candidate Python, shell, package hooks, plugins or workflows. Candidate scanner configuration and ignore files must not override trusted policy. `pull_request_target`, persistent checkout credentials, repository secrets, candidate code execution, self-hosted runners and shared scan caches are excluded.

This bootstrap PR cannot truthfully pass trusted-base scanner execution before its scripts exist on the reviewed base branch. Missing base scripts must stay red. Owner review/merge is separate from testing the candidate implementation locally. Hosted Linux capacity/billing/runner startup must be restored before these checks can supply live CI evidence; no code change can prove a scanner ran when no runner started. Branch protection must require both stable check names after owner activation. Required checks are not activated by merely opening the draft PR.

## References

[1]: https://trivy.dev/docs/latest/guide/target/filesystem/ "Official Trivy filesystem target guide"
[2]: https://www.crowdstrike.com/en-us/blog/from-scanner-to-stealer-inside-the-trivy-action-supply-chain-compromise/ "CrowdStrike Trivy action and binary compromise analysis"
[3]: https://api.github.com/repos/aquasecurity/trivy/releases/435196879 "Official Trivy v0.76.2 release metadata with immutable assets and SHA-256 digests"
[4]: https://docs.clamav.net/manual/Usage/Scanning.html "Official ClamAV one-time scanning manual"
[5]: https://api.github.com/repos/Cisco-Talos/clamav/releases/366392418 "Official ClamAV 1.5.4 Linux release assets and SHA-256 digests"

## Portable execution in the existing CircleCI lane

No `.circleci/config.yml` change is included here. The integration owner must call these same scripts from the existing Linux CircleCI pipeline, not create another scanner service. Python 3.10+, `dpkg-deb`, CA certificates and Linux x86_64 or ARM64 are required. The official ClamAV package bundles its libraries and CVD certificates; the installer sets `LD_LIBRARY_PATH` and `CVD_CERTS_DIR` to the verified private prefix without sudo, package hooks or disabled signature verification. ClamAV documents this certificate relocation option.[6]

Use a reviewed base checkout in `/tmp/scanner-trusted` and a candidate checkout in `/tmp/scanner-candidate`. Validate both commit SHAs before checkout. Do not execute the candidate's scripts or tests. Do not mount production credentials, Docker sockets, SSH keys, project contexts or private network access in the scanner job. Remove checkout credentials after reading source and give the scan process no repository secrets. Use the isolated interpreter flag so candidate import paths cannot substitute modules.

```bash
python3 -I /tmp/scanner-trusted/scripts/security/scan.py trivy \
  --candidate /tmp/scanner-candidate \
  --tools /tmp/scanner-trivy-tools \
  --reports /tmp/scanner-reports/trivy

python3 -I /tmp/scanner-trusted/scripts/security/scan.py clamav \
  --candidate /tmp/scanner-candidate \
  --tools /tmp/scanner-clamav-tools \
  --reports /tmp/scanner-reports/clamav
```

Run these as independent checks so one failure does not suppress the other. Every invocation needs a fresh tools directory: extracted engine bytes are never trusted from a cached receipt alone. Reports and tools must be outside the candidate checkout. Preserve each command's exact exit status. In CircleCI, use an always-run artifact step for `/tmp/scanner-reports`; do not append `|| true` to scanner commands or allow a receipt collection step to replace a failed command's status.

Exit 0 means the scan completed without blocking findings. Exit 1 means blocking findings were detected. Exit 2 means installation, engine, report, freshness or source-coverage failure. Each production invocation writes `report.json` and `summary.txt`, initialized to an error before engine installation. Reports expose counts and reviewed engine/database metadata, never candidate filenames, matched secrets, contents or raw stdout/stderr. GitHub job-level fallback summaries cover missing trusted scripts. A runner that never starts cannot produce artifacts; report it as an infrastructure failure with the run URL, not a clean scan.

Trivy enables `vuln,misconfig,secret`, HIGH/CRITICAL blocking severity and `ignore-unfixed=false`. Candidate `trivy.yaml`, `.trivyignore`, `trivy-secret.yaml` or Rego policies cannot change trusted flags. The explicit Rego `ignore := false` decision is valid; an empty policy file is not. The Trivy vulnerability database must be present and built within 48 hours. Source is normalized into private regular files; symlink target text is scanned as Git blob data without following it. `.git` transport metadata is excluded. Git LFS pointers, submodule declarations and special files fail closed instead of silently scanning missing payloads.

ClamAV uses fresh official `main` and `daily` signature databases, verifies them with `sigtool`, and requires rolling `daily` build age at most 48 hours. A failed updater, cooldown warning, missing/ambiguous definitions, invalid database, missing report, engine error or scan-limit warning cannot pass. `main` is a long-lived base database, so freshness comes from the successful official update and valid signatures rather than an arbitrary young build date. The signature-only lane does not download or execute bytecode. Its earlier 365-day bytecode setting remains in the manifest as dated history because current upstream bytecode v339 was built 2025-09-11 even after a successful fresh update. This lane does not claim bytecode coverage. ClamAV also alerts on encrypted/broken containers and scan limits rather than assuming inaccessible content is clean. These are static source checks, not a guarantee against all malware or runtime behavior.

## Central alerts without issue spam

The draft PR for this workstream is the single central scanner implementation/activation record. Reviewers subscribe to it and to required check notifications. On a finding or scanner failure, retain the redacted artifact and update the one PR/work-request record with the candidate SHA, engine, status, report reason and run URL. Do not create one issue per file, finding, push or retry; do not attach raw scanner logs or SARIF secret snippets. Production incidents with real credentials stay in GitHub's private security reporting channel.

The existing `.github/workflows/workflow-monitor.yml` supports on-demand monitoring of one run via its `workflow_run_id` input and deduplicates `workflow-failure` tracking issues. Its current trigger is manual, not an automatic alert subscription; Linux startup failures also block that monitor. Therefore this scanner change documents the central alert protocol but does not claim unattended alert delivery is active. The central integration owner must wire/verify any automatic failure notification through the existing GitHub workstream, without scanner PR write tokens, new spam loops, provider calls or billing.

[6]: https://blog.clamav.net/2025/10/clamav-150-released.html "Official ClamAV CVD certificate directory and signature verification options"
