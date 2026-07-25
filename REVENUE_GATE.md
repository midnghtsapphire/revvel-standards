# REVENUE GATE — Mandatory Pre-Build Checklist

> **PRIME DIRECTIVE:** $10k/month → $10M in 3 years. Every build must move revenue.

Before any work request (WR) enters the coder pipeline, the owner MUST answer the questions below and apply the `spec-approved` label. No label, no build.

---

## The One Question That Matters

**What is the shortest path from this work to the first $1?**

If you cannot answer in one sentence with a concrete channel (Polar tier, Stripe checkout, affiliate link, paid API call, sponsored placement), the WR does not pass the gate. Archive or defer.

---

## FAST-TRACK criteria (auto-approve candidates)

A WR is a fast-track candidate when **all** of these are true:

- [ ] Ships a revenue surface (checkout, tier, paywall, invoice) or unblocks one that is already live
- [ ] Time-to-first-dollar ≤ 7 days from merge
- [ ] Uses an existing distribution channel (existing repo, existing domain, existing audience) — no cold-start
- [ ] No new secrets required, or secrets are already provisioned
- [ ] Estimated build ≤ 2 hours of coder time

Fast-track WRs may be labeled `spec-approved` immediately after research completes.

---

## AUTO-ARCHIVE criteria

A WR is auto-archived (no build, close issue) when **any** of these are true:

- [ ] No plausible path to revenue within 90 days
- [ ] Duplicates an existing project that has not yet earned $1
- [ ] Requires manual owner action that has been open > 14 days (secrets, phone verification, domain purchase)
- [ ] Depends on a project currently in `status: paused` or `status: archived` in `state.json`
- [ ] Cold-start audience with no existing distribution and no paid acquisition budget

---

## Revenue Stream Reference Table

| Stream | Time-to-$1 | Setup cost | Owner action required |
|---|---|---|---|
| Polar.sh tier on existing repo | 1–3 days | $0 | Configure tier, link in README |
| GitHub Sponsors | 3–7 days | $0 | Already enabled |
| Stripe Checkout on live domain | 1–2 days | $0 | Stripe keys in secrets |
| Affiliate link (Amazon, etc.) | 7–14 days | $0 | Apply, add link |
| Paid API (RapidAPI, direct) | 14–30 days | $0–$50 | List, price, docs |
| SaaS subscription (new product) | 30–90 days | $0–$500 | Full product build |
| Sponsored content / newsletter | 30–60 days | $0 | Audience threshold |

Prioritize top-of-table first. Any WR targeting the bottom half must justify why the top half is exhausted.

---

## How the Gate Is Enforced

The pipeline is **demand-driven** and **human-gated**:

1. Owner opens a WR issue (or research-engine surfaces one).
2. `research-engine` runs and posts findings, then emits `wr:research-complete`.
3. **Spec Approval Gate (this document)** — owner reviews against the criteria above.
4. Owner applies `spec-approved` or `wr:code` label.
5. `.github/workflows/openrouter-coder.yml` fires on the label and builds.

**The coder does NOT fire on bot comments, timers, or research completion alone.** The removal of the `issue_comment` trigger from `openrouter-coder.yml` in the activation sprint is what enforces this. See that workflow for the exact trigger set.

---

## Enforcement Checks

- `state.json` is regenerated from `dashboard-data.json` by `scripts/populate-state.js` and can never silently return to `{}` (see `tests/populate-state.test.js`).
- `node scripts/populate-state.js --check` fails CI if state is stale.
- Any WR PR that would ship without a revenue path should be closed with a comment linking to this file.

---

## Phase Targets (for reference during triage)

- **Phase 1 (Month 1–6):** $10k/month — focus on Polar tiers, existing-repo monetization, quick affiliate wins
- **Phase 2 (Month 6–18):** $30k/month — productize OSINT tools, paid API tiers
- **Phase 3 (Month 18–30):** $100k/month — SaaS subscriptions, sponsored distribution
- **Phase 4 (Month 30–36):** $10M total — acquisition-ready revenue mix

When in doubt, ship the thing that moves the current phase target.
