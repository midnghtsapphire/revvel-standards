# WR-4600 Prompt Drift Report

**Canonical source:** WR-4200 spec (Drive)
**Compared against:** shipped dashboard embed
**Urgency:** LOW — `.md` files remain source of truth

## Summary

Three sections and one principle were dropped in the condensed dashboard embed.
All safety gates remain faithful.

## Dropped sections

### 1. IDENTITY
Canonical WR-4200 opens with an identity block establishing operator role,
scope boundaries, and escalation posture. The dashboard embed condensed this
into a single header line.

**Impact:** cosmetic. Identity is reasserted at every gate check.

### 2. MODEL ROUTING
Canonical spec includes routing table (which model handles which shard).
Dashboard embed omits routing entirely and defers to runtime config.

**Impact:** low. Runtime router (`tools/harvest.py`) enforces the same table.

### 3. INVENTORY
Canonical spec enumerates the full artifact inventory (specs, tests, snapshots,
dashboards). Dashboard embed lists only the visible artifacts.

**Impact:** low. `WR-4600.3-harvest-spec.yml` is authoritative.

## Dropped principle

### n8n / Gumloop principle
> "Automate the pipeline, not the judgment."

Dashboard embed drops this line. It remains load-bearing for the harvest
workflow: `watchtower.yml` automates fetch + snapshot, but triage-issue
summoning is gated on HARM/FLICKER/OCULAR classification, not volume.

## Faithful gates

- WR-4200 fabrication gate (P0): every URL from API response — ✅ preserved
- Quiet-day success gate: snapshot even on 0 deltas — ✅ preserved
- Adverse-first ordering — ✅ preserved
- Content-hash immutability — ✅ preserved
- Keyless-degrade rule (never pad) — ✅ preserved

## Recommendation

No action required. The `.md` canonical files are source of truth; the
dashboard embed is a rendering artifact. If the embed is ever executed
directly (it should not be), restore the four dropped items from this report.
