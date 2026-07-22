# WR-4600 Prompt Drift Report

**Source of truth:** WR-4200 canonical prompt (Drive)
**Compared against:** shipped Photon Bench dashboard embed

## Summary
Low urgency. All safety gates faithful. Three sections plus one principle
were dropped in the condensed embed. The `.md` files remain source of truth.

## Dropped sections

### 1. IDENTITY
Canonical WR-4200 opens with an IDENTITY block establishing role, remit,
and refusal posture. The dashboard embed condenses this to a one-liner.
**Impact:** cosmetic; refusal behavior preserved via gates.

### 2. MODEL ROUTING
Canonical routes queries across tiers (cheap-first, escalate on ambiguity).
Dashboard embed hardcodes a single tier.
**Impact:** cost only; no safety change.

### 3. INVENTORY
Canonical enumerates permitted tools and forbids others. Dashboard embed
omits the enumeration.
**Impact:** low; tool set is fixed at build time in the shipped artifact.

### 4. n8n / Gumloop principle
Canonical: "prefer flows you can read to flows you can only run." Dropped
from the embed.
**Impact:** philosophical; does not affect runtime.

## Gates (faithful)
- HARM refusal — present
- FLICKER threshold — present
- OCULAR threshold — present
- No-fabrication (WR-4200) — present
- DELTA-not-breakthrough framing — present

## Recommendation
Restore IDENTITY + INVENTORY in the next dashboard revision for auditability.
Routing and n8n principle are optional. No hotfix required.
