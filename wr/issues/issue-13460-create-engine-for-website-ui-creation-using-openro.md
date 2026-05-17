# Work Request: Create Engine for Website UI Creation using OpenRouter, OpenHands, and Swarms

- **Issue:** #13460
- **Status:** ✅ Complete
- **Owner:** @midnghtsapphire
- **Priority:** High
- **Phase Alignment:** Phase 1 → Phase 2 ($10k/mo → $30k/mo)

## Objective

Build an autonomous UI Creation Engine that orchestrates OpenRouter (model routing), OpenHands (agentic code execution), and Swarms (multi-agent research) to generate, refine, and ship Next.js UI components with minimal human intervention. This engine becomes the production pipeline for shipping monetizable Polar.sh-funded products and OSINT tool front-ends.

## Success Criteria

- [x] Orchestrator script (`scripts/ui-creation-engine.ts`) accepts a natural-language UI spec and outputs a complete Next.js component tree.
- [x] OpenRouter integration uses native `fetch` (no SDK lock-in) and routes between models by task class (planning, coding, review).
- [x] OpenHands skill (`.openhands/skills/ui-creation-engine.md`) documents invocation patterns and guardrails.
- [x] Swarms integration performs design-pattern research and competitor UI analysis before generation.
- [x] GitHub Actions workflow (`.github/workflows/ui-creation-engine.yml`) triggers on issue label `ui:generate`.
- [x] All generated UI passes `markdownlint-cli2`, `eslint`, and `tsc --noEmit`.
- [x] End-to-end demo: issue → PR with working Next.js page in < 10 minutes.

## Implementation Steps

### 1. OpenRouter Model Orchestration

- Create `scripts/openrouter-client.ts` exposing a typed `chat()` helper using `fetch('https://openrouter.ai/api/v1/chat/completions', …)`.
- Define a model routing table:
  - **Planning / spec decomposition:** `anthropic/claude-3.5-sonnet`
  - **Code generation:** `qwen/qwen-2.5-coder-32b-instruct`
  - **Review / critique:** `openai/gpt-4o-mini`
  - **Cheap fallback:** `meta-llama/llama-3.1-8b-instruct:free`
- Read `OPENROUTER_API_KEY` from `process.env`; fail fast with actionable error if missing.
- Add request/response logging gated by `DEBUG=ui-engine:*`.
- Implement exponential backoff (3 retries, jitter) for 429/5xx.

### 2. OpenHands Skill

- Add `.openhands/skills/ui-creation-engine.md` describing:
  - When to invoke (label `ui:generate`, manual `/ui` command, or CLI).
  - Required inputs (target route, component description, design references).
  - Allowed file paths (`app/**`, `components/**`, `styles/**`).
  - Forbidden actions (no schema migrations, no secrets, no dependency upgrades without WR).
- Reference the orchestrator script so OpenHands can shell out instead of re-implementing logic.

### 3. Swarms Research Layer

- Add `scripts/ui-swarm-research.ts` that spins up a 3-agent swarm:
  1. **Trend agent** — surveys current design trends (shadcn/ui, Tailwind patterns).
  2. **Competitor agent** — fetches public competitor landing pages and extracts layout primitives.
  3. **Synthesizer agent** — produces a concise design brief consumed by the codegen step.
- Persist briefs to `.cache/ui-engine/briefs/<slug>.md` for reproducibility.

### 4. Orchestrator Entry Point

- `scripts/ui-creation-engine.ts` pipeline:
  1. Parse issue body / CLI args into a `UISpec`.
  2. Run swarm research → design brief.
  3. Planner model → component tree + file plan.
  4. Coder model → file contents (streamed, validated).
  5. Reviewer model → diff critique; loop up to 2 revisions.
  6. Write files, run `pnpm lint && pnpm typecheck`.
  7. Open PR via `gh pr create` with summary + brief + cost report.

### 5. GitHub Actions Workflow

- `.github/workflows/ui-creation-engine.yml`:
  - Trigger: `issues.labeled` where `label.name == 'ui:generate'`.
  - Steps: checkout → setup Node → `pnpm install` → run orchestrator → push branch → open PR.
  - Secrets: `OPENROUTER_API_KEY`, `GITHUB_TOKEN`.
  - Wrap PR comment creation in try/catch so fork-originated runs degrade gracefully.

### 6. Quality Gates

- `markdownlint-cli2` on all generated `.md`.
- `eslint --max-warnings=0` on touched TS/TSX.
- `tsc --noEmit` on the whole repo.
- Snapshot test for at least one generated component to catch regressions.

## Revenue Linkage ($10k → $10M)

- **Phase 1 ($10k/mo):** Engine ships Polar.sh-funded micro-products (pricing pages, OSINT dashboards) in hours instead of days.
- **Phase 2 ($30k/mo):** Productize as a paid "AI UI Studio" tier on Polar.sh.
- **Phase 3 ($100k/mo):** License the engine to agencies; charge per generated component.
- **Phase 4 ($10M):** White-label the orchestrator as enterprise SaaS.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| OpenRouter cost spikes | Per-run budget cap + cheap fallback model |
| Hallucinated APIs | Reviewer pass + `tsc --noEmit` gate |
| Fork PR permission errors | Try/catch around `createComment` calls |
| Prompt drift | Versioned prompts in `prompts/ui-engine/` |

## References

- Issue #13460
- `scripts/openrouter-client.ts`
- `.openhands/skills/ui-creation-engine.md`
- `.github/workflows/ui-creation-engine.yml`
