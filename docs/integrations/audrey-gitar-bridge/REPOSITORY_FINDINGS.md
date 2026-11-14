# Repository integration findings

Verified against repository base `7cc46d95eea3a3eeeac9a6af8039a2a7f5d0db23` on 2026-11-14 UTC. The owner confirmed `midnghtsapphire/revvel-standards` as governance and execution repository.

The authoritative runtime map is `START_HERE_CALL_CHAIN.md`. It names `wr-pr-creation.yml` as the WR-document/skeleton PR step and `openrouter-coder.yml` as the later implementation step. The actual selected WR workflow is manual-triggered and accepts `workflow_dispatch.inputs.issue_number` as a string; original standalone inputs `work_request_number` and `requested_by` do not match. A dispatch acceptance is not a verified created PR, completed code, or approval to bypass existing cloud/coding-agent and viability switches.

The existing saved-reply intake is `.github/workflows/agent-command-window.yml`, `.github/scripts/agent-command-router.mjs`, and `.github/agent-router.json`. Its request protocol is `repository_dispatch: agent_requested` with a comment-derived request ID, selected agent, repository, issue/PR number and kind, and request author. Its status protocol is `agent_status`. `.github/workflows/agent-request-delivery.yml` normally forwards these requests to an external central gateway. The Gitar bridge must have a single local route and must not be delivered through both adapters.

The current WR workflow creates non-draft PRs and can directly invoke Jules. Bridge-originated launches therefore need narrowly scoped optional draft-only and suppress-direct-Jules inputs before activation. Original caller behavior is preserved. No existing reset, approval, delivery, cloud-spend, or coding-agent switches are changed by this integration.

The existing `.github/workflows/ready-for-review.yml` can promote same-repository draft PRs on later synchronization or reopening. Publish the final intended branch before opening the draft and do not assume a draft disables all existing CI/lifecycle applications. Inspected deployment and public-mirror workflows are primarily main-branch/path scoped. No deployment or social-media workflow is dispatched by this integration.

The repository's Actions Lint currently pins actionlint 1.7.7. It cannot validate GitHub's newly documented `queue: max`, which is also not recognized by locally checked actionlint 1.7.12. The integrated publisher uses the existing-compatible single-pending-run concurrency model rather than weakening the lint gate. The original standalone bundle retains the newer queue setting as historical work. GitHub queue reference: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency .

The repository's read-only sheaf consistency check returned energy 0, consistency true, and no obstructions. The session identity was not registered in the existing BIOME feed, so its individual imprint returned known false and exit 1. No worker/status data was fabricated to change that result, and no high-blast runtime launch or production transition is performed.

Repository secrets/variables metadata was not readable through the current GitHub connection. Do not infer absence from an access failure. Page identity/token/permissions, protected-environment reviewer setup, Gitar bot authorization, optional Slack destination, and runtime switch state remain connected-setup checks.

Original source research and its official Facebook/Gitar/GitHub/Slack URLs are preserved under `history/2026-11-14/integration-research.zip`; the original tested executable/documentation bundle is preserved separately with its SHA-256 manifest. This integration does not claim capture of every hidden Gitar operation or lossless history of intermediate edits/deleted review objects.
