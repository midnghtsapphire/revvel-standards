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
