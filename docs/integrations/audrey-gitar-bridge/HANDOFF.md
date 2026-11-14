# Owner handoff

## Delivered code and destination

The owner-confirmed repository is `midnghtsapphire/revvel-standards`. Branch: `feat/audrey-gitar-page-bridge-20261114`, prepared as a draft PR into `main`; the agent does not merge. Executable and tests are in `scripts/audrey-gitar-bridge/`. This guide and the original source/research archives are under `docs/integrations/audrey-gitar-bridge/`.

The existing router owns `/audrey run` and `/audrey finish <Gitar-comment-id>` through the new `gitar-bridge` agent entry. Its local adapter validates the actual source comment and author, enforces current write permission, preserves other gateway routes, and records delivery/blocked status without pretending acceptance is completed work.

On issues, the selected WR engine accepts `issue_number`, `draft_only=true`, and `suppress_direct_jules=true`; original callers retain their prior defaults. This creates a WR document/skeleton, not product implementation. Existing viability/approval/coder routing remains authoritative. Gitar work is requested on the approved PR with the PR-side saved reply or an eligible separately authorized automatic intake. An issue dispatch does not prove that Gitar ran, especially where token-created PR events are suppressed.

GitHub-visible Gitar activity is audited and mirrored to recognized same-repository WR links. Current-head completed summaries produce signed drafts for the exact confirmed numeric audreybuildsai Page ID. Publishing requires the unchanged source/digest and actual protected-environment approval. Slack is optional outbound notifications, with HTTPS/redirect and no-replay checks.

## Verified local acceptance

70 offline Python tests, 11 router tests, six workflows under exact pinned actionlint 1.7.7, and the no-schedules guard pass. See `TEST_RESULTS.md` for exact evidence and limits. The related guard group has one unchanged OpenCode paid-credential gating failure; root/production CI is not certified green. No guard or ratchet was changed to conceal it.

## Connection and activation checks

1. Audrey reviews the draft PR and the existing CI finding; no agent merge or draft promotion is requested. Existing automation can run CI/lifecycle activity on a PR, and later synchronization/reopening can promote a draft under the repository's current workflow.
2. Confirm Gitar is installed for this repository, verify its exact GitHub bot identity, and allow the actual workflow-authored bot in Gitar settings. Bridge flags do not control independently installed Gitar automatic behavior.
3. Authorize the intended Meta app/Page through official Facebook Login, verify the real audreybuildsai numeric ID, required permissions/task, app roles/access/review requirements, and supported Graph version. Never paste the Page token or signing key into chat, issues, Slack, or Git.
4. Configure `facebook-publication` with actual required reviewers and trusted-branch/bypass protections before storing/using the Page token there. Review the exact message, numeric Page destination, PR head, source comment, and payload digest before each public publication.
5. Configure repository/Environment secrets and Variables from `README.md`; metadata access was unavailable in this session, so actual presence/state remains unverified. Preserve current quiet-mode, cloud-spend, coding-agent and viability/launch policy. Neither this handoff nor an issue named `exit-quiet-mode` changes settings.
6. Enable only the owner-approved bridge paths after the connected checks. `AUTO_START`, automatic publisher queueing, and live posting are separate opt-ins. A protected environment's name by itself is not human approval.
7. If Slack notifications are wanted, choose the channel and authorize its channel-bound incoming webhook. The attached chat connector is not a deployable webhook/token source.
8. Perform a controlled real WR/PR pilot after authorization. Inspect request status, Gitar's actual response, audit mirrors, current-head signed summary, and protected publication review. Do not record deployment or completion from a skipped/accepted workflow.

## Recovery and preservation

The publisher uses the current repository-compatible one-pending queue; signed drafts displaced from that queue remain in PR comments and can be inspected/manually requeued. Uncertain Facebook writes stay blocked by a persistent pending marker until the owner verifies the real Page and exact payload. Do not delete markers, bypass review with a direct live CLI, or blindly retry.

No existing root file, code block, guard, global agent pipeline, server or app is replaced. The original standalone bundle and source research are preserved with hashes. Source artifacts, tests, documentation, state and provenance are included in the same reviewable branch; no credentials or internal session instructions are archived.
