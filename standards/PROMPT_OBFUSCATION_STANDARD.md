# Prompt Obfuscation Standard (System-Prompt IP Protection)

> **WR-16425** — operationalizes USENIX Security 2025 paper
> ["Prompt Obfuscation for Large Language Models"](https://www.usenix.org/conference/usenixsecurity25/presentation/pape)
> (Pape, Mavali, Eisenhofer, Schönherr; CISPA / BIFOLD / TU Berlin) as a
> first-class security resource for this repository's agent fleet and sellable
> prompt products.
>
> **Open-access PDF (no membership required):**
> <https://www.usenix.org/system/files/usenixsecurity25-pape.pdf>
>
> Companion offense-awareness WR: PLeak / system-prompt leakage
> (`wr/issues/issue-16427-exploring-pleak-an-algorithmic-method-for-system-p.md`).
> Companion ingestion-surface WR: indirect prompt injection
> ([`INDIRECT_PROMPT_INJECTION_STANDARD.md`](./INDIRECT_PROMPT_INJECTION_STANDARD.md)).

This monorepo ships high-value system prompts as product IP: skills under
`skills/`, persona/system prompts under `docs/prompts/`, product master
prompts under `products/*/`, agent handoff templates, and Gumroad/packaged
prompt bundles. Those strings are the "source code" of agent behavior. Public
research (including this paper and PLeak) shows plain-text system prompts are
reliably extractable via user interaction. This standard defines how we treat
that IP so a leak is not a free clone of the product.

## 1. What the paper contributes (plain English)

Source: Pape et al., USENIX Security 2025, open-access proceedings.

1. **Problem.** Detailed system prompts turn foundation models into products.
   They are IP, but extraction/stealing attacks work, and "don't reveal your
   prompt" instructions are not a reliable defense.
2. **Idea.** Instead of trying to stop extraction forever, **obfuscate** the
   system prompt so that even if the attacker dumps it, the dump is not
   useful — it does not reveal the original instructions and is hard to edit
   or port.
3. **Two modes.**
   - **Hard-prompt obfuscation** — optimize a discrete token string (via GCG
     style search) so model outputs match the original on a calibration set.
     Deployable as plain text, but weaker utility/confidentiality.
   - **Soft-prompt obfuscation** — optimize continuous embeddings past the
     token embedding layer. Stronger utility + confidentiality; needs
     embedding-level injection at serve time (open-weight / self-hosted, or
     providers that accept soft prompts).
4. **Threat model.** Practical black-box adversary with query-only access
   trying to extract or replicate the system prompt.
5. **Evaluation.** Utility measured with multiple lexical/semantic similarity
   metrics (e.g. BLEU, cosine similarity of embeddings) against the original
   prompt's outputs; deobfuscation attacks (prompt injection, token-space
   projection, fluency optimization) fail to recover meaningful original
   text in realistic settings.
6. **Limits the paper states.** Needs representative user/query samples to
   optimize; soft prompts are model-tied; hard prompts underperform; obfuscation
   can also be misused to hide malicious instructions (needs separate safety
   review — not a substitute for content policy).

## 2. Free access / "membership" clarification (WR body question)

The issue body asked how to "jerryrig membership" or "join for free."

**Answer for this paper and USENIX proceedings:**

| Path | Cost | Notes |
| --- | --- | --- |
| Proceedings PDF | **Free** | USENIX sponsors open access to the Security '25 proceedings. Use the official PDF URL above. No account, membership, or paywall bypass required. |
| Presentation page | **Free** | <https://www.usenix.org/conference/usenixsecurity25/presentation/pape> |
| USENIX membership | Optional paid | Membership is for association benefits (discounts, community), **not** required to read this paper. |
| Conference registration | Paid event | Separate from paper access. Student / grant / diversity programs are the legitimate reduced-cost paths when offered by USENIX. |

**Policy for agents working this repo:** never advise or implement paywall
circumvention, shared-credential schemes, or fake memberships. Point to the
official open-access URL. If a future resource is truly paywalled, document
the legitimate access options (author preprint, institutional access, purchase)
and stop — do not "jerryrig" access.

