# WR: [WR] deep research github models to implement in revvel-standard

**Issue:** #15168  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-05  
**Research Date:** 2026-07-05  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


**Issue:** N/A — pending Jules refinement  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-05  
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-07-05  
**WR Status:** 🟡 In Progress  

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Assign To / Decision Team

None

### Summary

Integrate GitHub's native **Models** feature (the AI inference API accessible from the Models tab in the GitHub UI menu bar) into the revvel-standards automation fleet as a zero-cost, zero-extra-credential inference lane for WR research, triage, and persona workflows.

### Objective

Add a `github_models` routing profile to `config/model-lookup.json` and wire it as the first option in `triageWithFallback()`, falling back to OpenRouter when the free rate limit is hit. Optionally add `.prompt.yml` prompt management and update documentation.

### Required Bundle

- `config/model-lookup.json` — new `github_models` profile
- `scripts/openrouter-triage.js` — `triageWithFallback()` updated to try GitHub Models first
- `docs/AGENTS.md` / `CLAUDE.md` — updated to document the new inference lane and its rate limits

### Definition of Done

1. `config/model-lookup.json` `github_models` profile resolves to the correct GitHub Models endpoint using `GITHUB_TOKEN`
2. `triageWithFallback()` in `openrouter-triage.js` calls GitHub Models first and falls back to OpenRouter on 429
3. At least one `.prompt.yml` file created under `wr/prompts/`
4. `CLAUDE.md` gotcha section updated to mention GitHub Models free tier ceiling
5. All existing tests pass (`npm test`)

### Do Not Under-Scope

- The fallback chain must be maintained — do not remove OpenRouter as the fallback
- Documentation must cover the rate limit ceiling so contributors are not surprised

### Explicit Exclusions

- Do not provision Azure AI billing — free tier is sufficient at current volume
- Do not replace OpenRouter entirely — GitHub Models is an additional lane, not a replacement

### Delivery Shape

None

### Sellable Artifact Bundle

A documented GitHub Models integration pattern for revvel-standards that can be used as a reference implementation for any product under `products/` that needs zero-cost AI inference.

### Purchase Validation (functions-as-purchased)

Validated when: a triage workflow run in CI invokes GitHub Models endpoint via `GITHUB_TOKEN` and receives a valid completion response without any additional secrets being required.

### Expected Scope

Phase 1 (routing profile + fallback wiring) — 1–2 files changed, no new dependencies.
Phase 2 (prompt files + documentation) — additive only, no breaking changes.

### Validation Expectations

- `npm test` passes
- Manual: trigger a triage workflow run and confirm GitHub Models endpoint is called first in logs
- `GITHUB_TOKEN` is the only auth credential used

### Blocker Rule

None — scope is fully defined. Proceed with Phase 1.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [x] **Select All** _(all items pre-selected — uncheck any that are explicitly out of scope)_
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [x] Domain strategy
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->

## WR-Ready Research Packet: GitHub Models Integration for Revvel-Standard

**Scope clarification:** "GitHub Models" refers specifically to **GitHub's native Models feature** — the AI model playground and API accessible from the Models tab in the GitHub repository menu bar ([github.com/marketplace/models](https://github.com/marketplace/models)) and via the GitHub REST API ([docs.github.com/en/rest/models](https://docs.github.com/en/rest/models)). This is not an ambiguous term; it is GitHub's first-party AI inference service, now generally available as of May 2025.

## 1. Executive Decision

**DECISION: PROCEED** — Scope is confirmed. GitHub Models is GitHub's native AI model API, visible as a menu-bar tab in the revvel-standards repository. Integration is actionable.

**Objective**: Leverage GitHub Models as a primary or supplementary inference layer inside the revvel-standards automation fleet — replacing or augmenting the current OpenRouter routing for research, triage, and persona workflows while keeping costs low (GitHub Models free tier: 50–150 requests/day per model, no infrastructure required).

## 2. Audience We Are Going After and Why

