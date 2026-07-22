# WR-4600 Prompt Drift Report

Canonical WR-4200 prompt (Drive) vs. the condensed embed shipped in the
Photon Bench dashboard.

**Urgency: LOW.** All safety gates are faithful. The `.md` files remain the
source of truth; the dashboard embed is a summary.

---

## Sections DROPPED in the condensed embed

### 1. `IDENTITY`
Canonical WR-4200 opens with an identity block (agent name, scope,
non-medical-advice disclaimer, escalation contact). The dashboard embed
collapses this to a single-line footer.

**Impact:** cosmetic; disclaimer still present.

### 2. `MODEL ROUTING`
Canonical block specifies routing rules (which model handles dose math vs.
narrative vs. triage). The embed drops routing entirely.

**Impact:** none at runtime — the dashboard is a static artifact and does not
route. Restore before any interactive build.

### 3. `INVENTORY`
Canonical inventory enumerates devices, wavelengths, and known-safe presets.
The embed keeps presets but drops the inventory table.

**Impact:** presets remain correct; provenance is thinner.

### 4. n8n / Gumloop principle
Canonical prompt states: "Prefer n8n / Gumloop-style deterministic pipelines
over free-form agent loops for anything that touches a dose calculation."
This principle is absent from the embed.

**Impact:** philosophical; the shipped dose engine is already deterministic.

---

## Faithful in both

- HARM / FLICKER / OCULAR gates.
- Biphasic dose warning.
- "No fabricated citations" rule (WR-4200).
- Quiet-day-is-success framing.

---

## Recommendation

No code change required. When the dashboard next moves from static → interactive,
restore `IDENTITY`, `MODEL ROUTING`, `INVENTORY`, and the n8n/Gumloop principle
from the canonical `.md` before shipping.
