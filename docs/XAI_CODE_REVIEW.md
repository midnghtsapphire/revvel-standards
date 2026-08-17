# xAI Code Review Marketplace Action

Integrates
[`tarmojussila/xai-code-review`](https://github.com/tarmojussila/xai-code-review)
([Marketplace](https://github.com/marketplace/actions/xai-code-review)) into
the Revvel CI/CD template set so every repo can add Grok-powered PR review
without reinventing the workflow.

| Field | Value |
| --- | --- |
| Marketplace | [xAI Code Review](https://github.com/marketplace/actions/xai-code-review) |
| Upstream | [`tarmojussila/xai-code-review`](https://github.com/tarmojussila/xai-code-review) |
| Latest pin | `v0.1.0` → commit `0a0ec8e6ae59ed29819ac73ba1b8a983f40ca255` |
| GitHub stars | 5 (captured 2026-08-08) |
| License | MIT |
| Secret | `XAI_API_KEY` (Vault `revvel/shared/llm/xai`; alias `GROK_API_KEY` elsewhere) |
| Template | [`templates/cicd/xai-code-review.yml`](../templates/cicd/xai-code-review.yml) |
| Active here? | ✅ `.github/workflows/xai-code-review.yml` (soft-skip + `continue-on-error`) |
| Monetization / fit | Free Grok review lane on the already-paid xAI key used by MOTU BNAT; reduces human review time on automation PRs |

## What it does

On non-draft PR open/sync (and manual `workflow_dispatch`):

1. Checks that `XAI_API_KEY` is present. Missing key → `::warning::` and skip
   (job stays green).
2. Sends the PR diff to an xAI Grok model (`grok-3` by default).
3. Posts a single review comment under the configured reviewer name.

It is **advisory**. `continue-on-error: true` means a vendor outage never
blocks merge. Primary review signal remains BITO + Coderabbit — see
[`CODE_REVIEW_WORKFLOW_STATUS.md`](./CODE_REVIEW_WORKFLOW_STATUS.md).

## One-time setup (click path)

1. Open the target repo on GitHub.
2. Click **Settings**.
3. In the left sidebar click **Secrets and variables → Actions**.
4. Click **New repository secret**.
5. Name: `XAI_API_KEY`
6. Value: paste the key from the [xAI console](https://console.x.ai/).
7. Click **Add secret**.

Optional (Variables tab, same Settings page) — override without editing YAML:

| Variable | Example | Purpose |
| --- | --- | --- |
| `XAI_MODEL` | `grok-3` | Model slug |
| `XAI_REVIEWER_NAME` | `xAI Code Review` | Comment header |
| `XAI_SYSTEM_PROMPT` | (custom text) | Review focus / tone |

Success looks like: next non-draft PR gets a comment titled with the reviewer
name, or the Actions run shows the yellow warning “XAI_API_KEY is not set”
and still finishes green.

## Rolling into another Revvel repo

1. Copy `templates/cicd/xai-code-review.yml` →
   `.github/workflows/xai-code-review.yml`.
2. Prefer pinning the action to the full commit SHA used here
   (`0a0ec8e6ae59ed29819ac73ba1b8a983f40ca255  # v0.1.0`) per
   CLAUDE.md gotcha #8.
3. Provision `XAI_API_KEY` (see click path above, or
   `scripts/provision-repo-secrets.sh` if your vault wiring is ready).
4. Optional: add `[skip-review]` to a PR title to bypass this lane (and other
   reviewers that honor the same marker).

## Bypass / noise control

- Draft PRs are skipped.
- PR titles containing `[skip-review]` are skipped.
- Missing secret soft-skips.
- Not listed in the `pr-lifecycle` check-state allowlist — it never drives
  ready-to-merge labels.

## See also

- [`CODE_REVIEW_WORKFLOW_STATUS.md`](./CODE_REVIEW_WORKFLOW_STATUS.md) — active vs disabled review lanes
- [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) — sibling OpenRouter review actions
- [`standards/BNAT_SHEAF_STANDARD.md`](../standards/BNAT_SHEAF_STANDARD.md) — MOTU/Grok key ownership
- [`.env.example`](../.env.example) — `XAI_API_KEY` / `GROK_API_KEY` placeholders
