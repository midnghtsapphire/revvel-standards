# START HERE — Call Chain (what starts → what runs next)

> **Owner bookmark.** Open this file when you are busy and do not want to hunt folders.
> **Agents:** Read this before changing automation. Do not invent a second pipeline.

**Longer map:** [`docs/process/SYSTEM_MAP.md`](docs/process/SYSTEM_MAP.md)  
**Simple HTML:** [`docs/process/how-it-works.html`](docs/process/how-it-works.html)  
**Engine rules:** [`engines/CONTRACT.md`](engines/CONTRACT.md)  
**What ships after merge:** [`standards/DELIVERY_MATRIX.md`](standards/DELIVERY_MATRIX.md)

---

## Plain words (no shame)

| Word | Means |
| --- | --- |
| **Workflow** | A YAML recipe under `.github/workflows/` that GitHub runs when something happens |
| **Runner (GitHub)** | The machine that runs the job — usually `runs-on: ubuntu-latest` |
| **Runner (our engines)** | Anything that does a real action outside prose: Vercel, n8n, Gumloop, npm, browser |
| **Engine** | Code that researches / prepares / decides (e.g. research script) |
| **Orchestrator** | Traffic cop that routes work; should not do craft work itself |

---

## Human start (only thing you must do)

1. Open a **GitHub Issue** titled: **`[WR] <what you want>`**
2. Optionally fill Work Request form fields (output type, etc.)

That **issue open** is the ignition key. Everything below is automatic (when healthy).

---

## Designed call chain (forward)

```text
YOU open Issue  [WR] …
        │
        │  (several workflows wake at once on "opened")
        ▼
┌────────────────────────────────────────────────────────────┐
│  PARALLEL INTAKE (same event)                              │
├────────────────────────────────────────────────────────────┤
│  .github/workflows/openrouter-assignee.yml                 │
│     → assign first line of sight (@oaudrey / OpenRouter)   │
│     → labels: openrouter, role:orchestrator, …             │
│                                                            │
│  .github/workflows/wr-auto-classify.yml                    │
│     → Project v2 board fields (needs PROJECTS_PAT)         │
│                                                            │
│  .github/workflows/research-engine.yml                     │
│     → multi-lane research packet                           │
│     → docs/research-engine/…                               │
│     → labels research:complete / wr:research-complete      │
│                                                            │
│  .github/workflows/wr-pr-creation.yml                      │
│     → wr/issues/issue-NNNN-….md                            │
│     → opens WR skeleton Pull Request                       │
│                                                            │
│  .github/workflows/agent-fallback.yml  (sometimes)         │
│     → if wr:code / wr:auto / agent-fallback                │
└────────────────────────────────────────────────────────────┘
        │
        │  Label: wr:code  OR  spec-approved
        │  (THIS STEP OFTEN MISSING — products stall as WR essays)
        ▼
.github/workflows/openrouter-coder.yml
        → checkout repo → code model → implementation PR
        │
        ▼
CI + review on the PR
        → CircleCI (.circleci/config.yml)  — npm test + md lint
        → wr-lint.yml → wr/scripts/wr-lint.mjs
        → ship-quality.yml, CodeQL, Semgrep, GitGuardian, …
        → pr-state-orchestrator.yml  — lifecycle labels
        → trusted-bot-auto-approve.yml — trusted bots when green
        │
        ▼
PR merged to main
        │
        ▼
.github/workflows/ship-to-market.yml
        → reads deliver:* labels
        → pdf | app | cli | api | mcp | video | …
        → live URL / buy link / release  = DONE
```

---

## Step table (file → next)

| Step | What happens | Starts in | Calls next |
| ---: | --- | --- | --- |
| 0 | You file work | **GitHub Issue `[WR]…`** | event `issues: opened` |
| 1 | Route / assign | `openrouter-assignee.yml` | labels + comment |
| 2 | Board classify | `wr-auto-classify.yml` | Project v2 API |
| 3 | Research | `research-engine.yml` | research lanes → packet + labels |
| 4 | WR document PR | `wr-pr-creation.yml` | `wr/issues/….md` + PR |
| 5 | **Code** | `openrouter-coder.yml` | needs label **`wr:code`** or **`spec-approved`** |
| 6 | Tests / lint | CircleCI + GHA | red = do not trust “ship quality” alone |
| 7 | Merge path | `pr-state-orchestrator.yml` + `trusted-bot-auto-approve.yml` | approve / auto-merge |
| 8 | Ship | `ship-to-market.yml` | needs **`deliver:*`** on merged PR |
| Heal | Stuck WR | `stuck-wr-detector.yml` | re-dispatch `wr-pr-creation.yml` (capped) |

