# Confidence Framework

A calibrated scale designed so that **no amount of weak sourcing can manufacture
certainty**, and so that an allegation can never silently become a verdict.

## The bands
| Band | Range | Meaning |
|---|---|---|
| SUBSTANTIATED | 0.85–1.00 | Backed by primary/adjudicated record |
| SUPPORTED | 0.55–0.84 | Multiple credible sources; not adjudicated |
| WEAK | 0.30–0.54 | Some support; treat as unverified |
| UNSUBSTANTIATED | 0.00–0.29 | Asserted, thin/no sourcing (incl. a scored claim driven to 0 by contradiction or no sources) |
| REFUSED/UNKNOWABLE | 0.00 | Refused verdict, or not checkable from public sources — set by the `refused` flag, **not** inferred from a 0 score |

Confidence `0.00` alone does not mean "refused." Refusal is carried by the separate
`refused` boolean; a non-refused claim that scores 0 is UNSUBSTANTIATED.

## The pipeline (in order)
1. **Refusal gate.** Fraud/guilt-of-a-named-person → score 0, REFUSED. Stop.
2. **Base.** `base = tier_weight(best source) × provenance_discount`.
3. **Corroboration.** `+0.06` per independent source at ≥ (best_tier − 1), cap `+0.24`.
4. **Contradiction.** `−0.12` per conflicting independent source, cap `−0.48`.
5. **Tier cap.** Result ≤ best source-tier weight.
6. **Stage ceiling.** Result ≤ adjudication-stage ceiling.

## Source tiers (config/source_tiers.yaml)
| Tier | Weight | Example |
|---|---|---|
| 5 adjudicated record | 1.00 | guilty plea, conviction, signed indictment |
| 4 primary official | 0.80 | DOJ release, FEC filing, C-SPAN transcript |
| 3 direct reporting | 0.60 | BBC/AP/Reuters named byline |
| 2 opinion/secondary | 0.35 | editorial board, op-ed |
| 1 social/anonymous | 0.15 | LinkedIn/X post, anonymous PDF |

## Adjudication ceilings — the anti-drift mechanism
| Stage | Ceiling |
|---|---|
| unknowable | 0.20 |
| alleged | 0.45 |
| investigated | 0.55 |
| charged | 0.75 |
| guilty_plea | 0.90 |
| settled_no_admission | 0.65 |
| convicted | 0.98 |

A **guilty plea** (admission on a docket) and a **no-admission civil settlement** are
deliberately separated: a "no-admit, no-deny" settlement is not an admission of guilt
and is capped lower (0.65) so it cannot inflate evidentiary strength. `plea_or_settled`
remains as a deprecated alias (0.90) for older datasets.

**Why two caps?** Tier protects against weak *sources*; stage protects against
weak *legal standing*. A perfectly-sourced fact about an *alleged* matter still
tops out at 0.45 — because "well-reported allegation" is not "proven."

## Provenance discount (how the fact reached the public)
`filing 1.00 · on_record_statement 0.95 · official_leak 0.70 ·
unattributed_leak 0.40 · anonymous_report 0.25`

A claim sourced to "a report claims" (anonymous) is discounted to a quarter of
its tier weight even before the ceilings apply.

## What gives "enough" confidence
Only this combination: a **tier ≥3 source**, **corroborated**, with **filing or
on-record provenance**, at a **charged-or-higher stage**. Anything short of that
is, by construction, capped below SUBSTANTIATED. That is the whole point.

## Worked example (seed case)
- *"Newsom said the DOJ is investigating him"* — C-SPAN transcript (tier 4,
  on-record). True that he *said* it, but the underlying matter is `alleged` →
  ceiling 0.45 → **WEAK**. Correct: we verified the utterance, not the
  investigation.
- *"A former staffer pleaded guilty"* — needs a docket (tier 5) before it leaves
  the editorial ceiling. Adjudicated, but about a **different person**.
- *"Newsom committed fraud"* — **REFUSED**, 0.
