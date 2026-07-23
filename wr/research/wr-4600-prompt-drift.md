# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown source-of-truth files remain authoritative.

## Scope

Compare canonical WR-4200 spec (Drive) against the shipped Photon Bench dashboard embed.

## Findings

### Sections dropped in condensed dashboard embed

1. **IDENTITY** — Watchtower agent identity and provenance signature were omitted from the inline copy. The P0 fabrication rule remains present in the embedded WR-4200 directive.
2. **MODEL ROUTING** — Router rules (which model handles adverse vs. discovery vs. summary shards) were collapsed into a single "harvest" block.
3. **INVENTORY** — Full shard inventory with per-shard degradation rules (`0 rows + procurement note`, never pad) was reduced to a shard-name list.

### Principle dropped

- **n8n / Gumloop composition principle** — "pipeline steps must be reorderable without loss of grounding" was not carried into the embed.

### Gates preserved

All grounding gates faithful:
- URLs must originate from API responses (never constructed).
- Adverse-events shard runs first.
- Quiet day = success; snapshot still written.
- Content-hash + immutable snapshots.
- DELTA reporting (not "breakthrough").

## Recommendation

Keep the `.md` files as source of truth. The dashboard embed is a rendered *view*, not the spec. If the embed is ever re-generated, pull from `WR-4600.3-harvest-spec.yml` and the canonical WR-4200 doc — do not round-trip through the condensed form.

## Severity

**Low.** No gate was weakened; only descriptive scaffolding was trimmed. No action required beyond this note.
**Status:** Low urgency — `.md` files remain source of truth.

## Scope

Compare the canonical WR-4200 prompt (from Drive) to the condensed embed shipped in the WR-4600 Photon Bench dashboard.

## Drift Summary

| Section | Canonical (WR-4200) | Shipped Embed | Status |
|---------|---------------------|---------------|--------|
| IDENTITY | Present, full | **Dropped** | Drift |
| MODEL ROUTING | Present, full | **Dropped** | Drift |
| INVENTORY | Present, full | **Dropped** | Drift |
| n8n / Gumloop principle | Present | **Dropped** | Drift |
| P0: fabricated citation | Present | Present | Faithful |
| Grounding gates | Present | Present | Faithful |
| DELTA-not-breakthrough | Present | Present | Faithful |
| Snapshot immutability | Present | Present | Faithful |
| Adverse-shard-first | Present | Present | Faithful |

## Assessment

All **gates** (the load-bearing safety rules) are faithful in the shipped embed. The three dropped sections and the n8n/Gumloop principle are structural/operational context — useful, but not gate-defining.

**Recommendation:** No emergency patch. The canonical `.md` files in `wr/` remain source of truth; the embed is a UI convenience. If we ship a v2 dashboard, restore the three sections verbatim.

## Non-goal

No citations fabricated. This report is a diff, not a literature review.
# WR-4600 prompt drift — canonical (Drive) vs shipped dashboard

**Source of truth:** the `.md` files in the Drive WR-4600 folder
(`WR-4200-Operating-Directive.md`, `WR-4600.1/.2/.4`).
**Compared against:** the Prompts tab embedded in
`products/wr-4600-photon-bench/content.js` (shipped in PR #16549, now on `main`).

The shipped tab embeds a **condensed** WR-4200. It is faithful on the load-bearing
gates (Gate Ø, the Probes, evidence discipline, refusal set, budget, output
contract, known-good) but **drops three whole sections** and one principle. None
of the drift changes a gate; it drops operational context.

## Drift — present in canonical, missing from the shipped dashboard

| Canonical section | Status in dashboard | What's lost |
| --- | --- | --- |
| `## IDENTITY` | **missing** | "You operate inside Revvel Standards, Audrey's execution OS. Audrey specs and reasons. Agents implement. Skeleton-first, one upward rev per change." |
| `## MODEL ROUTING` | **missing** | "Do not hardcode model names. Route via WR-4480 (live OpenRouter API, 4 modality lanes). A hand-typed model table is a cache with no invalidation." |
| `## INVENTORY` | **missing** | "Do not paste inventory into context. Call `python tools/inventory_gen.py --refresh`. Generated, never hand-edited. If stale, the generator is broken — fix the generator, not the file." |
| `## PRINCIPLES` → runner-capacity line | **missing** | "Treat n8n and Gumloop (~$60/mo) as pre-paid runner capacity. Route through them before proposing new spend." |

## No drift (faithful)

- Gate Ø (METRIC/METER/MARK/MASK/MALUS + asymmetry rule + personal fork) — matches.
- The Probes (Bench/Body/Blade/Blank) — matches.
- Evidence discipline (`[PROVEN]/[EMERGING]/[SPECULATIVE]`, never synthesize a
  URL, the exact fallback line) — matches.
- Refusal set, budget ($150/mo cap, script-over-prompt), output contract,
  known-good (no retention claims) — match.
- WR-4600.1 LUMEN, .2 Fleet preamble, .4 Master prompt — match the canonical `.md`
  wording (checked against the Drive files and the inline pastes).

## Recommendation

Low urgency — the dashboard is a *rendering* of the directive for reading, not the
executable prompt. If exactness matters, re-embed the three missing sections in
`content.js` (Prompts tab, WR-4200 block) in a follow-up. The canonical `.md`
files remain the source of truth; agents should load those, not the dashboard.

## BLANK — what this comparison does not cover

- Whether the dashboard's *other* prompt blocks (4600.1/.2/.4) drifted in
  whitespace/punctuation — checked for content, not byte-exactness.
- Whether WR-4480 (the live model-routing directive referenced above) exists in
  the repo yet — not verified here.
