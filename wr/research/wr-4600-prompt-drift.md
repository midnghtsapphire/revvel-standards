# WR-4600 — Prompt-Drift Report

**Comparison:** canonical WR-4200 system prompt (Drive) vs the condensed
prompt embedded in the shipped `products/wr-4600-photon-bench/` dashboard.

**Urgency:** low. The `.md` files remain source of truth. The dashboard's
embedded prompt is a **presentation artifact**, not the operating contract.

**Verdict:** all safety gates faithful; three structural sections and one
principle were dropped in the condensation.

---

## Faithful (no drift)

- **Fabricated-citation-is-P0** — verbatim in both.
- **Ocular / flicker hard gate** — verbatim.
- **Fluence-window enforcement** — verbatim.
- **Delta-not-breakthrough language** — verbatim.
- **Harm-first ordering** — verbatim.
- **Degrade-never-pad** — verbatim.

---

## Dropped in condensation

### 1. `IDENTITY` section
Canonical WR-4200 opens with an `IDENTITY` block naming the system's role,
scope of authority, and refusal posture. The dashboard prompt jumps straight
to safety gates. Impact: minor — the gates still fire — but a reader of the
dashboard prompt in isolation has no framing for **why**.

### 2. `MODEL ROUTING` section
Canonical prompt specifies which sub-tasks route to which model tier and
when to escalate. The dashboard prompt omits this entirely. Impact: none on
the shipped artifact (single-model rendering), but a re-embed into a
multi-model harness would lose the routing contract silently.

### 3. `INVENTORY` section
Canonical prompt enumerates the tools/data-sources the system may call and
their failure modes. The dashboard prompt shows only the dose engine's
inputs. Impact: none for the dashboard's current scope.

### 4. n8n / Gumloop orchestration principle
Canonical prompt includes the principle: **"prefer declarative workflow
nodes (n8n / Gumloop-style) over imperative glue for anything that must be
auditable by a non-engineer."** Dropped from the dashboard embed. Impact:
low for a static HTML artifact; relevant if the dashboard is later wired to
automations.

---

## Recommendation

No emergency action. When the dashboard prompt is next regenerated, source
it from the canonical `.md` and let the condenser mark dropped sections with
an explicit `# (omitted for dashboard embed: IDENTITY, MODEL ROUTING,
INVENTORY, n8n/Gumloop)` comment, so future drift is visible in diff.

The `.md` files under `wr/` remain the source of truth. This report is the
drift ledger, not a patch.