## 3. Why it matters here (revvel-standards surfaces)

| Paper concept | revvel-standards equivalent |
| --- | --- |
| Proprietary system prompt IP | `skills/*/SKILL.md`, `docs/prompts/**`, product `MASTER_PROMPT*.md`, Gumroad prompt packs, persona system messages in OpenRouter runners |
| Prompt stealing / extraction | Users or hostile issues asking agents to "print your system prompt", PLeak-style algorithmic leakage (WR-16427), custom-GPT dump culture |
| Hard-prompt deploy | Any text system message sent to OpenRouter / GitHub Models / vendor chat APIs |
| Soft-prompt deploy | Self-hosted / open-weight inference paths (local vLLM, Hugging Face TGI, etc.) where embedding prefixes can be injected |
| Utility calibration set U | Golden task suites per skill/product (`tests/`, product eval fixtures, WR acceptance prompts) |
| Deobfuscation risk | Publishing both original and obfuscated prompts side-by-side in git; logging full system prompts in CI artifacts |

## 4. Rules for this repository

These rules are mandatory for agents packaging or serving prompts as product
behavior. Research-only copies of public papers stay plain text.

1. **Classify prompt assets.** Every system/skill/master prompt is one of:
   - `public` — intended to be readable (AGENTS.md operating rules, open
     standards). No obfuscation.
   - `internal` — fleet ops prompts OK in private automation, not sold.
   - `product-ip` — bundled in a paid pack, differentiates a product, or
     encodes proprietary routing/judgment. Protect per this standard.
2. **Do not treat "never reveal your prompt" as sufficient protection.**
   Pair refusal text with architecture (least privilege, no prompt echo in
   logs, optional obfuscation for product-ip). Matches the paper's finding
   that extraction defenses alone are a cat-and-mouse game.
3. **Prefer soft-prompt obfuscation for high-value product-ip on
   self-hosted models.** Hard-prompt obfuscation is allowed only when the
   serve path is text-only APIs **and** a measured utility floor is met on
   the calibration set (document metrics + thresholds in the product README).
4. **Always keep a private canonical original.** Obfuscated artifacts are
   derived build outputs. Store originals in a restricted path or secret
   store; never commit "original vs obfuscated" pairs that re-enable
   supervised deobfuscation.
5. **Calibrate on representative tasks, not random internet text.** Build
   set `U` from the product's real user prompts and expected behaviors.
   Re-run utility metrics when the canonical prompt changes.
6. **Model-tie soft prompts.** An obfuscated embedding is not portable
   across base models. Record `base_model`, tokenizer revision, embedding
   dim, and optimization seed in the artifact manifest.
7. **Log redaction.** CI, agent-audit, and support logs must not print full
   product-ip system prompts. Log hashes + version IDs instead
   (`scripts/agent-activity-monitor.js` provenance pattern).
8. **Safety review before obfuscation.** Do not use obfuscation to hide
   instructions that would fail an open safety review (paper §Misuse).
   Obfuscation protects IP; it is not a cloak for disallowed behavior.
9. **Layer with injection defenses.** Obfuscation does not stop indirect
   prompt injection. Continue to follow
   [`INDIRECT_PROMPT_INJECTION_STANDARD.md`](./INDIRECT_PROMPT_INJECTION_STANDARD.md).
10. **No paywall bypass in research WRs.** When a WR cites a paper or tool,
    use official open-access or licensed channels only (see §2).

## 5. Practical adoption path (this monorepo)

### Phase A — inventory (no ML required)

1. Label prompt files `public` / `internal` / `product-ip` in the owning
   product README or skill front-matter.
2. Ensure product-ip prompts are not dumped by "reveal your prompt" eval
   cases; add a regression test that the served agent refuses extraction.
3. Strip full system prompts from workflow logs and failure comments.

### Phase B — hard-prompt pilot (text APIs)

1. Pick one low-risk internal skill with a golden prompt set.
2. Produce a hard-obfuscated candidate offline (research code / vendor tool).
3. Compare outputs with at least three metrics the paper uses (e.g. exact-ish
   lexical overlap, embedding cosine, task pass-rate).
