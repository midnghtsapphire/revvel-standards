# AGENT_STACK_SETUP

> Standard for bootstrapping an AI agent stack that ships WR (Work Request) artifacts.

## Purpose

Define the minimum setup required for an AI agent (or team of agents) to reliably produce, review, and deliver artifacts against a Work Request (WR). This standard pairs with `DELIVERY_MATRIX.md`, which specifies *what* gets delivered and *where*.

## Scope

Applies to any automated or semi-automated agent workflow that:

- Consumes issues, tickets, or WRs as input.
- Produces code, docs, configs, or other artifacts as output.
- Commits or proposes changes to a repository.

## Required Components

1. **Identity**
   - Agent name (e.g., `claude`, `openhands`, `copilot`).
   - Operator/owner contact.
   - Commit author identity (name + email) distinct from humans.

2. **Source of Truth**
   - Canonical repository URL.
   - Default branch.
   - Branching convention (e.g., `agent/<issue-id>-<slug>`).

3. **Inputs**
   - WR/issue template with: title, summary, files, why, who/when.
   - Required labels or front-matter for routing.

4. **Capabilities**
   - Read repo tree.
   - Read/write files on a working branch.
   - Open pull requests (or direct commits where policy allows).
   - Run local checks (lint, tests) when available.

5. **Guardrails**
   - Paths allow-list / deny-list.
   - Max files changed per WR.
   - Required reviewers for merge.
   - Secret scanning before commit.

6. **Observability**
   - Structured commit messages (Conventional Commits).
   - WR id referenced in commit trailer or message.
   - Run logs retained per delivery.

## Setup Checklist

- [ ] Agent identity configured (name, email, token scope).
- [ ] Repo cloned with correct default branch.
- [ ] WR template present in `.github/ISSUE_TEMPLATE/` or equivalent.
- [ ] `standards/DELIVERY_MATRIX.md` reviewed.
- [ ] Guardrails (allow-list, max changes) loaded.
- [ ] CI hooks verified to run on agent-authored PRs.
- [ ] Escalation path documented for failures.

## Minimal Runtime Contract

An agent conforming to this standard MUST:

1. Accept a WR as the unit of work.
2. Produce artifacts only for files listed (or allowed by policy).
3. Return a machine-readable delivery payload (see `DELIVERY_MATRIX.md`).
4. Never push to the default branch directly unless explicitly permitted.
5. Fail closed: on any ambiguity, produce no changes and report back.

## Related

- `standards/DELIVERY_MATRIX.md` — what/where of delivery.
