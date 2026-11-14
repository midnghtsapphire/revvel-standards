# Integration validation results

Validated on 2026-11-14 UTC in the task's cloud workspace against repository base `7cc46d95eea3a3eeeac9a6af8039a2a7f5d0db23`. This is local/draft-branch evidence, not a live integration acceptance result.

## Passing checks

- **70/70 offline Python tests, zero skipped**: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/audrey-gitar-bridge/tests -v`. This includes the adapted original safety tests, authenticated comment-derived request provenance, exact commands and current-write creator checks, gate behavior, canonical WR inputs, draft-only WR PR creation, suppress-direct-Jules behavior, workflow trust boundaries, fork-review relay, signed current-head/Page-bound drafts, persistent uncertain-write protection, and 13 Slack HTTPS/redirect/notification-isolation regressions. Network transports are mocked; no Page or Slack post is sent.
- **11/11 existing-router tests**: `node --test .github/tests/agent-command-router.test.mjs`; original routes plus positive/negative `audrey`/`gitar-bridge` alias checks.
- **All six new/modified workflow YAMLs pass the exact repository-pinned actionlint 1.7.7**, with shellcheck/pyflakes disabled as in the existing policy. Also passed local actionlint 1.7.12. No queue-property filtering or new lint exclusion is used for the integrated workflows.
- Python source AST, registry JSON, six YAML parses, executable file mode, and CLI help checks pass. New privileged checkout references remain pinned full SHAs with trusted default-branch source and `persist-credentials: false`.
- The unchanged no-scheduled-workflows guard passed **3/3** tests. No cron or scheduled service is added.
- The repository visiting-agent scan exits 0 within this sparse checkout. The integration adds no app files in that scanner's covered directories. This is not a full repository app scan: absent sparse-checkout app files are not audited.

The official actionlint 1.7.7 ARM64 archive was downloaded from its release metadata and verified against its official checksum manifest: `401942f9c24ed71e4fe71b76c7d638f66d8633575c4016efd2977ce7c28317d0`. The root Actions Lint policy and exclusion file are unchanged.

## Existing guard finding—not waived

After locked dependencies were installed with lifecycle scripts disabled and known baseline files were materialized, the related spend/root-junk/fake-closing guard group finished **17 passed / 1 failed**. The failing existing test is `tests/llm-spend-gate-coverage.test.js`: unchanged `opencode.yml` passes a paid LLM credential to `anomalyco/opencode/github@latest` without the required cloud-spend condition.

`git diff --exit-code HEAD -- .github/workflows/opencode.yml` confirmed that file is unchanged from the verified base. The spend/root-junk/visiting-agent guards, their ratchets, and lint policy were not weakened. The earlier missing `fix-semgrep.js`/`fix-zizmor.js`, YAML dependencies, and spend-gate helper findings were sparse-checkout/dependency omissions, not inferred repository deletions; materializing the existing files removed those false findings.

The full root suite and production acceptance are **not** certified green. This PR remains for owner review; no main merge or automatic activation is performed to get around the existing finding.

## Read-only knowledge-sheaf check

`consistency_check --epsilon 1e-9` returned energy 0, consistency true, and no obstructions. The session's individual imprint was unregistered (`known: false`, exit 1). No status feed or worker identity was fabricated to turn that check green. No high-blast runtime launch or production state transition was performed.

## Preservation and live limits

The original 26-test standalone source, workflows and documentation remain unchanged in the dated historical bundle, SHA-256 `68064be2e5387da70ac5e6511c1716e309b381fc5deebda1fa3c18d221ce1298`. The original script's SHA-256 remains `af4d42aacd6d9c4365f2bf259b2ef949eb5af42b046fc7aca58e5c4f71898591`.

No live work dispatch, Gitar task request, Facebook Page post, Slack message, Page token extraction, secret/variable change, production deployment, or own-PR merge occurred. Repository metadata confirms the exact target and branch; secrets/variable metadata access was unavailable and must not be mistaken for credential absence. GitHub branch/PR publication is recorded separately after the service returns its receipt.

The publisher's current-compatible concurrency permits one active and one pending run; displaced pending drafts require inspection/manual requeue. Publication is an at-most-once attempt strategy with persistent pending markers, not an exactly-once multi-provider transaction. Audit is GitHub-visible/current state, not every hidden Gitar operation or historical intermediate edit.
