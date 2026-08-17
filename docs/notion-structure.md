# Notion Knowledge Layer

Notion is the connected documentation system for the [Revvel operating model](./operating-model.md). GitHub is the source of truth for build-state and execution; Notion is the source of truth for context, research synthesis, and reusable knowledge.

The two systems link through the GitHub issue / PR ID or URL — every Notion record references the GitHub item it relates to, and every relevant GitHub issue links back to the Notion record.

---

## Databases

### 1. Research Briefs

Long-form deep-research synthesis attached to a work request.

| Property        | Type            | Notes                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------- |
| Title           | Title           | One-line research subject                                              |
| GitHub Issue    | URL             | Link to the WR issue                                                   |
| Output Type     | Select          | Mirrors the issue form options                                         |
| Research Mode   | Select          | `standard` / `deepresearch`                                            |
| Status          | Select          | `Drafting` / `In Review` / `Approved` / `Stale`                        |
| Sources         | Multi-select    | `web`, `usenet`, `reddit`, `discord`, `x`, `github`, `paper`, `patent` |
| Key Findings    | Text            | Bullet summary                                                         |
| Competitors     | Relation → Competitor Watchlist | Linked competitor records                              |
| Related Inventions | Relation → Inventions      | Linked invention records                                  |
| Last Verified   | Date            | When the research was last spot-checked                                |
| Owner           | Person          | Reviewer / operator                                                    |

### 2. Inventions

Invention development history. One record per invention concept; updates appended over time.

| Property               | Type   | Notes                                                                       |
| ---------------------- | ------ | --------------------------------------------------------------------------- |
| Name                   | Title  | Invention name                                                              |
| GitHub Issue           | URL    | WR for the invention flow                                                   |
| Stage                  | Select | `Framing` / `Novelty Scan` / `Viability` / `Protection` / `Prototype` / `Commercialization` / `Decision` |
| Decision               | Select | `BUILD` / `HOLD` / `ARCHIVE`                                                |
| Public-Disclosure Risk | Select | `Low` / `Medium` / `High`                                                   |
| Protection Strategy    | Select | `Trade Secret` / `Brand Moat` / `Licensing` / `Provisional Patent` / `Hold Private` |
| Prototype Path         | Select | Same options as the invention template Section 8                            |
| Commercialization Path | Select | Same options as the invention template Section 9                            |
| Last Review            | Date   | Last review checkpoint                                                      |
| Next Review            | Date   | Next review checkpoint                                                      |

### 3. SOPs

Standard operating procedures for repeatable processes.

| Property      | Type   | Notes                                              |
| ------------- | ------ | -------------------------------------------------- |
| Title         | Title  | SOP name                                           |
| Domain        | Select | `Intake` / `Research` / `Build` / `Launch` / `Marketing` / `Refresh` / `Invention` |
| Owner         | Person | Process owner                                      |
| Status        | Select | `Draft` / `Active` / `Deprecated`                  |
| Last Reviewed | Date   |                                                    |
| Tools         | Multi-select | Tooling used in this SOP                     |
| Linked Repo   | URL    | Repo this SOP applies to (if any)                  |

### 4. Launch Plans

Per-launch plan with its own approval state.

| Property         | Type   | Notes                                                                   |
| ---------------- | ------ | ----------------------------------------------------------------------- |
| Title            | Title  | Launch name                                                             |
| GitHub Item      | URL    | Linked PR or release                                                    |
| Launch Channel   | Select | `Organic Social` / `Email` / `SEO` / `Marketplace` / `Direct Outreach` / `Client Delivery` |
| Status           | Select | `Drafting` / `Approved` / `Scheduled` / `Live` / `Measured`             |
| Marketing Ready  | Select | `No` / `Needs Review` / `Yes`                                           |
| Target Date      | Date   |                                                                         |
| Approver         | Person |                                                                         |
| Postmortem       | Relation → Postmortems |                                                         |

