# WR-4600 Prompt Drift Report

**Scope:** Compare canonical WR-4200 operator prompt (Drive source of truth) to the condensed embed shipped in `products/wr-4600-photon-bench/original.html`.

**Urgency:** LOW — the canonical `.md` files remain source of truth; the dashboard embed is a UX condensation, not a re-authoring.

---

## Summary

Three sections and one operational principle were dropped in the condensed dashboard embed. All safety gates (HARM / FLICKER / OCULAR) were faithfully preserved. No fabricated citations, no policy inversions.

| Element | Canonical (Drive) | Shipped dashboard | Drift |
|---|---|---|---|
| `IDENTITY` block | present | **dropped** | condensation |
| `MODEL ROUTING` block | present | **dropped** | condensation |
| `INVENTORY` block | present | **dropped** | condensation |
| n8n / Gumloop principle | present | **dropped** | condensation |
| HARM gate | present | present | faithful |
| FLICKER gate | present | present | faithful |
| OCULAR gate | present | present | faithful |
| WR-4200 no-fabrication rule | present | referenced | faithful |

---

## 1. `IDENTITY` (dropped)

Canonical prompt opens with an IDENTITY stanza that anchors the operator to the WR- series charter and the Prime Directive. Its absence in the embed does not change behavior at runtime (the dashboard is read-only) but it means a reader of the dashboard alone cannot recover the operator's charter.

**Remediation:** none required. If we ever make the dashboard self-executing, restore IDENTITY verbatim.

## 2. `MODEL ROUTING` (dropped)

Canonical prompt specifies routing rules (cheap-model-first, escalation ladders, keyless-API preference). The dashboard embed does not include routing. Harvest pipeline (`tools/harvest.py`) independently implements the keyless-API preference, so runtime behavior is unaffected.

## 3. `INVENTORY` (dropped)

Canonical prompt enumerates the inventory of allowed data sources (NCBI E-utilities, ClinicalTrials.gov v2, Crossref, …) and forbidden sources. The dashboard omits this, but `WR-4600.3-harvest-spec.yml` and `tools/harvest.py` both enforce the inventory at code level.

## 4. n8n / Gumloop principle (dropped)

The canonical prompt includes a short principle: prefer scripted, auditable pipelines over hosted no-code automation (n8n, Gumloop, Zapier) when the artifact must be reproducible from source. The condensed embed dropped this line. The harvest pipeline is stdlib-only Python, which is consistent with the principle.

---

## Gates: faithful

All three safety gates carry identical wording between canonical and embed:

- **HARM** — any row flagged as physical harm halts the shard and summons triage.
- **FLICKER** — perceptible flicker in photic material halts the shard.
- **OCULAR** — ocular-risk material halts the shard.

The embedded WR-4200 clause — *a fabricated citation is a P0 incident* — is preserved and is enforced by `tools/harvest.py` (every URL originates from an API response; none are constructed).

---

## Verdict

Drift is **condensation-only**. No behavior gap at runtime. Canonical `.md` files remain source of truth. No action required beyond this report.