4. Ship only if task pass-rate stays within the product's documented tolerance.

### Phase C — soft-prompt path (self-hosted)

1. Serve with a stack that accepts embedding prefixes.
2. Optimize soft prompt per paper §3.4 (CE + KL to original outputs).
3. Store binary embedding + manifest; load at process start; never expose via
   chat.

## 6. Reviewer checklist

- [ ] Is this prompt `public`, `internal`, or `product-ip`?
- [ ] If `product-ip`, is extraction refusal tested and are full prompts kept
      out of logs/artifacts?
- [ ] If shipping an obfuscated artifact: is the canonical original private,
      is the calibration set documented, and are utility metrics recorded?
- [ ] Soft-prompt artifacts include model/tokenizer identity?
- [ ] Change does not advise paywall circumvention or commit stolen prompts?
- [ ] Injection standard still satisfied for any new ingestion surface?

## 7. Resource index (citations)

| Resource | Type | Why it matters |
| --- | --- | --- |
| [Pape et al. — Prompt Obfuscation for LLMs (USENIX Sec '25 presentation)](https://www.usenix.org/conference/usenixsecurity25/presentation/pape) | Primary paper | Definitions, hard/soft methods, threat model, eval |
| [Open-access PDF](https://www.usenix.org/system/files/usenixsecurity25-pape.pdf) | Primary PDF | Free full text; no membership required |
| [USENIX Security '25 proceedings](https://www.usenix.org/conference/usenixsecurity25) | Venue | Open-access sponsorship note |
| PLeak WR (`wr/issues/issue-16427-…`) | Internal | Offense-side prompt leakage algorithms to defend against |
| [`INDIRECT_PROMPT_INJECTION_STANDARD.md`](./INDIRECT_PROMPT_INJECTION_STANDARD.md) | Internal | Ingestion-surface defenses (orthogonal to IP obfuscation) |
| [`SECURITY.md`](./SECURITY.md) | Internal | Security standards index |
| OWASP LLM01 Prompt Injection | Standard | Canonical LLM injection risk class |
| GCG (Zou et al., adversarial suffixes) | Academic method reused by paper | Discrete token optimization backbone for hard-prompt mode |

## 8. WR research metadata

- **Marketing/SEO keywords:** prompt obfuscation, system prompt protection,
  LLM intellectual property, prompt leaking defense, soft prompt security,
  custom GPT prompt theft, prompt extraction attack, USENIX Security 2025,
  AI agent IP protection, prompt watermarking alternative.
- **GitHub stars for referenced tools (confidence: medium — counts drift;
  re-verify at link):**
  - [llm-attacks / GCG reference implementations](https://github.com/llm-attacks/llm-attacks) — widely cited GCG codebase (star count drifts).
  - [vllm-project/vllm](https://github.com/vllm-project/vllm) — common self-hosted serve path for soft-prompt experiments.
  - [huggingface/peft](https://github.com/huggingface/peft) — LoRA baseline the paper compares against.
- **Monetization path:** (1) harder-to-clone Gumroad / skill packs and
  productized agents; (2) sellable "prompt IP hardening" audit checklist for
  teams shipping custom GPTs; (3) differentiator for OSINT/security tooling
  under the prime directive — trust + non-clonability.
- **BOM (bill of materials) for a soft-prompt pilot:** open-weight model
  weights + GPU or rented inference; embedding-capable runtime (vLLM/HF);
  golden prompt eval set; secret storage for canonical prompts; optional
  experiment tracker. Text-API-only stacks stay on hard-prompt or
  non-obfuscated + operational controls.
- **Factual citations:** method/threat-model/eval claims above trace to the
  open-access USENIX PDF and presentation page. Star counts and tool prices
  are labeled confidence-medium estimates where not pinned.
- **Instruction correction log:** issue title typo `usenixsecurity25-pape.pdf`
  maps to Pape et al. (not a membership-bypass task). "Jerryrig membership /
  join for free" is answered as **official open access** — no circumvention.
