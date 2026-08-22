# PedalToTheMetal — Enterprise oAudrey inventory

**Status:** Inventory only. Not a ship, not a product, not a second pipeline.  
**Home:** this repo (`midnghtsapphire/revvel-standards`). Do not stand up a second findings repo.  
**WR:** [#17892](https://github.com/midnghtsapphire/revvel-standards/issues/17892)

This page maps enterprise oAudrey / near-metal *intent* onto files that already exist.
It does not add a fleet controller, engine, schema, workflow, or secret.

If two docs conflict: [`MASTER.md`](../MASTER.md) wins process order;
[`START_HERE_CALL_CHAIN.md`](../START_HERE_CALL_CHAIN.md) wins “what file runs next.”

---

## What already runs (do not fork)

The designed call chain is in `START_HERE_CALL_CHAIN.md`:

```text
[WR] issue
  → openrouter-assignee.yml
  → research-engine.yml
  → wr-pr-creation.yml
  → openrouter-coder.yml   (needs wr:code | spec-approved)
  → CI
  → ship-to-market.yml     (deliver:*)
```

Handoff labels already exist: `research:complete` / `wr:research-complete` after research;
`wr:code` or `spec-approved` to start the coder. Missing `wr:code` is why WRs stall as essays
(see `#15507` in `START_HERE_CALL_CHAIN.md`). There is no `spec-to-action-bridge.yml` in
`.github/workflows/` (verified absent). Do not add an `issues: opened` workflow to paper over that.

---

## Verified file map

Paths below were checked on this tree. Quote these; do not invent siblings.

### Call chain and process

| Path | What it is |
| --- | --- |
| `START_HERE_CALL_CHAIN.md` | Issue → research → code → ship |
| `MASTER.md` | Process order / conflict rule |
| `engines/CONTRACT.md` | Orchestrator / engine / runner contract |
| `engines/runner-orchestrator/orchestrate.js` | Local `npm run engine` dispatcher (research + deliver only) |
| `.github/workflows/revvel-engine-spine.yml` | Additive dispatch of that CLI (dry-run by default) |
| `schemas/state.schema.json` | Execution state (draft-2020-12) |
| `schemas/agent-contract.schema.json` | Host Grid / Block / Thread contract |
| `standards/DELIVERY_MATRIX.md` | What `ship-to-market.yml` ships after merge |

### oAudrey (the product this structure serves)

| Path | What it is |
| --- | --- |
| `oaudrey/README.md` | Hub operating model, tabs, DigitalOcean deploy |
| `standards/OAUDREY_DEPLOYMENT_STANDARD.md` | Deploy + DNS + BOM |
| `.github/workflows/deploy-oaudrey.yml` | App Platform deploy |
| `.github/workflows/sync-oaudrey-dns.yml` | DNS sync from `oaudrey/dns-records.yml` |

### OpenRouter (existing, not a new lane)

| Path | What it is |
| --- | --- |
| `.github/workflows/openrouter-assignee.yml` | First-line assign + labels |
| `.github/workflows/openrouter-triage.yml` | Triage |
| `.github/workflows/openrouter-coder.yml` | Implementation PR when `wr:code` or `spec-approved` |
| `scripts/openrouter-triage.js` | Keyed + keyless fallback |
| `scripts/openrouter-routing.js` | Model routing |

Other `scripts/openrouter-*.js` files on this tree: `openrouter-backup-review.js`,
`openrouter-personas.js`, `openrouter-personas-example.js`, `openrouter-routing-eval.js`,
`openrouter-routing-example.js`.

### GOAP (existing planner, not a new swarm)

| Path | What it is |
| --- | --- |
| `GOAP.md` | Goap hub / goals index |
| `GOAP_AGENT_PROMPT.md` | Goap prompt |
| `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` | Agent standard |
| `standards/GOAP_SWARM_RULES.md` | Production-safe swarm rules |
| `products/goap-swarm-console/` | Console product |
| `.github/workflows/goap-assignment-router.yml` | Assignment router |

### Fleet (do not replace)

| Path | What it is |
| --- | --- |
| `.github/workflows/fleet-controller.yml` | Grid scheduler — leave as-is |
| `standards/CONTROLLER_CHARTER.md` | What the controller may and may not do |
| `.github/workflows/spec-approval-gate.yml` | Spec approval gate |

WR/PR automation on the same chain: `.github/workflows/research-engine.yml`,
`.github/workflows/wr-pr-creation.yml`, `.github/workflows/ship-to-market.yml`.

---

## Who owns what (roles, not new bots)

| Role | Owns | Does not own |
| --- | --- | --- |
| This page | A map of existing files | Runtime, labels, deploy, secrets |
| Existing call-chain workflows | WR → research → code → ship | A second ignition path |
| `fleet-controller.yml` | Scheduling / preemption | Craft work, new pipelines |

WR #17892 names NoseyNoodle (swarm dispatch) and PipelineWarden (WR/PR automation).
Those names are not files in this repo. Dispatch and WR/PR automation stay on the
paths in the tables above.

---

## Explicitly out of scope

- A second fleet controller or a fork of `fleet-controller.yml`
- A PedalToTheMetal engine, schema, findings catalog, or `scripts/pedal-to-the-metal/`
- A new `OUTPUT_TYPE` or `DELIVERY_MATRIX` row
- A new `.github/workflows` trigger on `issues: opened`
- New secrets
- Treating Vercel (or any preview URL) as a ship
- A second home such as `midnghtsapphire/revvel-metal-findings`

Honesty: **CAN-PARTIAL** — inventory of verified paths only. No runtime attached.
