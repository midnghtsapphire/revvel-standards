# R&D Research Fleet - Search Evaluation Standard

*How to measure whether a new search prompt / routing change is actually better
than the previous one - offline, repeatable, and without paid APIs.*

---

## Why this exists

Search prompt and routing changes (new `MASTER_PROMPT`, new `ROUTING_PROFILES`,
new deep-search/Perplexity wiring) can pass CI and still make search **worse**:
fewer citations, duplicated sources, stale results, off-topic answers.

**Green CI is not proof of search quality.** CI proves the code runs. This
standard defines how to prove the search itself improved before a prompt/routing
change is merged.

It complements `standards/QUALITY_STANDARDS.md` (single-run Research Quality
Score) by adding a **baseline vs candidate** comparison.

---

## The model: baseline vs candidate

- **Baseline** = the current production search prompt / routing profile (`v1`).
- **Candidate** = the proposed change (the new search prompt / routing, `v2`).

You capture one run of each over the same fixture query set, then compare them
with the offline scorer. The scorer never calls a live API - it reads two saved
run JSON files.

```text
fixtures/queries.json  ┐
baseline run JSON      ├─►  eval/search-eval.js  ─►  report.json + report.md + decision
candidate run JSON     ┘
```

---

## Metrics measured

| Metric | Meaning | Direction |
| --- | --- | --- |
| **Rubric mean** | Fraction of each query's `expected_qualities` present in the answer | higher better |
| **Error rate** | Share of queries that errored or returned nothing | lower better |
| **Citation coverage** | Share of queries that met their `min_citations` | higher better |
| **Domain diversity** | Unique citation domains / total citations | higher better |
| **Duplicate rate** | Duplicate citations / total citations | lower better |
| **Freshness satisfaction** | Of freshness-required queries, share with recent sources | higher better |
| **Mean latency (ms)** | Mean `latency_ms` if runs provide it | lower better |
| **Total cost (USD)** | Sum of `cost_usd` if runs provide it | lower better |
| **Downstream usefulness** | Free-text `usefulness_note` per query, surfaced in the report | qualitative |

Latency, cost, and tokens are **optional** - they are scored only when the run
files provide them, so offline fixture runs work without timing or billing data.

---

## Rubric design (not brittle)

Fixtures score on **`expected_qualities`** - case-insensitive keyword/phrase
presence in the answer - **not** exact answers. A query passes a quality if the
answer mentions it. This rewards correct, complete answers without locking the
test to one phrasing or one model's wording.

Fixture categories (see `eval/fixtures/queries.json`):

- `repo_automation` - repo automation issue lookup
- `insurance_lead_api` - insurance lead API research
- `workflow_syntax` - workflow syntax issue
- `code_review_routing` - code-review / routing task
- `product_market_research` - product / market research
- `docs_bom_discovery` - docs / BOM discovery

---

## Decision rubric

The comparator emits exactly one decision:

| Decision | When |
| --- | --- |
| `keep_candidate` | Candidate matches or beats baseline on rubric, errors, and citations, with no duplicate-rate spike. Safe to ship the new prompt. |
| `tune_candidate` | No hard regression, but the candidate is not a clean win (small rubric dip, extra duplicates, etc.). Iterate on the prompt/routing and re-run. |
| `rollback_candidate` | A hard regression: rubric drop, error-rate rise, citation-coverage drop, or freshness drop beyond threshold. Keep the previous prompt. |
| `needs_human_review` | Not enough signal (too few queries) or ambiguous data. A person decides. |

Thresholds live in one place - `THRESHOLDS` in `eval/search-eval.js` - so the
rubric stays transparent:

- rubric regression `<= -0.10` -> rollback
- error-rate rise `>= +0.10` -> rollback
- citation-coverage drop `<= -0.15` -> rollback
- freshness drop `<= -0.20` -> rollback
- fewer than `4` queries per run -> needs_human_review

---

## How to run (offline / default)

```bash
cd products/rnd-research-fleet

# Compare the two saved runs against the fixture rubric:
node eval/search-eval.js \
  --fixtures eval/fixtures/queries.json \
  --baseline eval/fixtures/baseline.example.json \
  --candidate eval/fixtures/candidate.example.json \
  --out /tmp/search-eval-report.json \
  --md  /tmp/search-eval-report.md

# Or via npm:
npm run eval:search
```

Example decision on the bundled fixtures: **`tune_candidate`** - the candidate
matches baseline on most metrics but dips slightly on market-research rubric and
introduces a duplicate citation, so it is flagged to tune rather than ship.

---

## Capturing real runs (optional live mode)

The scorer is offline by design. To produce real run files for a true
baseline/candidate comparison, capture each side **separately** with whatever
search path you already use, then save to the run JSON schema below.

- **Default = offline.** CI and the bundled examples never call an API.
- **Live capture is opt-in and local.** It needs `OPENROUTER_API_KEY` (or the
  Perplexity bridge) in your own shell - **never** in CI and **never** committed.
- Save the baseline run **before** changing the prompt/routing, and the candidate
  run **after**, over the same `queries.json`. Then run the offline comparator.

Run JSON schema (per result):

```json
{
  "label": "candidate",
  "search_prompt_version": "v2-new-search-prompt",
  "router_profile": "deep_search",
  "results": [
    {
      "query_id": "repo-automation-gh-repo",
      "answer": "free-text answer",
      "citations": ["https://example.com/a"],
      "error": false,
      "latency_ms": 1200,
      "tokens": { "input": 800, "output": 1200 },
      "cost_usd": 0.0021,
      "freshness_year": 2026,
      "usefulness_note": "optional downstream-usefulness note"
    }
  ]
}
```

---

## PR guidance: merging search prompt / routing changes

Before merging any PR that changes the search prompt, `ROUTING_PROFILES`, or the
deep-search / Perplexity wiring:

1. Capture a **baseline** run (current prompt) and a **candidate** run (your
   change) over `eval/fixtures/queries.json`.
2. Run `node eval/search-eval.js` and attach `report.md` (and `report.json`) to
   the PR.
3. State the **decision** in the PR description and act on it:
   - `keep_candidate` -> OK to merge.
   - `tune_candidate` -> iterate, do not merge as-is.
   - `rollback_candidate` -> do not merge; keep the previous prompt.
   - `needs_human_review` -> get a maintainer sign-off.

> **Green CI is not proof of search quality.** CI verifies the measurement layer
> runs; it does not verify that your new search is better. Attach the evaluation
> report.

---

**Built with enterprise standards from MIDNGHTSAPPHIRE**
**(c) 2026 Freedom Angel Corp.**
