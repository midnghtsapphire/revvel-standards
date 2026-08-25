# WR: [WR] what the heck happened with my request? This wastes a lot of money having to do these over and over again. How can we prevent this from happeneing in the future?

**Issue:** #17946  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Scope

<!-- Detailed scope: what's in, what's out, boundaries with other WRs. -->

## Approach

<!-- Proposed approach / design sketch. Alternatives considered. -->

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Risks & Mitigations

<!-- Known risks, fragile files touched, rollback plan. -->

## Competitor & Pricing Intelligence

<!--
For Competitor and GitHub Star Intelligence WRs, the competitor/pricing table
must list actual prices (e.g. "$99-299/month"), not vague labels like "Paid tiers".
If a competitor's price is unknown, write:
"Pricing data pending — competitive benchmark research required."
Do not ship incomplete competitive intelligence. This rule is kept in sync with
scripts/research-engine.js by tests/research-engine.test.js.
-->

## Learnings — What & Why

The WR title asks the real question, so this section answers it directly
rather than deferring: **$566.17 of Copilot overage in 21 days, and why it was
invisible until it wasn't.**

### What happened

Automatic Copilot code review ran on **every** pull request. In the billing
window this repository opened **674 PRs** — against only **444
human-meaningful commits in an entire month** — so the reviews were almost
entirely of machine-generated changes that no person requested or read. That
one feature is **$421.28 of the $566.17**, having consumed 42,128 credits
beyond the 20,000-credit allowance.

A second, separate leak: `ready-for-review.yml` posted an "Invocation
commands" block containing a literal `@copilot` mention on every PR that
became ready for review. An @-mention of the Copilot app **starts a paid
coding-agent session**. Every other agent in that same block — `roo`,
`antigravity`, `oaudrey`, `coder` — is written as plain text with no `@`
precisely so it does not fire. Copilot was the lone exception. Fixed in PR #17942; the
issue-side equivalent was #17864.

Model split of the overage: Code Review model **$421.28**, Grok 4.5 **$90.37**,
the Claude family **$37.91**, GPT-5.x **$16.52**. Grok alone consumed **8,330
of the 20,000 included credits** — the largest single share of the allowance —
while producing zero attributable commits.

### Why nobody noticed

The 20,000 included credits masked it completely. Every review drew down
prepaid credit, so the billing page correctly showed **$0 owed** for weeks. A
prepaid allowance running down and a feature that is switched off look
**identical** from that screen. The spending limit was then raised precisely
*because* no charges were appearing — a reasonable inference from the
available evidence, and exactly backwards.

The deeper condition: **91% of all commits in the window (5,071 of 5,515) were
bots writing status files back to the repository** — 3,307 of them a single
`chore(controller): persist semantic fleet state`. That volume is the
multiplier. Per-PR billing is only dangerous when something else is
manufacturing PRs.

### How to prevent it

1. **Never `@`-mention a billable app from a workflow.** The `@` is the
   trigger. Name the agent as plain text and let a human decide.
2. **Cap spend at the vendor, not just in the repo.** `REVVEL_LLM_ALLOW_CLOUD`
   (#17858) governs *this repo's* calls; it cannot stop a platform feature like
   Copilot code review. That needs a spending limit set in the vendor UI.
3. **Treat "no charges yet" as unknown, not as zero.** Included credits hide
   consumption. Check credits consumed, not dollars owed.
4. **Fix PR volume before optimising per-PR cost.** One reviewer on 674
   machine-generated PRs still costs more than five reviewers on 40 real ones.
5. **One reviewer, not five.** Copilot, Octopus, cubic, Devin and the
   OpenRouter lane all reviewed the same diffs. That is four redundant
   opinions billed in parallel.

### Why it matters beyond the money

The failure mode was not overspending — it was **two automations talking to
each other with a meter attached, and no human in either loop**. Every
individual piece was defensible. The composition was not. Any future lane that
bills per event needs a stated answer to "what stops this if it runs 674
times?" before it ships, not after.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