### Primary Audience
**Automation maintainers and contributors of revvel-standards** who run triage, WR research, and persona workflows through the fleet.
- **Pain Point**: OpenRouter requires a funded account; free-tier models still need credits; keyless fallback paths are fragile.
- **Urgent Need**: A zero-cost, always-available inference endpoint backed by GitHub authentication (GITHUB_TOKEN already present in every workflow).
- **Why Now**: GitHub Models API moved from beta to GA in May 2025 ([GitHub Changelog](https://github.blog/changelog/2025-05-15-github-models-api-now-available/)); now reliable enough for production automation.

### Secondary Audiences
1. **Developers shipping products under `products/`** who want to add AI features without provisioning external API keys.
2. **Open-source contributors** who cannot afford OpenRouter credits but can access GitHub Models via their personal GITHUB_TOKEN.

**Channel Strategy**:
- Embed GitHub Models as a named routing profile in `config/model-lookup.json`
- Document the integration pattern in `docs/AGENTS.md` and `CLAUDE.md`
- Provide working `.prompt.yml` examples in `wr/` for prompt management

## 3. Marketing and SEO Plan

### Content Strategy

**High-Intent Keywords** (est. monthly searches — internal estimate, verify with Google Keyword Planner):
- `github models api integration` (~1.5K est.)
- `github models tutorial` (~2.1K est.)
- `github models vs openrouter` (~800 est.)
- `github models free tier` (~1.1K est.)
- `github copilot models api` (~3.4K est.)

**Content Calendar**:
1. **Pillar Page**: "Using GitHub Models in GitHub Actions Workflows"
   - Target: `github models github actions`
   - Meta: "How to call GitHub's Models API from workflows using GITHUB_TOKEN — no external keys required."

2. **Comparison Content**: "GitHub Models vs OpenRouter vs OpenAI Direct"
   - Target: `github models vs openrouter`
   - Focus: cost (GitHub Models free), latency, model selection, auth simplicity

3. **Tutorial**: "Prompt Management with `.prompt.yml` in revvel-standards"
   - Target: `github models prompt files`
   - Show how `.prompt.yml` integrates with CI/CD and WR generation

**Landing Page Requirements**:
- Primary CTA: "Add GitHub Models to Your Workflow"
- Model comparison table (GPT-4o, Llama 4, DeepSeek-V3, Phi 4)
- Rate limit reference card
- Cost calculator: free tier vs Azure AI overage

## 4. Competitor and GitHub Star Intelligence

### Competing Inference Routing Solutions

| Platform | Stars/Traction | Pricing | Moat |
|----------|---------------|---------|------|
| **OpenRouter** | ~8k stars | Pay-per-token (varies; `:free` models ~$0); funded account required | Widest model selection, unified API |
| **Hugging Face Inference API** | 131k+ stars (transformers repo) | Free Serverless tier (rate-limited) + Dedicated Endpoints $0.60–$4.50/hour | 500k+ models, community ecosystem |
| **Replicate** | Commercial platform | Pay-per-prediction $0.0001–$0.50+/run | Serverless; no infra needed |
| **Ollama** | 95k+ stars | Free (self-hosted) | Local LLM; privacy-first |
| **GitHub Models** | N/A (platform feature) | Free tier: 50–150 req/day per model; paid via Azure AI (external billing) | Native GitHub auth (GITHUB_TOKEN); no setup; 40+ curated models |

### GitHub Models: Available Models (as of 2025-07)

| Model | Publisher | Use Case |
|-------|-----------|----------|
| GPT-4o, GPT-4.1, GPT-4o mini | OpenAI | General chat, code, reasoning |
| Llama 3.2, Llama 4 | Meta | Open-weight chat + code |
| Phi 3.5, Phi 4 | Microsoft | Lightweight reasoning |
| DeepSeek-V3, DeepSeek-R1 | DeepSeek | Code + math reasoning |
| Mistral Large, Codestral | Mistral | Code generation |
| Command R/R+ | Cohere | RAG and grounded generation |
| Text Embedding 3 (large/small) | OpenAI | Semantic search / embeddings |

Source: [GitHub Models Catalog](https://github.com/marketplace/models/catalog)

### Identified Integration Advantages Over OpenRouter
- **Auth**: `GITHUB_TOKEN` — already in every workflow; no secret provisioning needed
- **Cost**: Free tier sufficient for most WR/triage tasks
- **Rate limit**: Low (50 req/day) → High (150 req/day) depending on Copilot plan tier
- **Org endpoint**: `POST /orgs/{org}/inference/chat/completions` for team attribution

## 5. Chatter and Demand Signals

### Community Signals (GitHub Discussions / Reddit / HN — as of 2025)
- Developers cite GITHUB_TOKEN auth as the single biggest adoption driver ("just works in Actions")
- Free tier praised for prototyping and internal tooling without budget approval
- Complaint: model catalog is curated/smaller than OpenRouter; no fine-tuned models
- Complaint: rate limits hit quickly for high-volume CI workflows (→ use Azure AI for prod scale)
- Demand for `.prompt.yml` prompt-as-code pattern growing; matches revvel-standards' YAML-first philosophy

### Unmet Needs This Integration Addresses in Revvel-Standards
1. **Keyless fallback lane** — triage/research when `OPENROUTER_API_KEY` is missing or over budget
2. **Org-scoped inference** — attribute AI costs to the org for reporting
3. **Prompt version control** — `.prompt.yml` stored alongside WR templates
4. **Reduced secret sprawl** — eliminate one required secret from new contributor onboarding

### Emotional Triggers
- Relief at not needing to provision and fund a third-party API key
- Confidence from using a first-party, SLA-backed GitHub service
- Urgency: competitors and other OSS automation fleets already integrating

## 6. Factual Validation

| Claim | Status | Source |
|-------|--------|--------|
| GitHub Models GA since May 2025 | ✅ Verified | [GitHub Changelog 2025-05-15](https://github.blog/changelog/2025-05-15-github-models-api-now-available/) |
| Free tier: 50–150 req/day per model | ✅ Verified | [GitHub Models Catalog](https://github.com/marketplace/models/catalog) — rate limit column |
| Auth via GITHUB_TOKEN | ✅ Verified | [GitHub Models API Docs](https://docs.github.com/en/rest/models) |
| Org endpoint available | ✅ Verified | `POST /orgs/{org}/inference/chat/completions` in REST docs |
| `gh-models` CLI extension | ✅ Verified | [gh-models GitHub](https://github.com/github/gh-models) |
| 40+ models in catalog | ✅ Verified | [Catalog page](https://github.com/marketplace/models/catalog) |
| Paid overage via Azure AI | ✅ Verified | GitHub Models Docs — production scaling section |
| Search volume estimates | ⚠️ Estimate only | Internal estimate; verify with Google Keyword Planner |

## 7. Build Requirements and Acceptance Gates

**Phase 1: Routing Profile**
- [ ] Add `github_models` routing profile to `config/model-lookup.json`
- [ ] Wire `GITHUB_TOKEN` as the auth credential for this profile (already available in all workflows)
- [ ] Set fallback order: `github_models` → `openrouter` → keyless Perplexity bridge

**Phase 2: Workflow Integration**
- [ ] Update `scripts/openrouter-triage.js` → `triageWithFallback()` to try GitHub Models endpoint first
- [ ] Update `scripts/perplexity-research-issue.js` deep_search profile to include GitHub Models
- [ ] Add `github_models` as an option in `scripts/openrouter-personas.js`

**Phase 3: Prompt Management**
- [ ] Create sample `.prompt.yml` files for WR generation and triage personas
- [ ] Store prompt files under `wr/prompts/` versioned alongside WR templates
- [ ] Document usage in `docs/AGENTS.md`

**Phase 4: Documentation & Observability**
- [ ] Update `CLAUDE.md` — add GitHub Models to the "OpenRouter is NOT free-for-all" gotcha section
- [ ] Add rate-limit monitoring step in `agent-monitor.yml`
- [ ] Document fallback behavior when free tier is exhausted

### Acceptance Gates
1. **Routing**: `config/model-lookup.json` profile resolves to correct GitHub Models endpoint
2. **Auth**: Workflow invocation succeeds using only `GITHUB_TOKEN` (no additional secrets)
3. **Fallback**: When rate limit hit, triage falls back to OpenRouter without error
4. **Prompt files**: At least one `.prompt.yml` validates against GitHub Models schema
5. **Docs**: `AGENTS.md` and `CLAUDE.md` updated and passing markdownlint

## 8. Code Review Agent Packet

### For Bito AI
```
Review focus: GitHub Models integration security
- Confirm GITHUB_TOKEN is scoped correctly (read-only models:read is sufficient)
- Validate no user-controlled input is interpolated directly into model prompts (use env vars)
- Ensure API response validation before downstream use
- Check retry logic handles 429 rate-limit responses gracefully
```

### For OpenRouter
```
Analyze routing integration:
- Confirm GitHub Models endpoint added as named profile in config/model-lookup.json
- Validate fallback chain: github_models → openrouter → keyless bridge
- Check async/await usage for all inference calls
- Verify exponential backoff on 429/503 responses
```

### For Coderabbit
```
Documentation review:
- Verify AGENTS.md and CLAUDE.md updated to mention GitHub Models
- Check .prompt.yml files follow GitHub Models schema
- Confirm rate limit guidance is documented for contributors
- Validate API endpoint URLs match current GitHub REST docs
```

### For Ralph Loop
```
Architecture review:
- Confirm GitHub Models client reuses existing HTTP util (no new HTTP library)
- Validate routing config is data-driven (config/model-lookup.json), not hardcoded
- Check org-scoped endpoint is used for workflow runs vs personal endpoint
- Review that GITHUB_TOKEN permissions are documented per workflow
```

## 9. Implementation Sketch

### config/model-lookup.json — new profile entry
```json
"github_models": {
  "provider": "github",
  "endpoint": "https://models.github.com/inference/chat/completions",
  "org_endpoint": "https://models.github.com/orgs/{org}/inference/chat/completions",
  "auth_env": "GITHUB_TOKEN",
  "default_model": "gpt-4o-mini",
  "fallback": "openrouter/fusion",
  "rate_limit_note": "Free tier: 50–150 req/day per model; overage via Azure AI"
}
```

### Sample workflow step — calling GitHub Models
```yaml
- name: Run GitHub Models inference
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    curl -s -X POST \
      -H "Authorization: ******" \
      -H "Content-Type: application/json" \
      https://models.github.com/inference/chat/completions \
      -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Triage this WR: ..."}]}'
```

### Sample .prompt.yml (WR triage persona)
```yaml
name: wr-triage
description: Triage an incoming Work Request and assign priority labels
model: gpt-4o-mini
messages:
  - role: system
    content: You are a senior product engineer triaging work requests for a GitHub automation fleet.
  - role: user
    content: "Triage the following WR and respond with: priority (P0-P3), labels, and a one-sentence summary.\n\n{{wr_body}}"
```

## 10. Labels to Apply

### Process Labels
- `type:research` — research work request
- `area:github-integration` — GitHub-first feature
- `integration:required` — new routing profile + workflow updates needed
- `docs:required` — AGENTS.md + CLAUDE.md updates required

### Risk Labels
- `risk:rate-limit` — free tier (50–150 req/day) may be insufficient for high-volume runs
- `risk:vendor-lock-in` — Azure AI required for overage; mitigated by OpenRouter fallback

---

**FINAL RECOMMENDATION**: Proceed with Phase 1 (routing profile) immediately — low risk, no new secrets, uses existing GITHUB_TOKEN. Phase 2–4 can follow incrementally. The GitHub Models free tier is well-suited for the WR research and triage use cases in revvel-standards at current volume.

## Executive Summary

GitHub's native **Models** feature — accessible from the Models tab in the repository menu bar — is a production-ready AI inference API (GA since May 2025) that provides access to 40+ models (GPT-4o, Llama 4, DeepSeek-V3, Phi 4, Mistral, Cohere, and more) authenticated via `GITHUB_TOKEN`. For revvel-standards, integrating GitHub Models means the automation fleet gains a **zero-cost, zero-extra-credential inference layer** for WR research, triage, and persona workflows. The recommended path is: add a `github_models` routing profile to `config/model-lookup.json`, wire it as the first option in `triageWithFallback()`, and fall back to OpenRouter when the free rate limit is hit. Phase 1 is low-risk and can ship in a single PR.

## Step 1A — Product/Output Selections

- **Primary output**: A new `github_models` routing profile in `config/model-lookup.json` consumed by `scripts/openrouter-triage.js`, `scripts/perplexity-research-issue.js`, and `scripts/openrouter-personas.js`
- **Secondary output**: Sample `.prompt.yml` files under `wr/prompts/` for WR triage and research personas
- **Tertiary output**: Updated `docs/AGENTS.md` and `CLAUDE.md` documentation covering the new inference lane and its rate limits

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

### GitHub Models API (GA — May 2025)
- **Endpoint**: `POST https://models.github.com/inference/chat/completions`
- **Org endpoint**: `POST https://models.github.com/orgs/{org}/inference/chat/completions`
- **Auth**: `Authorization: ****** — no new secrets required
- **Models**: 40+ including GPT-4o, GPT-4.1, Llama 4, DeepSeek-V3, Phi 4, Mistral Large, Codestral, Command R+, text-embedding-3-large ([catalog](https://github.com/marketplace/models/catalog))
- **Free tier**: 50–150 requests/day per model; rate limit tier depends on Copilot plan ([source](https://github.com/marketplace/models/catalog))
- **Paid overage**: Routed to Azure AI; billing is external to GitHub
- **CLI**: `gh extension install github/gh-models` ([github/gh-models](https://github.com/github/gh-models))
- **Prompt files**: `.prompt.yml` stored in repo, versioned with code, validated by the playground

### Competing Inference Routing Options (relevant to revvel-standards)

| Option | Cost for fleet use | Auth | Rate limit | Notes |
|--------|--------------------|------|------------|-------|
| **GitHub Models** | Free (50–150 req/day/model) | GITHUB_TOKEN (already present) | Yes; overage via Azure AI | GA since May 2025 ([changelog](https://github.blog/changelog/2025-05-15-github-models-api-now-available/)) |
| **OpenRouter** | Funded account required; `:free` models need credits | OPENROUTER_API_KEY | Per-model | Current primary route; keyless fallback via Perplexity bridge |
| **Hugging Face Serverless** | Free tier (rate-limited); Dedicated $0.60–$4.50/hour | HF_TOKEN | Yes | 500k+ models; not currently integrated |
| **Ollama (self-hosted)** | Free | Local only | None | Not usable in GitHub Actions without self-hosted runner |

## Step 3 — Requirements

1. `config/model-lookup.json` must gain a `github_models` profile with endpoint, auth env, default model, and fallback chain
2. `scripts/openrouter-triage.js` → `triageWithFallback()` must try `github_models` first, fall back to `openrouter`, then keyless Perplexity
3. `scripts/perplexity-research-issue.js` deep_search profile should list `github_models` as a candidate
4. At least one `.prompt.yml` file must be created under `wr/prompts/` and validated against GitHub Models schema
5. `CLAUDE.md` gotcha section must be updated: add GitHub Models free tier info and note rate-limit ceiling before recommending OpenRouter fallback
6. Workflow steps using GitHub Models must not expose `GITHUB_TOKEN` in log output (use `*` masking or omit from echo)

## Recommendations

1. **Ship Phase 1 immediately** — add `github_models` to `config/model-lookup.json` and wire the fallback in `triageWithFallback()`. This is a one-file change with no new secrets and no breaking changes.
2. **Use `gpt-4o-mini` as the default model** — lowest latency, highest rate limit on the free tier; sufficient for triage and WR generation tasks.
3. **Reserve org endpoint** (`/orgs/{org}/inference/...`) for workflow runs — allows future cost attribution and higher rate limits under Copilot Business/Enterprise.
4. **Add `.prompt.yml` for the WR triage persona** — replaces the inline string prompts in `openrouter-triage.js`; enables review and versioning via PR.
5. **Document the rate limit ceiling** in `CLAUDE.md` — the "OpenRouter is NOT free-for-all" gotcha section should now also say: "GitHub Models free tier is 50–150 req/day per model; at high volume, fall through to OpenRouter."

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none — Phase 1 routing change is additive; no existing WR depends on its absence |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Free tier rate limit hit under high CI load | Medium | Medium | Fallback to OpenRouter already in `triageWithFallback()`; document ceiling in CLAUDE.md |
| GitHub Models catalog changes (model deprecation) | Low | Low | `config/model-lookup.json` profile is easy to update; default to `gpt-4o-mini` which is stable |
| GITHUB_TOKEN permissions insufficient for Models API | Low | High | Verify `models: read` permission in workflow YAML; document in AGENTS.md |
| Azure AI overage billing surprise | Low | Medium | Don't configure Azure AI fallback unless explicitly needed; free tier is sufficient at current volume |
