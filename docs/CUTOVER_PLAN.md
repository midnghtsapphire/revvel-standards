# Cutover plan: METAL / HULL deterministic stack

**14 Nov 2026 (America/Denver). Draft for Audrey.**
Audrey asked (t395u): "Generate new rules and rename that file and we cutover and use the cuda deterministic search et al?"
On 14 Nov 2026 she agreed (t402u) that **`AGENTS.md` itself is the full new rulebook**, not a stub and not a separate `RULES.md`. Codex, Cursor, Copilot's coding agent and most other tools already auto-load `AGENTS.md`. `RULES.md` existed only in an earlier revision of this draft PR and never landed on `main`; its content was folded into `AGENTS.md` and `RULES.md` was removed from the PR. Nothing that was on `main` was deleted. The old `AGENTS.md` text is kept, unedited, at `legacy/AGENTS.md`.

**Promotion:** the new `AGENTS.md`, the `legacy/` rename, and the remaining pointer stubs take effect on `main` only when they land together, in the same promotion. Until then, `main` still has the previous `AGENTS.md`, and stubs on this branch would have no matching new rulebook on `main`.

`CLAUDE.md` is the single Claude Code import line `@AGENTS.md`. `.github/copilot-instructions.md` is a generated exact copy of `AGENTS.md` (no symlinks: they break on Windows). `scripts/check_rules_sync.sh` plus a new step in the CircleCI `lint-and-test` job fail if the two differ. **That CircleCI step is a CI-config change and needs Audrey's yes (B5).** Other pointer stubs say in one line that `AGENTS.md` is the rulebook and repeat the core rules inline.

Step 0 of the original request is now this `AGENTS.md` cutover plus the rename into [`legacy/`](../legacy/README.md). Everything below is the rest, written only from what exists today.

## 1. What actually exists (read-only check, 14 Nov 2026)

Status words: **built** (code runs and has passing tests I ran or a doc shows), **partial**, **spec only**, **missing**.

| Item | Where | Status | Receipt |
| --- | --- | --- | --- |
| HULL Rust kernel (skill registry, handoffs, token budget, audit ledger, runtime) | private `midnghtsapphire/oaudrey`, branch `daily/2026-11-05` (HEAD `6f1a28a`, 11 Nov 2026), `crates/hull-core`, `hull-skills`, `hull-llm` | **built, small, not on `main`** | `cargo test --workspace` on 14 Nov: 9 passed in `hull-core`, 2 in `hull-skills`, 0 in `hull-llm` |
| HULL Python orchestration shell (router, handoff, local execution) | same branch, `orchestrator/metal_orchestrator/` | **built, test not re-run** | `test_local_execution.py` needs `structlog`, which is not installed on the box (a box gap, not a repo failure) |
| oaudrey `main` (80b9632, 12 Nov) | same repo | **spec only**: METAL governance, architect-fleet plan, inverted-twin plan, SearchCrew plan. No code | its own docs say "plan only, no bots, runners or workflows" |
| HULL used from this repo | `scripts/wr_langgraph.py`, `wr/summaries/hull-lifecycle-adapter-2026-11-10.md` | **partial**: opt-in adapter that calls HULL's `SkillRouter` through `HULL_SOURCE`; not wired into any default path | the doc reports 11 local tests on 10 Nov (not re-run here); "HULL is a trusted operator runner, not an untrusted-code sandbox" |
| "Deterministic search" in HULL | `crates/hull-core/src/skill.rs` | **partial**: exact lookup of a skill by name (`get`), manifest parsing, checksum, config resolution. It is not a text or document search engine. Note: `list()` iterates a `HashMap`, so list order is not stable. The Python router sorts its directory listing | one unit test (`register_and_lookup`); no same-input-same-output test |
| CUDA / GPU deterministic search | nowhere | **missing** | no CUDA code in `oaudrey`; GitHub code search for FAISS, Aegis-Rust and rust-python-hybrid across the account found nothing relevant |
| Things named "CUDA" | `scripts/python_cuda/` and `skills/probabilistic-orchestration` | **built, but not search**: a Python validator for LLM output, named after a CUDA analogy (grid, block, warp) | WR #16972, `tests/probabilistic-ai-validator.test.js` |
| | `products/ai-architecture-framework/cuda_mlops_wrapper.py` | **built, but not search**: runs `nvidia-smi`, falls back to CPU | no GPU is used for search |
| GPU determinism research | public `midnghtsapphire/revvel-metal-findings`, `lanes/01-deterministic-ai` | **research, status "watching"** (vLLM batch-invariance, CoRun, bit-exact LLM): outside papers and projects, nothing adopted | each finding is tagged CAN-PARTIAL or similar |
| SearchCrew (pull-only research library, MySQL FULLTEXT) | `oaudrey` `main`, `daily/2026-11-05/cutting-edge-search-options.md`; private `searchcrew-library` | **spec only**: decision locked on Option B, no bots until Audrey says go; `searchcrew-library` holds a README | the plan says "plan only, no bots created" |
| Self-hosted METAL CI (own runners, own Docker images) | `oaudrey` `scripts/CI.md`, `governance/METAL/ci-docker-runners-principles.md` | **spec only**: "when ready"; no runner is set up | no runner, image or workflow exists |
| Rust/Python hybrid and Aegis-Rust materials, "less-wordy METAL rewrite" | none found in any GitHub repo | **missing from GitHub**; may be local files | needs Audrey to point at them |