### 5. Prompt Library

Reusable prompts for agent and operator use.

| Property    | Type   | Notes                                                       |
| ----------- | ------ | ----------------------------------------------------------- |
| Title       | Title  | Prompt name                                                 |
| Use Case    | Select | `Research` / `Coding` / `Review` / `Marketing` / `Invention` |
| Model       | Select | Target model (Claude, GPT, Gemini, OpenRouter, etc.)        |
| Status      | Select | `Draft` / `Active` / `Deprecated`                           |
| Linked SOP  | Relation → SOPs |                                                    |
| Last Tested | Date   |                                                             |

### 6. Product Notes

Per-product context, decisions, and design rationale.

| Property      | Type   | Notes                                              |
| ------------- | ------ | -------------------------------------------------- |
| Product       | Title  | Product name                                       |
| Repo          | URL    |                                                    |
| Output Type   | Select | Mirrors the issue form options                     |
| Lifecycle     | Select | `New` / `Active` / `Refresh Candidate` / `Archive` |
| Latest Decision | Select | `BUILD` / `HOLD` / `ARCHIVE` / `REFRESH AND RELAUNCH` / `NARROW AND REPOSITION` |
| Last Refresh  | Date   |                                                    |
| Linked Launches | Relation → Launch Plans |                                  |

### 7. Marketing Copy Bank

Reusable marketing assets keyed by product and channel.

| Property | Type   | Notes                                                         |
| -------- | ------ | ------------------------------------------------------------- |
| Title    | Title  | Asset name                                                    |
| Product  | Relation → Product Notes |                                       |
| Channel  | Select | `X` / `LinkedIn` / `Instagram` / `Email` / `Blog` / `SEO` / `Marketplace` |
| Format   | Select | `Caption` / `Thread` / `Long-form` / `Image` / `Video` / `Snippet` |
| Status   | Select | `Draft` / `Approved` / `Live` / `Retired`                     |
| Owner    | Person |                                                               |

### 8. Postmortems

Per-launch or per-incident retrospective.

| Property | Type   | Notes                                              |
| -------- | ------ | -------------------------------------------------- |
| Title    | Title  | Postmortem name                                    |
| GitHub Item | URL | PR / issue / release this is about                 |
| Type     | Select | `Launch` / `Incident` / `Refresh` / `Invention`    |
| Outcome  | Select | `Win` / `Loss` / `Mixed` / `Learning Only`         |
| Owner    | Person |                                                    |
| Date     | Date   |                                                    |

### 9. Decisions

Lightweight architecture / strategy decision records.

| Property      | Type   | Notes                                              |
| ------------- | ------ | -------------------------------------------------- |
| Title         | Title  | Decision title                                     |
| Decision Type | Select | `Architecture` / `Strategy` / `Naming` / `Process` / `Tooling` |
| Status        | Select | `Proposed` / `Accepted` / `Superseded` / `Rejected`|
| Date          | Date   |                                                    |
| Linked Items  | Relation → any DB |                                       |

---

## Linking Conventions

- Every Research Brief, Invention, SOP, Launch Plan, Product Note, Postmortem, and Decision record stores the related GitHub URL in a `GitHub Issue` / `GitHub Item` / `Repo` URL property.
- GitHub issues that have a Notion record link back to it in the issue body or a comment, prefixed with `🔗 Notion:`.
- Cross-database relations (Inventions ↔ Research Briefs, Launch Plans ↔ Postmortems, Product Notes ↔ Launch Plans, etc.) are bidirectional.

---

## Maintenance

- A monthly portfolio review sweeps these databases (see [Operating Model — Stage F](./operating-model.md#stage-f--portfolio-review-loop)).
- Records older than 6 months with `Status = Stale` or `Lifecycle = Refresh Candidate` are surfaced for the legacy refresh flow.
- All Notion records have an Owner and either a Last Reviewed or Last Refresh date so neglected knowledge does not silently rot.
