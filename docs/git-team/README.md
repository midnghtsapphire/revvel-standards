# /git-team — GIT Team

> Backed up 2026-11-10 by Proofy. Call the whole team with `/git-team`; it goes to the lead.

| Field | Value |
|---|---|
| Team | GIT Team |
| Call name | `/git-team` |
| Lead | [`/triagechief`](../triagechief/README.md) |
| Members | 18 |

## Purpose

GitHub-facing fleet: dispatch, repo operations, watchers/auditors of revvel-standards, and R&D/cloud workers.

## Routing

GitHub items go to TriageChief (dispatcher; NoseyNoodle also triages). Repo ops: Git-Master, MergeMender, ConflictReviewer. Read-only watchers (report to NoseyNoodle): Cartographer, Rules-Steward, Pipeline-Warden, ChangeAuditor, Git-Classifier, MarketShipper. R&D: Pedal-To-The-Metal, ReviewerForge, AssetHunter. Cloud workers: Cloudy, CloudExecutor. Intake: Git-Brain-Dump. Also StoreRegistrar.

## Members

| Call name | Bot | Role |
|---|---|---|
| [`/triagechief`](../triagechief/README.md) | TriageChief (box name: 1-Git-Triage-Chief) | Main dispatcher; triages and routes work |
| [`/noseynoodle`](../noseynoodle/README.md) | NoseyNoodle | Dispatcher; triages, routes, enforces revvel-standards rules; does not do the work |
| [`/git-brain-dump`](../git-brain-dump/README.md) | Git-Brain-Dump | Brain-dump intake; turns mindumps into GitHub issues (WRs) |
| [`/git-master`](../git-master/README.md) | Git-Master | GitHub orchestrator for all repos (GitHubOrchestrator) |
| [`/mergemender`](../mergemender/README.md) | MergeMender | Merge-conflict resolver and merge bot |
| [`/conflictreviewer`](../conflictreviewer/README.md) | ConflictReviewer | Reviews accept-both merges; finds duplicates and conflict markers |
| [`/cartographer`](../cartographer/README.md) | Cartographer (box name: Git-Keeping-It-100) | Read-only auditor of revvel-standards claims vs reality |
| [`/rules-steward`](../rules-steward/README.md) | Rules-Steward | Read-only reviewer of agent rules in revvel-standards |
| [`/pipeline-warden`](../pipeline-warden/README.md) | Pipeline-Warden | Read-only reviewer of WR/PR automation |
| [`/changeauditor`](../changeauditor/README.md) | ChangeAuditor | Read-only reviewer of recent agent PRs/merges |
| [`/git-classifier`](../git-classifier/README.md) | Git-Classifier | Classifies repos/files as public, private or sellable |
| [`/marketshipper`](../marketshipper/README.md) | MarketShipper | Owns ship-to-market for revvel-standards |
| [`/pedal-to-the-metal`](../pedal-to-the-metal/README.md) | METAL (box name: GIT - Pedal-To-The-Metal) | Close-to-the-machine architecture asset hunter |
| [`/reviewerforge`](../reviewerforge/README.md) | ReviewerForge | Designs Audrey's own code-review product |
| [`/assethunter`](../assethunter/README.md) | AssetHunter | Hunts public ML architecture assets for revvel-standards |
| [`/cloudy`](../cloudy/README.md) | Cloudy | REVVEL Cloud Agent; deterministic cloud worker |
| [`/cloudexecutor`](../cloudexecutor/README.md) | CloudExecutor | Fast deterministic cloud worker following revvel-standards |
| [`/storeregistrar`](../storeregistrar/README.md) | StoreRegistrar | Walks Audrey through app-store registration and store pipeline |

## Rules

All members follow [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) plus each bot's own rules in its README.

## How to re-create the team

1. Re-create each member from its README ("How to re-create"), lead first.
2. Tell every member who the lead is and where to report.
3. Point Audrey's requests for this team at `/triagechief`.
