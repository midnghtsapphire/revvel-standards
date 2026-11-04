# Confidence Scorer Standard

Added 2026-11-04 by Grok Bot at Audrey Evans' request. Script: `scripts/confidence_scorer.py`. Tests: `tests/test_confidence_scorer.py`. Sources: `Library/references/confidence-scorer-sources.md`.

## What it does

Bots use this scorer to choose between options without guessing. It is plain Python 3 stdlib with no LLM and no network calls. The same input always gives byte-identical output.

## Input

A JSON list of options:

```json
{"id": "a", "title": "Open draft PR",
 "evidence": {"web": 8, "google_drive": 0.9, "seo_sem": 0.7, "social": 4},
 "source_agreement": 0.9, "reversibility": 1.0, "cost": 0.05, "risk": 0.1,
 "flags": {"destructive": false, "sends_message": false, "spends_money": false},
 "sub_choices": []}
```

- `evidence.<source>`: an integer is a count (10 or more = full strength); a float from 0 to 1 is a strength. Sources: `web`, `google_drive`, `seo_sem`, `social`. A missing source counts as 0.
- `source_agreement`, `reversibility`, `cost`, `risk`: 0 to 1. Cost and risk are inverted, so lower is better.
- `sub_choices` (optional): another option list. It is scored recursively for the top option only.

## Fixed weights

| Signal | Weight | Notes |
|---|---|---|
| evidence | 40 | web 0.30, google_drive 0.25, seo_sem 0.25, social 0.20 |
| source_agreement | 20 | independent sources agreeing |
| reversibility | 15 | 1 = fully undoable |
| risk | 15 | inverted |
| cost | 10 | inverted |

Score = sum of weight × normalised signal, rounded to 2 decimals (0 to 100). Ties are broken by `id` in ascending order.

## Threshold rule

- **Threshold 70.** A fully reversible, free, no-risk option with complete source agreement still scores only 60 without evidence. To reach 70, it needs at least 25% of full evidence strength. In other words, no option passes on safety alone; it needs real evidence. Riskier or costlier options need more evidence to pass.
- **Margin 10.** The top option must lead the runner-up by at least 10 points. A smaller lead means the evidence cannot separate the options.
- `proceed`: the top option scores 70 or more, leads by 10 or more, and has no flags. The bot goes ahead with it and scores its sub-choices the same way.
- `gather_more_evidence_or_escalate`: the top option is below the threshold or the margin.
- `ask_owner`: the top option is flagged `destructive`, `sends_message`, or `spends_money`. **These always need Audrey, whatever the score.** The output then has `needs_owner: true`. The flag also carries up from a flagged sub-choice on the chosen path.

## Run

```bash
python3 scripts/confidence_scorer.py scripts/examples/confidence_scorer_example.json
cat options.json | python3 scripts/confidence_scorer.py --json
python3 -m unittest tests/test_confidence_scorer.py -v
```

Exit code 2 means bad input; the reason is printed on stderr. These tests are not wired into `npm test`, by design.
