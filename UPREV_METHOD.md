# UPREV Method

> **Version:** 1.0.0  
> **Status:** SINGLE SOURCE OF TRUTH (SSOT)  
> **Authority:** MASTER.md §2  
> **Owner:** Audrey Evans (MIDNGHTSAPPHIRE)  

---

## The Six Pillars

UPREV is the execution method for all work in the REVVEL system. Every agent, every WR, every PR follows these six pillars without exception.

| Pillar | Rule | Violation Consequence |
|--------|------|----------------------|
| **One Iteration** | A WR ships completely in one iteration. No "Phase 2" PRs. No "coming soon." If scope is too large, decompose into checkpoint-gated blocks (D011) — but each block ships complete. | PR rejected by wr-lint.mjs |
| **Multiple PRs** | One iteration may produce multiple PRs. Each PR is atomic, reviewable, and mergeable independently. No PR depends on another PR in the same iteration. | PR rejected by dependency-check gate |
| **Max Over Minimum** | Deliver the maximum viable scope, not the minimum. If a feature is requested, deliver the full feature plus adjacent value (docs, tests, monitoring). Never ship a skeleton. | PR rejected by anti-scaffolding enforcer |
| **Deep Research First** | No code is written until research is complete. Research is tiered (A1/A2/B2/B3). Shallow research is rejected. Time and cost are not constraints on research depth. | PR rejected by research-mandate gate |
| **Self-Healing** | Every failure triggers automatic recovery: detect → diagnose → fix → document → prevent. Agents open follow-up PRs in the same iteration. Failures become training modules in learnings.md. | Agent scorecard penalty |
| **Form-Driven, Not Label-Driven** | Routing, scoring, and execution decisions are made from WR form fields, not GitHub labels. Labels are decorative. The form is the contract. | Routing failure, misrouted work |

---

## One Iteration — Detailed Rules

### What "One Iteration" Means

A single WR enters the system. The system produces a complete, shippable result. The WR does not return for "Phase 2."

### When Scope Exceeds One Iteration

Use **Checkpoint-Gated Grids** (D011):

1. Decompose the WR into logical **Blocks**.
2. Each Block is a complete, standalone PR.
3. Block N ships only after Block N-1 is merged and owner approves (`checkpoint-approved` label or `next` comment).
4. No Block contains scaffolding or TODOs for future Blocks.
5. The Grid (all Blocks) is declared in the WR's `## Blocks` section.

### What "Complete" Means

A complete deliverable includes:

