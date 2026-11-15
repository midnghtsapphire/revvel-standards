# Perplexity

| Field | Value |
| --- | --- |
| Category | research / LLM |
| Status | unknown |
| First evidence found | 2026-05-16 |
| Latest evidence found | 2026-11-05 |
| Cost | API usage; keyless lane added to avoid a key (PR #13693); amount NEEDS AUDREY |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Research lane in workflows (sonar-pro, deep research), a Puter-based keyless integration, and a research WR about Perplexity skills.

## What worked

- PR #13693 (2026-05-21) added a no-key Perplexity research lane.
- Commit ed64293bc (2026-08-21) gave routedChat free lanes: LM Studio and keyless Perplexity.

## What did not work

- docs/SPEND-SWITCHES.md: Perplexity API is a billed service in the research group.
- brain-dump#9 (2026-10-30): make OpenHands the triage agent with no Perplexity.

## Why kept or dropped

Kept as a research lane; excluded from the planned triage agent. Repo moved from API use toward a keyless lane (2026-05-21), and a 2026-10-30 triage design says "no Perplexity". No stated verdict.

## Evidence

- [PR #13506: Puter Perplexity integration (2026-05-17)](https://github.com/midnghtsapphire/revvel-standards/pull/13506)
- [PR #13693: no-key Perplexity research lane (2026-05-21)](https://github.com/midnghtsapphire/revvel-standards/pull/13693)
- [Commit ed64293bc: free lanes for routedChat (2026-08-21)](https://github.com/midnghtsapphire/revvel-standards/commit/ed64293bc59b07b726bf6025862781b418dd9ed5)
- [Puter Perplexity standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/standards/PUTER_PERPLEXITY_INTEGRATION_STANDARD.md)
- [Research WR on pplx-api skills](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/wr/pplx-api-research.md)
- [Spend switches](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/SPEND-SWITCHES.md)
- [brain-dump#9: triage via OpenHands, no Perplexity](https://github.com/Freedom-Angel-Corp/brain-dump/issues/9)
- [oaudrey PR #3: Perplexity vs SearchCrew vs hybrid](https://github.com/midnghtsapphire/oaudrey/pull/3)

## Open gaps for Audrey

- **Needs Audrey:** yes: what she liked about Perplexity and why the triage design excludes it
- Her view of Perplexity quality and cost.
- oaudrey PR #3 (2026-11-05) compares Perplexity, SearchCrew, and a hybrid; the outcome is not recorded here.
