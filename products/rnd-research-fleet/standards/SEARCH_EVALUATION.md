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

## Strategies (multi-strategy comparison)

The evaluator recognizes named **search strategies**, compared offline against
the same fixture set:

| Strategy | Meaning |
| --- | --- |
| `baseline` | Current production search prompt / routing (`v1`). |
| `candidate` | A proposed single-path change (the new search prompt). |
| `fable` | The Fable single-model search path - the bar a fancier strategy must clear. |
| `twin_llm` | Send the SAME query to two independent model/search paths, then synthesize one source-backed answer. |
| `twin_llm_adjudicated` | `twin_llm` plus an explicit third adjudicator model that resolves disagreements and drops unsupported claims. |

`baseline` vs `candidate` uses the original 2-way comparator. `fable`,
`twin_llm`, and `twin_llm_adjudicated` are evaluated by the multi-strategy
comparator (`evaluateStrategies` / `compareTwinToFable`). When both twin runs are
provided, `twin_llm_adjudicated` is the one compared against Fable/baseline.

---

## Twin-LLM search: how it should work

A twin-LLM run is **not** "ask one model twice." It is:

1. **Two independent runs.** The same query goes to two different model/search
   paths (`model_a`, `model_b`) - ideally different providers - so their failure
   modes are uncorrelated.
2. **Agreement / disagreement extraction.** Compare the two answers and their
   sources. Claims both runs make (and cite) are high-confidence; claims only one
   run makes are `disagreements` to resolve.
3. **Adjudicator / synthesizer.** A merge step (optionally a third model in
   `twin_llm_adjudicated`) keeps agreed, source-backed claims, resolves
   disagreements toward the better-cited side, and **drops unsupported claims**
   (counted as `hallucination_or_unsupported_claim_flags`).
4. **Source-backed merge.** The final answer's citations are the union of the two
   runs' sources, de-duplicated. `unique_sources_added` measures the breadth the
   second run contributed; `source_overlap` measures how redundant the two runs
   were.
5. **Decision on measured quality / cost / latency - not vibes.** Twin costs ~2x
   tokens and adds latency, so it only earns its place if it measurably beats
   Fable/baseline.

### Twin-LLM scoring dimensions

Computed per run when results carry a `twin` block (see schema below):

| Dimension | Meaning |
| --- | --- |
| `model_pair` | The two model/search paths used. |
| `agreement_score` | Mean how-much-the-two-runs-agreed (0..1). |
| `disagreement_count` | Total substantive disagreements across queries. |
| `adjudication_quality` | Mean quality of the synthesizer's merge (0..1). |
| `source_overlap` | Mean domain overlap between the two runs' sources (lower = more diverse). |
| `unique_sources_added` | Distinct domains the second run added beyond the first. |
| `hallucination_or_unsupported_claim_flags` | Total unsupported/hallucinated claims flagged. |
| `cost_delta_vs_fable` | Twin total cost minus Fable total cost (USD). |
| `latency_delta_vs_fable` | Twin mean latency minus Fable mean latency (ms). |

### Twin decision rubric

The twin comparator emits exactly one decision:

| Decision | When |
| --- | --- |
| `keep_twin` | Twin beats Fable/baseline on rubric by `>= minQualityGain`, with no error/citation regression, adjudication quality above floor, no unsupported-claim flags, and cost/latency within budget. Twin earns its place. |
| `tune_twin` | Better quality but cost/latency over budget, or the two runs are largely redundant (`source_overlap` too high), or the gain is positive but below the keep threshold. De-dupe models, trim the second run, or cache shared sources, then re-run. |
| `rollback_twin` | Twin does **not** beat Fable/baseline on rubric, or it regresses error rate / citation coverage beyond threshold. Not worth its extra cost/latency - stay on Fable/baseline. |
| `needs_human_review` | Too few queries to decide. |

Twin thresholds live in `TWIN_THRESHOLDS` in `eval/search-eval.js`:

- rubric gain vs Fable `>= +0.05` -> eligible to keep
- cost ratio vs Fable `<= 2.0x` -> within budget
- latency ratio vs Fable `<= 2.0x` -> within budget
- mean adjudication quality `>= 0.6` -> trustworthy merge
- source overlap `<= 0.85` -> the two runs are not redundant
- unsupported-claim flags `<= 0` -> no hallucinated claims survived the merge

### How to run the twin comparison (offline)

```bash
cd products/rnd-research-fleet

# Twin-LLM vs Fable (and baseline), fully offline:
node eval/search-eval.js \
  --fixtures eval/fixtures/queries.json \
  --baseline eval/fixtures/baseline.example.json \
  --fable    eval/fixtures/fable.example.json \
  --twin     eval/fixtures/twin-llm.example.json \
  --twin-adjudicated eval/fixtures/twin-llm-adjudicated.example.json \
  --out /tmp/strategy-report.json \
  --md  /tmp/strategy-report.md

# Or via npm:
npm run eval:strategies
```

Example decision on the bundled fixtures: **`keep_twin`** - twin beats Fable on
rubric by `+0.15` within a `~1.6x` cost and `~1.5x` latency budget, with high
adjudication quality and zero unsupported-claim flags. (Against the already-strong
baseline the same twin run scores `tune_twin`, since its rubric edge there is
below the keep threshold - exactly the kind of nuance this report surfaces.)

### Running the twin LIVE (real API)