**Answer to "the cuda deterministic search":** I found nothing built that matches it. The closest real things are HULL's exact skill lookup (CPU, Rust, small), two CUDA-named Python files that are not search, and GPU-determinism research notes. If she meant something stored outside GitHub, it needs to be pointed out. Until then it is on the BOM (section 4), and G7 in `AGENTS.md` stops anyone calling anything "deterministic search" without a test.

NoseyNoodle and Fleet-Orchestrator (Discussion #18238, 14 Nov 2026) independently confirmed the same picture and added these paths, which I have not re-cloned here: `oaudrey` `governance/METAL/` and `Library/references/hull-naming-2026-11-05.md`; public `revvel-metal-findings` `lanes/01-deterministic-ai/`; `GIT-FLEET` `members/metal/`; `oaudrey-bernstein-deterministic-factory`; and cold-case search prompts in private `Freedom-Angel-Corp/brain-dump` under `imports/2026-11-04-caresse/Desktop-brain-dump/` (named as a path only). They also found no CUDA deterministic-search engine.

## 2. Phases

Each phase ends only when its receipts land in the same commit (C7). Phases 1 to 5 each need Audrey's yes before they start (A2, B5).

**Phase 0 (this PR).** New `AGENTS.md` rulebook (old text in `legacy/AGENTS.md`), `legacy/` rename of the other old rule files, pointer stubs with inline core rules, `CLAUDE.md` as `@AGENTS.md`, a generated copy of `AGENTS.md` at `.github/copilot-instructions.md`, `scripts/check_rules_sync.sh`, a CircleCI `lint-and-test` step that fails if those two files differ (needs Audrey's yes), a short PR template, script/test updates so `context_graph` and `project-router` keep working, and `docs/cutover/reference-inventory.md`. Audrey merges.

**Phase 1: finish the single rulebook.** Move the remaining rule-bearing files that still disagree with `AGENTS.md` into `legacy/` the same way (rename, pointer left behind): `seed.md`, `UPREV_METHOD.md`, `GOAP*.md`, `COMPLIANCE_RUBRIC.md` (and update `scripts/check-compliance.js`, which scores repos on files that do not exist), and the conflicting domain files in `standards/` (for example `AUTOMATION_FIRST_STACK.md`, `COMMENT-DONT-DELETE.md`, `SEARCH_AND_SOURCING.md`). About 400 files still cite `AGENTS.md` or `VISITING_AGENTS.md` sections (including CircleCI's comment citing `VISITING_AGENTS.md` section 1b). This PR does not change other CI config or workflows. Section anchors that CircleCI and common docs use are kept resolvable in the `VISITING_AGENTS.md` and `docs/AGENTS.md` stubs, with a mapping table in `legacy/README.md`. Remaining section citations are listed in `docs/cutover/reference-inventory.md` and are a Phase 1 item; updating those cites, or adding a CircleCI check that every rule file links to an `AGENTS.md` ID, is a later CI or docs change and needs her yes (B5). Rotation list: see the PR description (file:line only).

**Phase 2: put HULL on the main line.** In `oaudrey`: promote `daily/2026-11-05` to `main` (her yes), install `structlog`, run both test suites in CircleCI (not hosted Actions, E1). Fix the `HashMap` list order and add a same-input-same-output test (G2, G7). Then make HULL the lookup behind this repo's skill index: generate `skills/REGISTRY.md` and `SKILLS_INDEX.yml` from the filesystem, which fixes the current drift (8 and 10 skills missing). That is the first real "deterministic search".

**Phase 3: define and build deterministic search on CPU first.** Write a short spec: what is searched (skills, WRs, rules, case-file indexes), exact-match plus indexed full-text, a fixed result order, golden tests. Build it in HULL. SearchCrew (pull-only vendor APIs, MySQL FULLTEXT, append-only libraries) starts only after she green-lights it in her own words. The design basis, golden-test bar, and Phase A/B split are now in section 6 and [`docs/specs/DETERMINISTIC_SEARCH_SPEC.md`](specs/DETERMINISTIC_SEARCH_SPEC.md) (Audrey said go, t412u, 14 Nov 2026).

**Phase 4: GPU / CUDA, only if a benchmark says so.** Needs a CPU baseline from phase 3, a GPU host, and Audrey naming what GPU search should do. Candidates from `revvel-metal-findings` are research only, not adopted. Credits or hardware need her yes first (E3). Routing, dry-run default, and "GPU results must match the CPU goldens" are in section 6 and the same spec.

**Phase 5: flip.** Agents are called through CLI or MCP only (G1, G3), using the inverted-twin interface contracts in `oaudrey` (`governance/METAL/inverted-twin-cli-mcp.md`). Automation and production leave the bot box (E2) once the CI home is decided (section 3, question 1).

## 3. Questions only Audrey can answer

1. **Where does CI and automation run?** `AGENTS.md` E1 and E2 say GitHub plus CircleCI, never hosted runners, never the bot box (E2 is a DEFAULT). The METAL docs say "own runners, own Actions, own Docker images on Audrey's hardware, no GitHub-hosted anything", and they say no laptop-bound agent compute. These agree only if "GitHub" means repos and PRs, and the runners are hers. Which is it?
2. What is "the CUDA deterministic search"? Point me at the files, or confirm it is not built yet.
3. No tracking or affiliate code unless she asks (F2 is a DEFAULT). Several older standards make affiliate links mandatory. Retire them?
4. How does `daily/*` get promoted to `main`? It is not written down, and open PRs still target `main` (C2).
5. Which single secret store is the approved one (E4)? The old files name five.
6. Does she want `legacy/` as the name, and a second sweep (phase 1)?
7. PRs #18404 and #18406 edit files this PR moves. Close them as superseded (their rules are in AGENTS.md as B7, B10, C4, C5, D3, E2), or merge them first?

## 4. BOM: what is missing ("Audrey to get")

Format follows `docs/Universal-BOM_List/`: what, why, which WR or PR, free or paid, link.

| What | Why | WR / PR | Free or paid | Link |
| --- | --- | --- | --- | --- |
| Deterministic search implementation (Phase A, CPU) | Spec now exists; the engine is still unbuilt | later WR / this cutover | free | [`docs/specs/DETERMINISTIC_SEARCH_SPEC.md`](specs/DETERMINISTIC_SEARCH_SPEC.md) |
| Backup of Audrey's local cv-cuda repo to GitHub | `PROJECT_PLAN.md` and `README.md` in the "cv cuda in fedora" notebook look like a local tree that is not on GitHub | this cutover (BOM) | free | Audrey to point at the path |
| Aegis-Rust and the Rust/Python hybrid materials | The "less-wordy METAL rewrite" cannot be built from what is in GitHub | this WR | n/a | Audrey to point at them |
| GPU host (or a decision that it is not needed) | Phase 4 | this WR | paid, unknown | none chosen |
| Self-hosted runner hardware, or the decision to use CircleCI only | Phase 2 CI; question 3.1 | this WR | free if her own hardware | `oaudrey` `scripts/CI.md` |
| `structlog` installed where the HULL Python tests run | One test cannot run on the box | this WR | free | PyPI `structlog` |
| Green-light to promote HULL code to `oaudrey` `main` | The built code is only on `daily/2026-11-05` | this WR | free | `midnghtsapphire/oaudrey` |
| SearchCrew green-light and a database host | The plan is locked and waits for her words | this WR | free (MySQL) | `oaudrey` `daily/2026-11-05/cutting-edge-search-options.md` |
| Rotation of the credentials listed in the PR description | Plaintext credentials sit in a public repo | this WR | free | PR description, file:line only |
| A named approved secret store | Five are documented | this WR | unknown | n/a |

Nothing here fails the WR or the PR (C4).

## 5. Deterministic flow builds (from Audrey's Aug 2026 NotebookLM notebook, gap check 2026-11-14)

Source: Audrey's NotebookLM notebook "Revvel Standards: Deterministic AST Governance and Monorepo Architecture Analysis" (notes dated around August 11–13, 2026), checked against the repo on 14 Nov 2026 (America/Denver). Full write-up: [`docs/cutover/notebook-gap-check-2026-11-14.md`](cutover/notebook-gap-check-2026-11-14.md).

Audrey said "great" (t406u, 14 Nov 2026) to adding these CPU-first, free builds to the plan. Each gets its own WR and draft PR later, after PR #18409. This section does not change CI config.

The notebook's dashboard figures (393 RPS, 98.85% test success, $179,500 MRR) are **sample output, not data**. Do not seed them into any health snapshot.

The notebook's symlink / `validate-symlinks.js` check is **superseded** by `scripts/check_rules_sync.sh` (Audrey approved the CircleCI sync check on 14 Nov 2026). No separate symlink check is planned; symlinks break on Windows.

CPU-first, free builds (own WR and draft PR each, later):

1. **Implement Grounding Gates** from the existing pending WR [`wr/pending/14-veins-grounding-gate.md`](../wr/pending/14-veins-grounding-gate.md) (GitHub WR [#15518](https://github.com/midnghtsapphire/revvel-standards/issues/15518), originally filed from that pending file via PR #15497). Compile plus the real test suite must pass before auto-merge or a "PASS / ready to ship" verdict; an LLM opinion may only WARN, never PASS.

2. **A deterministic check that rejects `eslint-disable`, `@ts-ignore`, and empty `catch` blocks.** Stand-in for the never-built `linter-router.js`. CPU-only lint or grep gate, with a short allowlist if needed; no new router framework.

3. **Build the research-to-code kickoff that issue [#15507](https://github.com/midnghtsapphire/revvel-standards/issues/15507) never got.** The issue is closed, but only a WR markdown merged; `wr:code` was never applied and no spec-to-action workflow exists. Label-driven, deterministic kickoff: `research:complete` → actionable coder task list / `wr:code`, plus stuck detection. Prefer templates and repo heuristics over a paid LLM.

## 6. Deterministic search build plan

Audrey said go (t412u, 14 Nov 2026, America/Denver). Full spec: [`docs/specs/DETERMINISTIC_SEARCH_SPEC.md`](specs/DETERMINISTIC_SEARCH_SPEC.md). This section does not change CI config. It refines phases 3 and 4; it does not start the implementation.

**Design basis.** NotebookLM notebook "Pure Deterministic Cognition: A Blueprint for Indexed Meaning Units" ([audit](cutover/notebooks/3c217f5e-2c72-42d0-85d2-56fb9e07e5f8.md)). Meaning units (denota) are built from declared semantic axes, weights and relations, then indexed with audit rules. The pipeline is term/input → axes → score → relations → index → denotum → audit. An LLM may review or suggest, but it is not the engine.

**Caveats, carried forward:** deterministic is not true; indexed is not universal; compression is not complete.

**Phase A (CPU first).** A CPU-only reference implementation with golden tests: same input, same declared rules, and a fixed corpus snapshot must produce a **byte-identical** output and ranking, using a stable sort and declared tie-breaks. A determinism test in CircleCI is added later, under its own WR (CI change, needs her yes). This PR does not add that job.

**Phase B (GPU only behind a benchmark).** After the CPU goldens exist, GPU acceleration may be used only if a benchmark against that baseline shows a real win on a host Audrey has approved. Work is routed by the JIT compute provisioning wrapper (Audrey's three versions, [summary](cutover/notebooks/audrey-pasted-cuda-jit-wrapper-2026-11-14.md); existing [`products/ai-architecture-framework/cuda_mlops_wrapper.py`](../products/ai-architecture-framework/cuda_mlops_wrapper.py)). The wrapper is a hardware picker with CPU fallback, not the search engine, and it is **dry-run by default**. No paid GPU spend without Audrey's yes (E3). GPU results must match the CPU golden outputs.

**Learned rules** from the "cv cuda in fedora" notebook ([audit](cutover/notebooks/e173767c-f730-4a1d-8c52-6633ed0c60a0.md)): allocate the output once and reuse it in loops (the `_into` pattern); warm up and calibrate before claiming latency. In that notebook, "JIT" means kernel-compilation warm-up, not the provisioning wrapper.

**BOM (does not fail this PR):** a GPU host decision, and a GitHub backup of Audrey's local cv-cuda repo once she points at the path. Notebook reports for this plan, including the four CUDA course notebooks and the pasted wrapper summary, are in [`docs/cutover/notebooks/`](cutover/notebooks/README.md). Source PDFs were not copied.
