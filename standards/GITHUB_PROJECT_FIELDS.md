# GitHub Project Custom Fields — Revvel Canonical Catalog

**Status:** ACTIVE  
**Updated:** 2026-08-05  
**Owner:** midnghtsapphire  
**Related:** `config/labels-allowlist.yml`, `standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md`, `standards/FORMAL_VERIFY_AUTO_WR.md`

## Why fields beat labels

Labels are flat, untyped, and explode (this repo had **301** labels with near-duplicates like `priority:p0` vs `priority-p0`).  
**Project custom fields** are typed, filterable, graphable, and automation-friendly via GraphQL + Actions.

**Rule:** put *state and metrics* on Project fields. Keep labels to *routing* only (allowlist ≤ 80).

> Note: the GitHub MCP token for this session cannot list Projects V2 (403).  
> Apply the field catalog below in the UI or via a PAT with `project` scope.  
> Track as Project number once created (suggested title: **Revvel Command**).

---

## Recommended Project: Revvel Command

Link all work repos (at minimum `revvel-standards` + product repos under `products/`).

### Built-in fields to keep

| Field | Use |
| --- | --- |
| Title | Issue/PR title |
| Assignees | Human + primary agent bot if any |
| Status | Board column (see Status options) |
| Labels | Allowlisted routing only |
| Linked pull requests | Auto |
| Reviewers | Human CODEOWNERS |

### Custom fields (create these)

| Field name | Type | Options / range | Purpose |
| --- | --- | --- | --- |
| **Priority** | single-select | P0, P1, P2, P3 | Canonical priority (sync from `priority:pN` label) |
| **Work Kind** | single-select | WR, Bug, Feature, Research, Automation, Security, Content, Infra, Revenue | Typed kind (replaces most unprefixed labels) |
| **Pipeline Stage** | single-select | Triage, Spec, Research, Build, Formal Verify, Human Review, Ship, Done, Parked | Stage machine — not labels |
| **Agent** | single-select | OpenRouter, Copilot, Codex, Devin, Jules, Human, Non-LLM Specialist | Who is executing |
| **Privilege Tier** | single-select | Intern, Associate, Senior, Principal, Emergency | From scorecard (see reward system) |
| **Formal Verdict** | single-select | pass, fail, needs_reaudit, structural_conflict, duplicate_risk, unscored | Dual-path XOR verifier |
| **Agreement BPS** | number | 0–10000 | Formal path agreement in basis points |
| **Risk Score** | number | 0–10000 | Formal risk |
| **Loyalty Score** | number | 0–100 | Rolling loyalty metric |
| **BNAT Score** | number | 0–100 | BNAT invention quality |
| **Speed Score** | number | 0–100 | Time-to-draft-PR vs SLA |
| **Canonical Score** | number | 0–100 | Standards adherence |
| **Feature Adoption** | number | 0–100 | Use of Models, Projects, badges, Actions |
| **Breakthrough** | single-select | none, minor, major, paradigm | Real breakthroughs only |
| **Automation Surface** | single-select | actions, n8n, make, zapier, gumloop, openrouter, other, none | Prefer non-label wiring |
| **Revenue Link** | text | URL or Polar/product id | Trace to $ |
| **WR ID** | text | WR-#### or path | Link to `wr/` file |
| **Due** | date | — | SLA |
| **Human Gate** | single-select | required, satisfied, waived | Never auto-waive |
| **Outside Work Eligible** | single-select | no, candidate, approved | Emergency external pool |

### Status column options (board)

1. Backlog  
2. Ready  
3. In Progress  
4. Formal Check  
5. Human Review  ← hard stop  
6. Blocked  
7. Done  
8. Parked  

---

## Issue fields (org-level preview, May 2026)

GitHub now supports **org Issue Fields** (single-select, text, number, date) that appear on every issue.  
When/if the account moves to an org with Issue Fields enabled, mirror:

- Priority  
- Work Kind  
- Human Gate  

…as org fields so they work *even outside* Projects. Until then, Project fields + allowlisted labels are the SSOT.

---

## Automation wiring (prefer workflows)

| Event | Action |
| --- | --- |
| Issue opened with `wr` label | Add to Revvel Command; set Pipeline Stage=Triage; Human Gate=required |
| Formal verifier run | Set Formal Verdict + Agreement BPS + Risk Score; if fail/reaudit → open auto-WR + PR draft |
| Agent scorecard cron | Update Loyalty/BNAT/Speed/Canonical/Feature Adoption; set Privilege Tier |
| Label not in allowlist applied | Comment + remove (or map via aliases) |
| `human-approved` | Only accept if actor is human CODEOWNER |

### GraphQL sketch (set field)

```graphql
mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
  updateProjectV2ItemFieldValue(input:{
    projectId:$projectId, itemId:$itemId, fieldId:$fieldId,
    value:{ singleSelectOptionId:$optionId }
  }) { projectV2Item { id } }
}
```

Use `gh api graphql` in Actions with a fine-grained PAT that has **Projects read/write**.

---

## What NOT to put in fields

- Secrets or tokens  
- Full agent transcripts (store under `docs/agents/**` or `wr/memory/`)  
- Free-text essays — use issue body  

---

## Migration from 301 labels

1. Land `config/labels-allowlist.yml` + checker workflow.  
2. Create Project fields above.  
3. Run one-time script mapping aliases → canonical labels.  
4. Archive legacy labels (do not delete for 90 days — COMMENT-DONT-DELETE spirit).  
5. Prefer Project views for triage over label soup.