---

## Optional local path (not the issue path)

| Start | File |
| --- | --- |
| `npm run engine` | `engines/runner-orchestrator/orchestrate.js` |
| Rules | `engines/CONTRACT.md` |
| State schema | `schemas/state.schema.json` |

Orchestrator → engines → runners (external platforms). Missing access → **BOM.md**, not a silent lie.

---

## Three layers (pin this)

```text
ORCHESTRATOR   "Who goes next?"
               engines/runner-orchestrator/orchestrate.js
               openrouter-assignee.yml

ENGINES        "Think + prepare"
               research-engine.yml / scripts
               openrouter-coder.yml

RUNNERS        "Do it for real"
               ubuntu-latest (Actions machine)
               Vercel, n8n, Gumloop, npm, browser, …
```

---

## Why products often stop short of live

```text
Research + WR PR     ✅ often happens (steps 1–4)
Coder + deliver:*    ❌ often never (step 5–8)
```

**Missing handoff:** after research, someone/something must apply **`wr:code`** (or **`spec-approved`**) and eventually **`deliver:*`**.  
That gap is tracked as the **spec-to-action bridge** (issue #15507).

**Do not trust:** Ship Quality “PASS” if CircleCI / `npm test` / wr-lint are red.

---

## Honesty rule (first responders)

Before claiming work is done, state one of:

| Status | Meaning |
| --- | --- |
| **CAN** | Verified tool + key + playbook |
| **CAN-PARTIAL** | Missing one named piece → open blocker |
| **CANNOT** | Say cannot + nearest alternative from inventory |
| **UNKNOWN** | Check inventory first — never guess |

Receipt required: URL, PR, file path, or test run — not vibes.

---

## Where to change color (blue vs pink) so you do not random-edit

| You want to change… | Prefer this place |
| --- | --- |
| Brand / site look | `products/<app>/` or site CSS/theme there — not random root |
| WR pipeline / labels | `.github/workflows/` listed above + `MASTER.md` order |
| Agent instructions | `AGENTS.md`, this file, `VISITING_AGENTS.md` |
| Connections / keys map | `config/connections.yml` then `npm run connections` |
| PDF product shape | `standards/shapes/PDF.md` |
| Delivery after merge | `standards/DELIVERY_MATRIX.md` + `ship-to-market.yml` |
| System of record order | `MASTER.md` |

If two docs conflict: **`MASTER.md` ordering wins** for process; **this file wins** for “what file runs next.”

---

## Healers (if stuck)

| File | Job |
| --- | --- |
| `stuck-wr-detector.yml` | WR with no PR → retrigger creation |
| `stuck-label-watchdog.yml` / `stuck-check-watchdog.yml` | stuck labels/checks |
| `agent-fallback.yml` | OpenRouter → OpenHands → human |
| `npm run automation:doctor` | `scripts/automation-doctor.js` |

---

## Related root files (do not scatter)

| File | Role |
| --- | --- |
| **START_HERE_CALL_CHAIN.md** (this file) | Call chain — start here when busy |
| `MASTER.md` | Process order / conflict rule |
| `AGENTS.md` | Agent behavior + prime directive |
| `GOAL.md` | Revenue targets |
| `SYSTEM_STATE.md` | Infra status (update at session end) |
| `REMINDERS.md` | “If you’re about to do X, read Y” |

---

_Last intent: stop hunting folders; one root file for start → next. Detail lives in SYSTEM_MAP._

---

## Amazon order CSV upload (live URL)

**Do not use the hub homepage for uploads.** Use:

- <https://revvel-standards.vercel.app/docs/vine-orders/>
- or <https://revvel-standards.vercel.app/vine-orders.html>

That page accepts your CSV in the browser. The main Vercel site only shows docs/folders.

---

## Simple Marketplace Relister (Vercel — no local hoops)

App code: `docs/marketplace-relister`  
Deploy as its **own** Vercel project (Root Directory = `docs/marketplace-relister`).  
Set `OPENROUTER_API_KEY` once in Vercel. Bookmark that app URL only.

## Family Order Packs (private Vercel)

Code: `docs/marketplace-relister`.
Deploy once on Vercel (Root Directory = that folder). Env: `OPENROUTER_API_KEY` + `FAMILY_APP_PASSWORD`.
Daily use: one bookmark, upload CSV, Process next 10/25, download packs.
