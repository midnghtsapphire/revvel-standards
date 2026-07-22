# WR-4600 Prompt Drift Report

**Scope:** Compare canonical WR-4200 spec (Drive) vs shipped dashboard embed.
**Urgency:** LOW — `.md` files remain source of truth.

## Sections Dropped in Condensed Embed

### 1. IDENTITY
Canonical spec includes an `IDENTITY` block establishing operator persona, scope
boundaries, and the WR-4200 P0 rule: *"a fabricated citation is a P0 incident."*
The shipped dashboard embed omits this block entirely.

**Impact:** Operators reading only the embed do not see the fabrication-is-P0
rule. Mitigation: harvest pipeline enforces it in code (every URL originates
from an API response, never constructed).

### 2. MODEL ROUTING
Canonical spec defines routing tiers (cheap-fast vs deep-reasoning) and when
to escalate. Dropped from embed.

**Impact:** Cosmetic for the dashboard, but downstream automation loses the
routing hint. Mitigation: routing lives in `tools/harvest.py` config.

### 3. INVENTORY
Canonical spec enumerates the shard list (adverse, trials, literature, ...)
with procurement notes for keyed shards. Embed reduces this to a single line.

**Impact:** Contributors can't see which shards degrade to zero rows without
a key. Mitigation: `WR-4600.3-harvest-spec.yml` is authoritative.

### 4. n8n / Gumloop Principle
Canonical spec: *"prefer declarative pipeline nodes over imperative glue;
n8n/Gumloop-style composition beats bespoke scripts for auditability."*
Dropped from embed.

**Impact:** Philosophical, not blocking. Noted here for future refactors.

## Gates Preserved Faithfully

All hard gates survive the condensation:

- P0 fabrication rule (enforced in code)
- Content-hash immutability of snapshots
- Quiet-day = success (DELTA reporting, not "breakthrough")
- Keyless-shard degradation to zero rows (never pad)
- `adverse` shard runs first

## Recommendation

Keep `.md` files as source of truth. The dashboard embed is a viewer, not the
spec. When embed and `.md` disagree, `.md` wins. Do not re-expand the embed —
the drift is acceptable given the P0 rule is enforced at the pipeline layer.

## Provenance

- Canonical: `WR-4200-identity.md`, `WR-4600.3-harvest-spec.yml` (Drive)
- Shipped: `products/wr-4600-photon-bench/original.html` embedded prompt block
- Diff performed: manual read-through, no automated diff tool (embed is not
  structured YAML)
