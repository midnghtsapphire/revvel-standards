# Jules Auto-Review Routing

Status: **active** — documents existing routing, no new workflow plumbing required.

## TL;DR

When Google Jules creates a task in this repo (either a GitHub issue via the
issue-templates, or a pull request via `BeksOmega/jules-action`), the task is
**already auto-assigned** to one or more code-review processes by existing
workflows. Do not add another reviewer bot unless there is a specific gap
called out below — doing so creates duplicate comments and review noise.

## What happens today

### When Jules opens (or is pointed at) an issue

1. `.github/workflows/openrouter-triage.yml` fires on `issues: [opened, reopened]`.
   - Adds the `openrouter`, `role:orchestrator`, and `triage:new` labels.
   - Lets the OpenRouter orchestrator pick up the work (see
     `docs/OPENROUTER_TRIAGE_PROCESS.md`).
2. The Deep-Research (Jules) issue template
   (`.github/ISSUE_TEMPLATE/deep-research.yml`) — Audrey's single
   user-facing WR template — applies the `jules` label and
   `@google-labs-jules`-mentions Jules in the body so Jules is pulled in
   alongside OpenRouter triage.
3. `.github/workflows/jules-invoke.yml` fires on `issues: [opened, reopened]`
   and, when the `jules` label is present, invokes Jules automatically via
   `BeksOmega/jules-action@v1.0.0` — so every new WR is auto-assigned to
   Jules end-to-end, not just label-tagged.
4. `.github/workflows/priority-router.yml` applies Eisenhower/priority labels
   for downstream routing.

### When Jules opens a pull request

Every PR opened in the repo — including Jules-authored PRs — fans out to the
following reviewers automatically (all triggered by
`pull_request: [opened, synchronize, reopened, ready_for_review]`):

| Workflow | Reviewer | What it does |
| --- | --- | --- |
| `.github/workflows/jules-pr-reviewer.yml` | Google Jules | Posts a review comment and a `jules/review` commit status. |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter model (`x-ai/grok-4.1-fast` by default) | Posts/updates a single summary comment on the diff. |
| `.github/workflows/openrouter-triage.yml` | OpenRouter orchestrator | Applies triage labels and routes for human review. |
| `.github/workflows/recurse-ml.yml` | Recurse ML | Recursive lint/code-quality feedback. |
| `.github/workflows/jules-feedback.yml` | Jules (back-channel) | Propagates human PR reviews back to the Jules session. |

If Jules is the PR author, the Jules PR Reviewer will skip the self-review by
design (it is effectively idempotent), but the OpenRouter-based reviewers
still run, so Jules-authored PRs are never left un-reviewed.

## When to add a new reviewer

Only add another reviewer workflow if all of the following are true:

1. The gap cannot be closed by tuning an existing workflow
   (prompt, model, label filter, `extra_instructions`, etc.).
2. The new reviewer produces **non-duplicate** signal (e.g., a security
   scanner, a license scanner, a performance analyzer — not a third generic
   LLM summary comment).
3. It is documented in this file and in `README.md`.

## Secrets required for the above

- `JULES_API_KEY` — drives `jules-pr-reviewer.yml`, `jules-invoke.yml`,
  `jules-feedback.yml`.
- `OPENROUTER_API_KEY` — drives `ai-pr-review-openrouter.yml`,
  `openrouter-triage.yml`, `openrouter-coder.yml`.

If either secret is unset the corresponding workflow exits with a warning
instead of failing the run, so the routing degrades gracefully.

## Related docs

- `docs/OPENROUTER_AGENT.md`
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md`
- `docs/OPENROUTER_TRIAGE_PROCESS.md`
- `docs/ISSUE_AUTOMATION_FLOW.md`
- `docs/AGENTS.md`