- [ ] Code that works (not compiles — works)
- [ ] Tests that pass (new tests for new code; existing tests still pass)
- [ ] Docs that explain (README updates, inline comments, knowledge notes)
- [ ] Monitoring that observes (metrics, alerts, logs where applicable)
- [ ] No scaffolding (no `TODO`, no `FIXME`, no raw `[placeholders]`, no `coming soon`)
- [ ] No orphaned artifacts (no files that aren't referenced or used)

---

## Multiple PRs — Detailed Rules

### PR Atomicity

Each PR in an iteration:
- Touches one coherent concern
- Passes CI independently
- Can be reviewed and merged without waiting for sibling PRs
- Has its own validation evidence

### PR Ordering

If PRs have a logical order (e.g., schema → API → UI), declare it in the WR's `## Blocks` section. The orchestrator respects `depends_on` chains.

### PR Naming

Use conventional commits:
```
feat: add user authentication flow
fix: resolve race condition in checkout
 docs: update API reference for v2 endpoints
```

---

## Max Over Minimum — Detailed Rules

### The Anti-Skeleton Rule

Never ship code that "sets up" a feature. Ship the feature.

| ❌ Skeleton (Rejected) | ✅ Max (Accepted) |
|------------------------|-------------------|
| `// TODO: implement payment processing` | Full Stripe integration with webhooks, retry logic, idempotency keys |
| Empty `README.md` with "Docs coming soon" | Complete README with install, usage, API reference, examples |
| `test_placeholder.py` with `pass` | Comprehensive test suite covering happy path, edge cases, error handling |
| Route file with commented-out endpoints | All endpoints implemented, validated, documented |

### Adjacent Value

When building a feature, also deliver:
- **Docs**: How to use it, why it exists, edge cases
- **Tests**: Unit, integration, and property-based where applicable
- **Monitoring**: Metrics, traces, error alerting
- **Ops**: Deployment notes, rollback plan, runbook entry

---

## Deep Research First — Detailed Rules

### Research Tiers

Every finding is classified:

| Tier | Confidence | Evidence Required | Use in WR |
|------|-----------|-------------------|-----------|
| **A1** | >95% | Peer-reviewed source, reproducible, primary data | Build directly on this |
| **A2** | 80-95% | Industry standard, widely adopted, documented | Build with validation step |
| **B2** | 60-80% | Early adoption, some evidence, emerging | Flag as emerging; require test |
| **B3** | <60% | Anecdotal, theoretical, unproven | Flag as speculative; require proof of concept |

### Research Depth Standard

Before writing code:
1. Search GitHub, GitLab, Gitee (including non-English repos)
2. Check Stack Overflow, Reddit, Discord, Telegram communities
3. Review academic papers, technical blogs, archived forums
4. Test FOSS alternatives, fork existing solutions
5. Document findings with URLs, commit hashes, and version numbers

### The 70/20/10 Rule

- **70%** of research time on primary domain (the direct problem)
- **20%** on adjacent domains (related tools, patterns, anti-patterns)
- **10%** on contrarian search (why this approach might fail)

---

## Self-Healing — Detailed Rules

### The Failure Loop

```
DETECT → DIAGNOSE → FIX → DOCUMENT → PREVENT
   ↑___________________________________________↓
```

1. **Detect**: CI failure, runtime error, user report, agent monitor alert
2. **Diagnose**: Root cause analysis. Not symptoms. The actual cause.
3. **Fix**: Implement the smallest safe fix. Open a follow-up PR in the same iteration if the fix reveals deeper issues.
4. **Document**: Append to `learnings.md` using TM-NNNN format. Include: what was attempted, definitive outcome, root cause, exact fix.
5. **Prevent**: Update automation, add tests, modify prompts so the same failure never recurs.

### Agent Scorecard Impact

Self-healing is scored on the agent scorecard. A failure that is detected, fixed, and prevented in the same iteration scores higher than a failure that requires human intervention.

---

## Form-Driven, Not Label-Driven — Detailed Rules

### The Form Is the Contract

Every WR is a form. Every field in the form is a contractual commitment. Labels are metadata — they do not drive execution.

### Routing Logic

```
work_request.yml field values
         ↓
   deterministic routing table
         ↓
   agent assignment + template selection
```

No LLM is used to read labels and decide routing. The host (`scripts/host.js`) is deterministic (D012).

### Field Validation

- Blank fields are not allowed (D013).
- `wr-field-filler.yml` cascades: rule-based → LLM refinement → guaranteed non-empty fallback.
- Dropdowns and checkboxes are always rule-based (untrusted issue body cannot escape the enum).
- Text fields may use LLM refinement if `default_by: llm` in `config/wr-field-defaults.yml`.

---

## Invariants (Non-Negotiable)

1. Title-only input is valid. The system generates everything else.
2. Max over minimum. Skeletons are rejected.
3. Deep research first. Shallow research is rejected.
4. Clean output: one H1, no scaffolding, no raw placeholders. N/A must state a reason.
5. Self-healing: detect → diagnose → fix → document → prevent.
6. Never silently omit explicitly requested or implied scope. Document any blocker.
7. All changes go through a draft PR. Agents never merge their own PRs.
8. Never delete or rewrite existing work. Comment out with dated notes if retiring.

---

## Glossary

| Term | Definition |
|------|------------|
| **Iteration** | One complete cycle from WR intake to shipped deliverable |
| **Block** | An atomic, complete PR within a checkpoint-gated grid |
| **Grid** | A decomposition of a large WR into ordered Blocks |
| **Scaffolding** | Incomplete code, placeholders, TODOs, or "coming soon" markers |
| **Skeleton** | A minimal structure without functional implementation |

---

*Last updated: 2026-11-09*  
*Next review: When MASTER.md pipeline changes or a pillar is violated*
