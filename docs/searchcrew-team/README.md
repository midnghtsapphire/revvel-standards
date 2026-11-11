# /searchcrew-team — SearchCrew

> Backed up 2026-11-10 by Proofy. Call the whole team with `/searchcrew-team`; it goes to the lead.

| Field | Value |
|---|---|
| Team | SearchCrew |
| Call name | `/searchcrew-team` |
| Lead | [`/searchorchestrator`](../searchorchestrator/README.md) |
| Members | 9 |

## Purpose

Pull-only research pipeline: Discover → Fetch (API/MCP/CLI only) → Normalize → Index → Table row → Append to a private GitHub library.

## Routing

Send research asks to SearchOrchestrator. Scouts (WebScout, XPulse, PaperFinder, CodeScout, HackerPulse) fetch; CiteChecker blocks rows without provenance; LibraryArchivist is the sole appender; IndexRunner snapshots after append. SearchOrchestrator returns ONE merged brief to Audrey/Proofy.

## Members

| Call name | Bot | Role |
|---|---|---|
| [`/searchorchestrator`](../searchorchestrator/README.md) | SearchOrchestrator | SearchCrew lead; merges one brief from scouts |
| [`/webscout`](../webscout/README.md) | WebScout | SearchCrew scout for Common Crawl / Internet Archive (API only) |
| [`/xpulse`](../xpulse/README.md) | XPulse | SearchCrew scout for public X posts via MCP |
| [`/paperfinder`](../paperfinder/README.md) | PaperFinder | SearchCrew scholarly-source scout (APIs only) |
| [`/codescout`](../codescout/README.md) | CodeScout | SearchCrew GitHub search/read scout |
| [`/hackerpulse`](../hackerpulse/README.md) | HackerPulse | SearchCrew scout for Hacker News via Firebase API |
| [`/citechecker`](../citechecker/README.md) | CiteChecker | SearchCrew provenance/quality gate |
| [`/libraryarchivist`](../libraryarchivist/README.md) | LibraryArchivist | SearchCrew sole appender to private GitHub libraries |
| [`/indexrunner`](../indexrunner/README.md) | IndexRunner | SearchCrew indexer (MySQL FULLTEXT per library shard) |

## Rules

All members follow [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) plus each bot's own rules in its README.

## How to re-create the team

1. Re-create each member from its README ("How to re-create"), lead first.
2. Tell every member who the lead is and where to report.
3. Point Audrey's requests for this team at `/searchorchestrator`.
