# Unfound Docket — Affidavit-Grade Search

Colorado CLE manuscript for the emmyliette series **Unfound Hour**. No accounts. No secrets. Not accredited.

Pinned 2026-09-27. Do not report these hours until the Colorado CLJE Office approves this specific program. Not legal advice.

## Clocks

| | Minutes | Credits (50 min = 1) |
|---|---:|---:|
| Clock units | 180 | 3 × 60-minute units |
| Instruction | 150 | 3.0 general |
| Legal ethics | 25 | 0.5 |
| EDI | 25 | 0.5 |
| Excluded (opens + labs) | 30 | 0 |

Ethics and EDI are reported as well as general, not subtracted. Context, not this course: 45 credits / 7 professional responsibility (5 ethics or professionalism + 2 EDI) under C.R.C.P. 250.

## Proof

Canonical case MERIDIAN-A: priors 0.5 / 0.3 / 0.2, miss on segment 0 at POD 0.6.

- PASS — Posterior matches the hand calculation 0.20/0.70, 0.30/0.70, 0.20/0.70 (0.2857142857 · 0.4285714286 · 0.2857142857)
- PASS — Posterior is a distribution (sums to 1) (sum = 1.000000000000)
- PASS — Unsearched segments keep their odds ratio (prior B:C 1.500000 → posterior 1.500000)
- PASS — A prior-only story still ranks A first; the posterior ranks B first (narrative top A · lot; posterior top B · road)
- PASS — The shrink-and-forget spreadsheet is not a probability distribution (naive sum = 0.70; naive B = 0.30 but posterior B = 0.4286)
- PASS — W=20, L=5000, A=100000 → coverage 1 → POD = 1 − e^(−1) (C = 1.0000; POD = 0.6321205588)
- PASS — No narrative confidence term enters the posterior (bayesAfterMiss(poa, index, pod) — three arguments, none of them a story score)

Run from the repository root:

```bash
node --experimental-strip-types --test docs/unfound-docket/src/lib/meridian-math.test.ts
```

## What this is better at

A declaration exhibit. The posterior is a fraction you can recompute. A chat ranker has no such fraction. A paper nomograph does not chain the miss. SORAL remains the better multi-team optimizer and is cited, not wrapped.

## Layout

- `SYLLABUS.md` — three hours
- `FLEET.md` — ten prompts
- `BOM.md` — API, MCP, CLI, apps, action, Docker, libraries
- `PLAYBOOK.md` — blueprint and provider steps
- `SIGNAL.md` — SEO and SEM, evasion keywords excluded
- `SOURCES.md` — open web only
- `src/lib` — the functions the proof runs
