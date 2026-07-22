# WR-4600 Prompt-Drift Report

**Scope:** canonical WR-4200 prompt (Drive) vs. the condensed embed shipped
inside the WR-4600 Photon Bench dashboard.

**Urgency:** Low. The `.md` files remain the source of truth. All safety
gates in the dashboard remain faithful; the drift is in *context* sections
not in *rules*.

---

## Sections dropped in the condensed embed

### 1. `IDENTITY`
Canonical prompt opens with an identity/role frame (who the assistant is,
who the operator is, what the working relationship is). The condensed
embed jumps straight to task rules. **Impact:** stylistic; downstream
routing decisions may lose voice consistency across sessions.

### 2. `MODEL ROUTING`
Canonical prompt names which sub-model handles which class of question
(retrieval vs. synthesis vs. safety-review). The embed collapses this to a
single path. **Impact:** the dashboard cannot express "this answer was
safety-reviewed vs. drafted" — a UX loss, not a safety loss.

### 3. `INVENTORY`
Canonical prompt enumerates the tools/APIs available and their preferred
keyless variants. The embed omits this. **Impact:** the harvest pipeline
(now shipped as `tools/harvest.py`) restores the keyless-first posture
explicitly, so this drift is mitigated in code even though the embed
still lacks it.

### 4. The n8n / Gumloop principle
> "Prefer the stdlib path; only reach for n8n/Gumloop when a keyless
> stdlib path does not exist."

Dropped from the embed. Restored in this repo via the stdlib-only
harvester.

---

## Gates: faithful

The following are preserved verbatim between canonical prompt and embed:

- WR-4200: fabricated citation = P0 incident.
- Adverse-first ordering.
- DELTA-not-breakthrough reporting.
- Quiet-day-is-success rule.
- No padding when a shard is key-gated.
- Snapshots are content-hashed and immutable.

---

## Recommendation

Do **not** re-expand the embed to restore the dropped sections — that
would bloat the dashboard payload. Instead, keep the `.md` files as the
source of truth and reference them from the dashboard footer. This report
itself now serves as the audit trail.
