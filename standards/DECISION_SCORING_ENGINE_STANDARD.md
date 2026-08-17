# Decision Scoring Engine Standard

## Purpose

Any Revvel workflow that ranks, filters, routes, or qualifies records must use a status-plus-score decision model instead of one-off boolean flags. The goal is reusable decision infrastructure that can support life-insurance contactability, SEO opportunity, product viability, research confidence, client work triage, and enterprise approval gates.

## Merge-Issue Categorization

| Category | Definition | Required Action |
|---|---|---|
| Product compliance | App or README claims a compliance behavior exists. | Implement the behavior or narrow the claim before merge. |
| Decision correctness | A scorer, eligibility check, or router can misclassify records. | Define status, score, factors, thresholds, explanations, and audit events. |
| Async workflow safety | A decision function emits logs, routes reviews, writes records, or calls services. | Treat it as async and never call it directly inside synchronous `Array.prototype.filter`. |
| Enterprise governance | The decision affects clients, company projects, pricing, compliance, or database design. | Route through the scoring model registry and approval team gates. |

## Required Model Shape

Every scoring model must define:

- **Status:** workflow gate such as `eligible`, `manual_review`, `blocked`, or `suppressed`.
- **Score:** numeric confidence from `0` to `100`.
- **Factors:** weighted inputs with `name`, `weight`, `rawValue`, `normalizedValue`, and `reason`.
- **Threshold bands:** named ranges that map score outcomes to statuses.
- **Explanation trail:** human-readable reason strings for every major score movement.
- **Audit event:** immutable record of inputs, model version, output, and actor.
- **Manual-review gate:** route ambiguous or regulated records to review instead of silently including them.

## Status and Score Work Together

Do not choose between status and score:

- Status controls workflow gates and prevents unsafe actions.
- Score supports tuning, reporting, confidence comparisons, and revenue prioritization.
- Explanation trails make the decision reviewable by humans and agent fleets.

## Async Eligibility Pattern

Use `for...of` or `Promise.all` plus a second filtering pass when eligibility writes logs, creates review records, calls APIs, or mutates state.

```ts
type EligibilityDecision<T> = {
  record: T;
  status: 'eligible' | 'manual_review' | 'blocked';
  score: number;
  reasons: string[];
};

async function evaluateLeadContactability(lead: Lead): Promise<EligibilityDecision<Lead>> {
  const decision = await scoreContactability(lead);
  await writeDecisionAudit(decision);

  if (decision.status === 'manual_review') {
    await routeToManualReview(decision);
  }

  return decision;
}

const decisions = await Promise.all(leads.map(evaluateLeadContactability));
const eligibleLeads = decisions
  .filter((decision) => decision.status === 'eligible')
  .map((decision) => decision.record);
```

## Multi-Tenant Database Boundary

Scoring data must preserve separation between Audrey-owned enterprise projects and client work.

Minimum lookup-table shape:

| Table | Purpose |
|---|---|
| `organizations` | Company, client, or partner boundary. |
| `projects` | Workstream under an organization. |
| `score_models` | Versioned scoring model metadata. |
| `score_factors` | Weighted factor registry per model version. |
| `score_thresholds` | Score bands mapped to statuses. |
| `score_events` | Immutable decision audit trail. |
| `manual_reviews` | Human or agent-team approval queue. |
| `rate_cards` | B2B/B2C/client pricing and work-rate lookup tables. |

Each row that belongs to a client or company project must carry `organization_id`, `project_id`, and `data_domain` so reports, exports, and automations cannot mix client work with Revvel-owned products.

## Approval Team Gate

Database or scoring-model changes that affect regulated outreach, pricing, client separation, or revenue attribution require approval records from these perspectives:

1. **Data architecture:** schema boundaries, lookup tables, tenancy, migrations.
2. **Compliance:** TCPA/GDPR/CCPA/contractual handling.
3. **Revenue owner:** score meaning, rate-card impact, and monetization reporting.
4. **Security:** access control, audit trail, secrets, and data isolation.
5. **Product owner:** user-facing workflow and manual-review thresholds.

Agents may draft recommendations, but the model version must store who approved each gate and what changed.
