# WR-4600 Prompt Drift Report

**Status:** Low urgency. `.md` files remain source of truth.

## Summary

Comparison of canonical WR-4200 prompt (Drive) vs. the shipped Photon Bench dashboard embed reveals three sections and one operating principle were dropped during condensation. All safety **gates** are faithful.

## Dropped Sections

### 1. IDENTITY
Canonical block establishing operator identity, callsigns, and voice. Removed from the condensed embed for length. **Impact:** cosmetic; does not affect routing or gates.

### 2. MODEL ROUTING
Decision table for choosing model per task class (harvest vs. triage vs. synthesis). **Impact:** medium — the dashboard now uses a single implicit route. Recommend re-inserting a compact routing hint.

### 3. INVENTORY
List of tools/APIs the operator may call, with keyless-first ordering. **Impact:** medium — new contributors lose the tool map. Mitigated by `WR-4600.3-harvest-spec.yml`.

### 4. n8n / Gumloop principle
Canonical operating principle: prefer no-code orchestration for glue, code for correctness-critical steps. Dropped entirely from the embed. **Impact:** low for current pipeline (pure Python), but relevant when we add scheduled fan-outs.

## Faithful Elements

- WR-4200 P0 rule: **a fabricated citation is a P0 incident**. Present.
- DELTA reporting (not "breakthrough"). Present.
- Quiet-day-is-success. Present.
- Content-hashed immutable snapshots. Present.
- Keyless-shard-degrades-to-zero (never pad). Present.
- `adverse` shard first. Present.

## Recommendation

No emergency action. When next touching the dashboard embed, re-insert compact `IDENTITY / MODEL ROUTING / INVENTORY` headers pointing at the canonical `.md` files rather than inlining full content.

## Source of Truth

- `WR-4600.3-harvest-spec.yml` — harvest spec
- `wr/research/spectrum-blueprint-read.md` — spectrum read-through
- `tools/harvest.py` — pipeline implementation
- This file — drift log
