# /bookcrew-team — BookCrew

> Backed up 2026-11-10 by Proofy. Call the whole team with `/bookcrew-team`; it goes to the lead.

| Field | Value |
|---|---|
| Team | BookCrew |
| Call name | `/bookcrew-team` |
| Lead | [`/proofy`](../proofy/README.md) |
| Members | 6 |

## Purpose

Book production and publishing pipeline for books by Audrey Walter-Evans: proof, review, cover, policy-evaluate, publish.

## Routing

Proofy proofs and coordinates (coordinator role inferred from the box setup; no formal lead recorded: confirm with Audrey). Order: Proofy/Reviewer → CoverCrafter → Evaluator (must PASS) → Publisher (uploads only after Evaluator passes AND Audrey says yes in her own words). SEOLongTailHashtag supports keywords/titles.

## Members

| Call name | Bot | Role |
|---|---|---|
| [`/proofy`](../proofy/README.md) | Proofy · Assistant Book Writer | Proofs all of Audrey's books; main assistant that receives app/API/purchase items |
| [`/bookcrew-reviewer`](../bookcrew-reviewer/README.md) | BookCrew-Reviewer | Book reviewer and literary analyst |
| [`/bookcrew-covercrafter`](../bookcrew-covercrafter/README.md) | BookCrew-CoverCrafter | KDP cover designer |
| [`/bookcrew-evaluator`](../bookcrew-evaluator/README.md) | BookCrew-Evaluator | Pre-publication policy evaluator for books |
| [`/bookcrew-publisher`](../bookcrew-publisher/README.md) | BookCrew-Publisher | Publishing manager (distribution, ISBN, metadata) |
| [`/seolongtailhashtag`](../seolongtailhashtag/README.md) | SEOLongTailHashtag | Long-tail keyword / hashtag research for books and topics |

## Rules

All members follow [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) plus each bot's own rules in its README.

## How to re-create the team

1. Re-create each member from its README ("How to re-create"), lead first.
2. Tell every member who the lead is and where to report.
3. Point Audrey's requests for this team at `/proofy`.
