# Cutover plan: METAL / HULL deterministic stack

**14 Nov 2026 (America/Denver). Draft for Audrey. Plan only: this document changes no workflow, runner, permission or deploy.**
Audrey asked (t395u): "Generate new rules and rename that file and we cutover and use the cuda deterministic search et al?"
Step 0 of that request is [`RULES.md`](../RULES.md) plus the rename into [`legacy/`](../legacy/README.md). Everything below is the rest, written only from what exists today.

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

**Answer to "the cuda deterministic search":** I found nothing built that matches it. The closest real things are HULL's exact skill lookup (CPU, Rust, small), two CUDA-named Python files that are not search, and GPU-determinism research notes. If she meant something stored outside GitHub, it needs to be pointed out. Until then it is on the BOM (section 4), and G7 in `RULES.md` stops anyone calling anything "deterministic search" without a test.

## 2. Phases

Each phase ends only when its receipts land in the same commit (C7). Phases 1 to 5 each need Audrey's yes before they start (A2, B5).

**Phase 0 (this PR).** `RULES.md`, `legacy/` rename, pointer files, a short PR template. No runtime change. Audrey merges.

**Phase 1: finish the single rulebook.** Move the remaining rule-bearing files that still disagree with `RULES.md` into `legacy/` the same way (rename, pointer left behind): `seed.md`, `UPREV_METHOD.md`, `GOAP*.md`, `COMPLIANCE_RUBRIC.md` (and update `scripts/check-compliance.js`, which scores repos on files that do not exist), and the conflicting domain files in `standards/` (for example `AUTOMATION_FIRST_STACK.md`, `COMMENT-DONT-DELETE.md`, `SEARCH_AND_SOURCING.md`). Add a CircleCI check that every rule file links to a `RULES.md` ID. That is a CI-config change, so it needs her yes (B5). Rotation list: see the PR description (file:line only).

**Phase 2: put HULL on the main line.** In `oaudrey`: promote `daily/2026-11-05` to `main` (her yes), install `structlog`, run both test suites in CircleCI (not hosted Actions, E1). Fix the `HashMap` list order and add a same-input-same-output test (G2, G7). Then make HULL the lookup behind this repo's skill index: generate `skills/REGISTRY.md` and `SKILLS_INDEX.yml` from the filesystem, which fixes the current drift (8 and 10 skills missing). That is the first real "deterministic search".

**Phase 3: define and build deterministic search on CPU first.** Write a short spec: what is searched (skills, WRs, rules, case-file indexes), exact-match plus indexed full-text, a fixed result order, golden tests. Build it in HULL. SearchCrew (pull-only vendor APIs, MySQL FULLTEXT, append-only libraries) starts only after she green-lights it in her own words.

**Phase 4: GPU / CUDA, only if a benchmark says so.** Needs a CPU baseline from phase 3, a GPU host, and Audrey naming what GPU search should do. Candidates from `revvel-metal-findings` are research only, not adopted. Credits or hardware need her yes first (E3).

**Phase 5: flip.** Agents are called through CLI or MCP only (G1, G3), using the inverted-twin interface contracts in `oaudrey` (`governance/METAL/inverted-twin-cli-mcp.md`). Automation and production leave the bot box (E2) once the CI home is decided (section 3, question 1).

## 3. Questions only Audrey can answer

1. **Where does CI and automation run?** `RULES.md` E1 and E2 say GitHub plus CircleCI, never hosted runners, never the bot box (E2 is a DEFAULT). The METAL docs say "own runners, own Actions, own Docker images on Audrey's hardware, no GitHub-hosted anything", and they say no laptop-bound agent compute. These agree only if "GitHub" means repos and PRs, and the runners are hers. Which is it?
2. What is "the CUDA deterministic search"? Point me at the files, or confirm it is not built yet.
3. No tracking or affiliate code unless she asks (F2 is a DEFAULT). Several older standards make affiliate links mandatory. Retire them?
4. How does `daily/*` get promoted to `main`? It is not written down, and open PRs still target `main` (C2).
5. Which single secret store is the approved one (E4)? The old files name five.
6. Does she want `legacy/` as the name, and a second sweep (phase 1)?
7. PRs #18404 and #18406 edit files this PR moves. Close them as superseded (their rules are in RULES.md as B7, B10, C4, C5, D3, E2), or merge them first?

## 4. BOM: what is missing ("Audrey to get")

Format follows `docs/Universal-BOM_List/`: what, why, which WR or PR, free or paid, link.

| What | Why | WR / PR | Free or paid | Link |
| --- | --- | --- | --- | --- |
| The CUDA deterministic search code or spec | Nothing found on GitHub; phases 3 and 4 wait on it | this WR | n/a | Audrey to point at it |
| Aegis-Rust and the Rust/Python hybrid materials | The "less-wordy METAL rewrite" cannot be built from what is in GitHub | this WR | n/a | Audrey to point at them |
| GPU host (or a decision that it is not needed) | Phase 4 | this WR | paid, unknown | none chosen |
| Self-hosted runner hardware, or the decision to use CircleCI only | Phase 2 CI; question 3.1 | this WR | free if her own hardware | `oaudrey` `scripts/CI.md` |
| `structlog` installed where the HULL Python tests run | One test cannot run on the box | this WR | free | PyPI `structlog` |
| Green-light to promote HULL code to `oaudrey` `main` | The built code is only on `daily/2026-11-05` | this WR | free | `midnghtsapphire/oaudrey` |
| SearchCrew green-light and a database host | The plan is locked and waits for her words | this WR | free (MySQL) | `oaudrey` `daily/2026-11-05/cutting-edge-search-options.md` |
| Rotation of the credentials listed in the PR description | Plaintext credentials sit in a public repo | this WR | free | PR description, file:line only |
| A named approved secret store | Five are documented | this WR | unknown | n/a |

Nothing here fails the WR or the PR (C4).
