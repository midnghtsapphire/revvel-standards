# Deterministic Search Specification

**Status:** spec only. No implementation is in this PR.  
**Date:** 14 Nov 2026 (America/Denver).  
**Authority:** Audrey said go (t412u) to set this up on draft PR #18410. This file does not change CI config.

The engine is not built yet. HULL's exact skill lookup, the CUDA-named hardware wrappers, and the NotebookLM materials are pieces of the same idea that were never joined. This spec is how they join.

## 1. Design basis

Design basis: Audrey's NotebookLM notebook **"Pure Deterministic Cognition: A Blueprint for Indexed Meaning Units"** (https://notebook.google.com/notebook/3c217f5e-2c72-42d0-85d2-56fb9e07e5f8). Audit summary: [`docs/cutover/notebooks/3c217f5e-2c72-42d0-85d2-56fb9e07e5f8.md`](../cutover/notebooks/3c217f5e-2c72-42d0-85d2-56fb9e07e5f8.md). Background reading is in "Foundations of Deterministic and Mathematical Modeling" ([`1317e820-3449-4312-a22d-61b2a489678f.md`](../cutover/notebooks/1317e820-3449-4312-a22d-61b2a489678f.md)).

Pure Deterministic Cognition (PDC) is a rule-bound method, not a neural model. Fixed input plus fixed, declared rules must produce fixed output. It is not based on neural weights, machine learning, LLMs, stochastic generation, or hidden intuition. An LLM may optionally suggest terms, compare meanings, help render language, or adversarially review, but it is not the engine and it is not the final authority.

### Meaning units

A **denotum** (plural: denota) is a compressed, explicit, auditable meaning unit. Meaning units are built from:

- **Declared semantic axes** (the dimensions being scored; names and weights must be declared before use and may vary by domain).
- **Weights** used in a declared scoring rule (the notebook's example axis values are illustrative only, not validated empirical metrics).
- **Relations** (for example near / parent / child / contrast / risk / translation, plus forbidden conflations).
- **Audit rules** that run before a unit is accepted into the index.

The minimal pipeline is:

`term/input → axes → score → relations → index → denotum → audit`

The indexed denotum registry orders units by declared semantic weight. In the source, lower index means greater declared weight, and index zero must be declared as an origin attractor. A denotum should preserve core meaning, distinction, relation, force, risk, boundary, and use. Compression must not mutilate meaning. Revisions require a reason and preserve history.

### Mandatory caveats (carry these forward; do not drop them)

The source warns, and this spec requires the same wording to stay visible in the implementation docs and in any user-facing description:

1. **Deterministic is not true.** A repeatable result can still be wrong.
2. **Indexed is not universal.** An index is a declared ordering in a declared domain, not a claim that the scheme fits every domain.
3. **Compression is not complete.** A denotum is a lossless-enough compression under declared rules, not the whole meaning.

Audit checks called out by the source include frequency collapse, cultural flattening, false objectivity, over-personalisation, poetic drift, technical vagueness, and forbidden conflation. Cultural flattening of domain-specific terms (the source's examples include Tiriti vs a generic "treaty", and Māori concepts such as mana, rangatiratanga, kaitiaki, tikanga, and whakapapa) is a failed audit, not a style choice.

## 2. First corpus and outputs

Until Audrey names a different first corpus, Phase A searches these, in this repo and in HULL where the skill registry already lives:

- skills (the current filesystem skill index, today drifted)
- work requests
- rules (`AGENTS.md` IDs, once the rulebook cutover is confirmed)
- case-file indexes

Search modes: exact match on declared identifiers, plus indexed lookup of meaning units. Result order is part of the contract (see Phase A). This is not SearchCrew (vendor APIs / MySQL FULLTEXT), which still needs its own green-light.

## 3. Phase A — CPU-only reference implementation

Build a CPU-only reference first. No GPU, no paid APIs, no CUDA kernels in this phase.

**Golden tests are the acceptance bar.** For a fixed input, a fixed declared axis/weight/relation/audit set, and a fixed corpus snapshot:

- the serialized output is **byte-identical** across runs, machines, and process restarts
- the **ranking is identical**, including ties
- sort order is a **stable sort** with **declared tie-breaks** (for example: higher declared weight, then lower denotum id, then lexicographic term). The tie-break rule is part of the golden fixture, not left to hash or map iteration order

HULL's current `list()` over a `HashMap` is not acceptable here; list order must be made stable before HULL is used as a backend.

A **determinism test in CircleCI** (same-input, byte-identical output and ranking) is required before Phase A is done. It is added later, under its **own WR**, because it is a CI-config change and needs Audrey's yes (B5). This PR does not change CI.

## 4. Phase B — GPU acceleration only behind a benchmark

Phase B starts only after Phase A has a CPU baseline and passing golden tests. GPU / CUDA is an accelerator for the same engine, not a second engine.

**Routing** uses the JIT compute provisioning wrapper:

- Audrey's three interleaved versions (t411u), summarized in [`docs/cutover/notebooks/audrey-pasted-cuda-jit-wrapper-2026-11-14.md`](../cutover/notebooks/audrey-pasted-cuda-jit-wrapper-2026-11-14.md)
- the existing repo module [`products/ai-architecture-framework/cuda_mlops_wrapper.py`](../../products/ai-architecture-framework/cuda_mlops_wrapper.py)

All of these detect NVIDIA GPUs with `nvidia-smi`, fall back to CPU, and pick a cheapest-viable hardware tier. They are hardware routers, not the search engine. Version C is **dry-run by default** (`provision_jit(..., dry_run=True)`). Phase B must keep that default: no real provision, and no paid GPU spend, without Audrey's yes (E3).

**Correctness:** every GPU result must **match the CPU golden outputs** (byte-identical payload and ranking). A faster disagreeing result is a failed test, not an improvement.

**When to start:** only if a benchmark against the Phase A CPU baseline shows a real win on a named workload, on a GPU host Audrey has approved. Candidates from `revvel-metal-findings` stay research only until that bar is met.

## 5. Learned rules from "cv cuda in fedora"

Source notebook: https://notebook.google.com/notebook/e173767c-f730-4a1d-8c52-6633ed0c60a0 — audit: [`docs/cutover/notebooks/e173767c-f730-4a1d-8c52-6633ed0c60a0.md`](../cutover/notebooks/e173767c-f730-4a1d-8c52-6633ed0c60a0.md). These rules apply to any GPU path in Phase B (and to any later CV-CUDA work):

1. **Allocate the output once and reuse it in loops** (the `_into` pattern: for example `cvcuda.gaussian_into` rather than allocating on every call). Do not repeatedly allocate VRAM or unnecessarily synchronize inside the frame or batch loop.
2. **Warm up and calibrate before claiming latency.** Run the kernel twice (or more) and distinguish cold (first-compile) from warm runs. In that notebook, "JIT" means kernel-compilation warm-up and cache, not the hardware-provisioning wrapper in section 4. Do not publish a latency number from a cold run, and do not hand-wave it as "the GPU warmed up."

The notebook's own cold-vs-warm figures and "11x" claims are source-document numbers, not independently verified measurements, and must not be copied into dashboards or acceptance tests as facts.

The four CUDA course notebooks (HPC fundamentals, parallel paradigm, matrix operations, CUDA C++ in Portuguese) are background only; they do not change this spec.

## 6. BOM (does not fail this PR)

Listed also in `docs/CUTOVER_PLAN.md` section 4. Missing data or a missing host does not fail the WR or the PR (C4).

| What | Why | Free or paid |
| --- | --- | --- |
| GPU host, or a decision that it is not needed | Phase B cannot be benchmarked without a host Audrey has approved | paid, unknown, needs her yes |
| Backup of Audrey's local cv-cuda repo to GitHub | `PROJECT_PLAN.md` and `README.md` in the "cv cuda in fedora" notebook look like they came from a local tree that is not on GitHub | free, needs her to point at the path |

## 7. Out of scope for the first implementation PR

- Changing CircleCI in the same PR as the docs or the reference implementation (determinism job gets its own WR)
- Paid GPU spend, cloud burst, or turning the wrapper's dry-run off
- Treating the JIT provisioning wrapper, `cuda_mlops_wrapper.py`, or CV-CUDA image pipelines as the search engine
- SearchCrew, until Audrey green-lights it in her own words
- Claiming the engine is "deterministic search" without the Phase A golden tests (G7)
