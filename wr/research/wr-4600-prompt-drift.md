# WR-4600 Prompt-Drift Report

**Scope:** Compare canonical WR-4200 operating charter (Drive source-of-truth) against the condensed prompt embedded in the shipped Photon Bench dashboard.

**Urgency:** LOW. The `.md` files in `wr/` remain source of truth; the dashboard embed is a derivative view. No safety gates were weakened.

---

## Summary

Three sections and one operating principle were **dropped** in the condensed dashboard embed. All hard safety gates (HARM / FLICKER / OCULAR / citation-fabrication) were preserved faithfully.

| Item | Canonical (WR-4200) | Dashboard Embed | Delta |
|---|---|---|---|
| `IDENTITY` block | Present | **Dropped** | Persona/role framing missing |
| `MODEL ROUTING` block | Present | **Dropped** | Routing hints for downstream agents missing |
| `INVENTORY` block | Present | **Dropped** | Tooling/asset enumeration missing |
| n8n / Gumloop principle | "Prefer declarative flow orchestration over ad-hoc glue." | **Dropped** | Architectural nudge missing |
| HARM gate | P0 stop | P0 stop | ✅ faithful |
| FLICKER gate | P0 stop | P0 stop | ✅ faithful |
| OCULAR gate | P0 stop | P0 stop | ✅ faithful |
| Citation fabrication (WR-4200) | P0 incident | P0 incident | ✅ faithful |
| DELTA-not-breakthrough framing | Required | Required | ✅ faithful |
| Quiet-day success semantics | Required | Required | ✅ faithful |

---

## Dropped: `IDENTITY`

Canonical charter opens with an `IDENTITY` stanza establishing role, tone, and refusal posture. The dashboard embed jumps directly to gates, so downstream agents reading only the dashboard lose the framing that governs *how* to refuse, not just *what* to refuse.

**Impact:** Minor. Refusal behavior is still enforced by the gates; only the *voice* of refusal drifts.

**Recommendation:** Re-inline a 3-line `IDENTITY:` header in the next dashboard rev, or link out to `wr/WR-4200.md`.

---

## Dropped: `MODEL ROUTING`

Canonical charter includes routing hints (which model tier for which task class). The dashboard embed omits these entirely.

**Impact:** Low for the current single-agent path; would matter if the dashboard-embedded prompt is ever lifted into a multi-agent orchestrator.

**Recommendation:** Keep dropped for the dashboard (noise for human readers); ensure orchestrators pull from `wr/WR-4200.md` directly.

---

## Dropped: `INVENTORY`

Canonical charter enumerates available tools, data shards, and asset locations. The dashboard embed drops this.

**Impact:** Low. Inventory drifts fastest and is best kept in one place (`wr/WR-4200.md`); embedding a stale inventory in HTML would be worse than omitting it.

**Recommendation:** Keep dropped. Add a one-line pointer: *"Live inventory: `wr/WR-4200.md#inventory`."*

---

## Dropped: n8n / Gumloop principle

Canonical text: *"Prefer declarative flow orchestration (n8n / Gumloop-style) over ad-hoc glue code when a pipeline has ≥3 stages or ≥2 external calls."*

**Impact:** Architectural nudge, not a gate. Loss is stylistic.

**Recommendation:** Restore as a one-line footnote in the dashboard's "Operating Principles" panel.

---

## Faithful (verified preserved)

- **HARM gate** — any row tagged `harm` halts the harvest and blocks commit.
- **FLICKER gate** — flicker-band artifacts trigger P0.
- **OCULAR gate** — retinal/ocular adverse signals trigger P0.
- **WR-4200 citation gate** — a fabricated URL is a P0 incident; the harvester derives every URL from an API response, never constructs one.
- **DELTA framing** — reports use "delta," never "breakthrough."
- **Quiet-day success** — a zero-signal day still snapshots and still counts as a successful run.

---

## Verdict

Drift is **cosmetic + architectural**, not **safety-relevant**. No action required this cycle. Track for the next dashboard revision.

**Source of truth:** `wr/WR-4200.md`, `WR-4600.3-harvest-spec.yml`.
