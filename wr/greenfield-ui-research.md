# WR: Greenfield UI Research & Integration

## Issue Context

Review `rgn/greenfield-ui` and research on the indexed web how to incorporate it into `revvel-standards`. Output Type: `production-app`.

## Background & Motivation

The repository `rgn/greenfield-ui` is a frontend UI project. The goal is to evaluate this UI and determine how its components or structure could be modernized and incorporated into the `revvel-standards` ecosystem, specifically focusing on generating reusable skills or production UI structures.

## Scope

- Evaluate `rgn/greenfield-ui` architecture and features.
- Formulate a migration/integration strategy for `revvel-standards`.
- Define the target state as a `production-app`.

## Approach

- Analyze the structure and feature set of `greenfield-ui`.
- Map existing features to the `revvel-standards` process: 1) Connect data sources with MCP, 2) Generate responsive HTML, 3) Wire live render-time logic, 4) Save as a reusable skill, 5) Deploy via a sandboxed URL.
- Outline a redevelopment plan following the `promptforproject.md` guidelines (UI verification, monetization, and deployment verification).

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows

## Risks & Mitigations

- **Risk:** High technical debt from legacy framework integration. **Mitigation:** Treat it as a complete rewrite focusing on the UI design and functionality patterns, rather than a direct code port.

## Competitor & Pricing Intelligence

Pricing data pending — competitive benchmark research required.

## Learnings — What & Why

- **What:** The `greenfield-ui` is a legacy frontend project to be reviewed.
- **Why:** Incorporating it into `revvel-standards` requires translating its UI/UX intentions into our live HTML dashboard and MCP skill generation pipeline rather than directly integrating its original source code.