`twin-search.js` is the live runner. It sends the query to two independent models
in parallel, adjudicates/synthesizes a source-backed answer, and prints a report
in the twin JSON schema above — so its output feeds straight into the offline
comparator. Requires `OPENROUTER_API_KEY` (this is the product's paid search lane,
not the credit-free BIOME crew).

```bash
cd products/rnd-research-fleet

# Live twin run -> capture as a fixture
OPENROUTER_API_KEY=... node twin-search.js "your research question" > /tmp/twin-live.json
# (override models if desired)
#   TWIN_MODEL_A=openai/gpt-4o-search-preview TWIN_MODEL_B=anthropic/claude-3.5-sonnet \
#   TWIN_ADJUDICATOR=openai/gpt-4o node twin-search.js "..."

# Then score it against Fable/baseline with the same comparator:
node eval/search-eval.js \
  --fixtures eval/fixtures/queries.json \
  --baseline eval/fixtures/baseline.example.json \
  --fable    eval/fixtures/fable.example.json \
  --twin-adjudicated /tmp/twin-live.json \
  --md /tmp/strategy-report.md
```

The live run still has to **earn `keep_twin`** on the comparator before it becomes
the default — the runner produces the data; the eval makes the call.

## Triplet / N-model search (`triplet_llm`)

A triplet generalizes the twin to **N independent models** (default 3) with
**k-of-n majority consensus** (k = ⌊n/2⌋+1, i.e. 2-of-3). The extra arm buys
robustness — a claim corroborated by a *majority* of independent models is
stronger than a 2-of-2 agreement — at ~N× cost/latency. Like the twin, it only
earns its place if it **beats its reference on measured quality**. The reference
is the **twin** when one is provided (the bar the triplet must raise), else Fable.

**Strategy:** `triplet_llm` · **router_profile:** `n_model_adjudicated`

### Triplet scoring (the `nplet` block)

Each result carries an `nplet` block; the comparator (`npletMetricsFor` /
`compareNpletToReference` / `decideNplet`) rolls these up:

| Field | Meaning |
|-------|---------|
| `models` / `n` / `k` | the N model ids, N, and the majority threshold k |
| `agreement_score` | adjudicator's agreement (falls back to `consensus_score`) |
| `consensus_score` | fraction of distinct source-domains cited by ≥ k arms |
| `adjudication_quality` | adjudicator confidence in the merge |
| `disagreements` / `unsupported_claims` | resolved conflicts / dropped unsourced claims |
| `sources` | per-model source arrays (`sources[i]` = model i's citations) |

### Triplet decision rubric (`NPLET_THRESHOLDS`)

| Decision | When |
|----------|------|
| `keep_triplet` | beats the reference rubric by ≥ `minQualityGain`, within `maxCostRatio` (3.5×) / `maxLatencyRatio` (2.5×), with `consensus_score` ≥ `minConsensus`, adjudication above floor, no unsupported-claim flags, no error/citation regression. |
| `tune_triplet` | better quality but over cost/latency budget, or `consensus_score` too low (the arms rarely corroborate the same sources), or gain positive but below keep. |
| `rollback_triplet` | does not beat the reference rubric, or regresses error/citation coverage. Not worth ~N× — stay on the twin/Fable. |

### Running the triplet

```bash
cd products/rnd-research-fleet

# Live (real API; OPENROUTER_API_KEY required):
TRIPLET_MODELS="openai/gpt-4o-search-preview,anthropic/claude-3.5-sonnet,google/gemini-2.5-pro" \
  node triplet-search.js "your research question" > /tmp/triplet-live.json

# Score it vs the twin (and Fable), fully offline:
npm run eval:triplet
# or explicitly:
node eval/search-eval.js --fixtures eval/fixtures/queries.json \
  --fable eval/fixtures/fable.example.json \
  --twin-adjudicated eval/fixtures/twin-llm-adjudicated.example.json \
  --triplet /tmp/triplet-live.json
```

Decision on the bundled fixtures: **`rollback_triplet`** — the example triplet
reuses the twin's answers, so it shows no rubric gain over the twin and is
correctly rejected at ~3× cost. That is the point: a third arm must *measurably
improve* the answer (not just echo the twin) to earn `keep_triplet`.

### Twin run JSON schema (per result)

```json
{
  "label": "twin_llm",
  "strategy": "twin_llm",
  "search_prompt_version": "twin-llm-v1",
  "router_profile": "twin_dual_model",
  "results": [
    {
      "query_id": "repo-automation-gh-repo",
      "answer": "merged, source-backed answer",
      "citations": ["https://example.com/a", "https://example.com/b"],
      "latency_ms": 2100,
      "cost_usd": 0.0032,
      "twin": {
        "model_a": "openai/gpt-4o-search",
        "model_b": "anthropic/claude-sonnet-search",
        "adjudicator": "openai/gpt-4o",
        "agreement_score": 0.85,
        "disagreements": 0,
        "adjudication_quality": 0.9,
        "sources_a": ["https://example.com/a"],
        "sources_b": ["https://example.com/b"],
        "unsupported_claims": 0
      }
    }
  ]
}
```

> **Green CI is not proof of search quality.** A twin-LLM strategy must **beat
> Fable/baseline on this evaluation report** before it becomes the default. CI
> only proves the measurement layer runs - it never proves twin is better.

---

**Built with enterprise standards from MIDNGHTSAPPHIRE**
**(c) 2026 Freedom Angel Corp.**
