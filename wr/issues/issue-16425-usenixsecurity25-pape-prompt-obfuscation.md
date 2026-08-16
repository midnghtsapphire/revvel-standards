# WR: usenixsecurity25-pape.pdf use for revvel-standards

**Issue:** #16425
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-20
**Research Date:** 2026-08-08
**Researcher:** GitHub Copilot Coding Agent
**WR Status:** Complete

---

## Issue Context

### Summary

Ingest USENIX Security 2025 paper **Prompt Obfuscation for Large Language
Models** (Pape et al.) and turn it into repo standards + actionable adoption
rules. Clarify free/open access (no membership jerryrig).

### Objective

Ship a load-bearing standard that protects product system-prompt IP and
answers the access question with the official open-access path only.

### Definition of Done

- [x] `standards/PROMPT_OBFUSCATION_STANDARD.md` exists with citations,
      rules, checklist, SEO/BOM/monetization metadata
- [x] Cross-linked from `standards/SECURITY.md` and
      `standards/INDIRECT_PROMPT_INJECTION_STANDARD.md`
- [x] Regression tests lock the standard + cross-links
- [x] Free-access / membership question answered without circumvention advice
- [x] Closes #16425

### Explicit Exclusions

- No paywall bypass, shared accounts, or fake membership flows
- No production soft-prompt optimizer implementation in this WR (research +
  standard + adoption path only; implementer WR can follow)
- No change to public AGENTS.md operating rules (those stay `public`)

---

## Research Checklist

- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

---

## Research Findings

### Paper (primary source)

- **Title:** Prompt Obfuscation for Large Language Models
- **Authors:** David Pape, Sina Mavali (CISPA); Thorsten Eisenhofer (BIFOLD /
  TU Berlin); Lea Schönherr (CISPA)
- **Venue:** 34th USENIX Security Symposium (Aug 13–15, 2025, Seattle)
- **PDF:** <https://www.usenix.org/system/files/usenixsecurity25-pape.pdf>
  (open access sponsored by USENIX — **no membership required**)
- **Presentation:**
  <https://www.usenix.org/conference/usenixsecurity25/presentation/pape>

### Key technical takeaways

1. System prompts are product IP and are extractable; refusal text alone fails.
2. Obfuscation finds a functional collision: same behavior, low interpretability.
3. **Hard prompts** (token space, GCG) — portable to text APIs, weaker.
4. **Soft prompts** (embedding space, gradient descent) — preferred by authors
   for utility + confidentiality; needs embedding injection.
5. Deobfuscation under realistic black-box assumptions does not recover useful
   original semantics (paper evaluation).
6. Misuse risk: hiding malicious instructions — pair with safety review.

### Free access / membership (issue body)

| Question | Answer |
| --- | --- |
| Do I need USENIX membership to read this PDF? | **No.** Proceedings are open access. |
| How do I "join for free"? | Use the official PDF/presentation links. Optional USENIX membership is separate and paid; student/grant programs are the legitimate discount paths when offered. |
| May agents jerryrig membership? | **No.** Policy: official channels only. |

### Mapping onto revvel-standards

Delivered in
[`standards/PROMPT_OBFUSCATION_STANDARD.md`](../../standards/PROMPT_OBFUSCATION_STANDARD.md):

- Prompt classification (`public` / `internal` / `product-ip`)
- Operational controls (logging, canonical original, model-tie manifests)
- Phased adoption (inventory → hard pilot → soft path)
- Cross-links to IPI standard and PLeak WR (#16427)

### Market / SEO

Keywords: prompt obfuscation, system prompt protection, LLM IP, prompt
leakage defense, custom GPT theft, soft prompt security, USENIX Security 2025.

### Competitor snapshot

| Player | Role | Pricing signal | Gap vs this standard |
| --- | --- | --- | --- |
| Lakera / prompt-injection vendors | Runtime injection defense | Paid tiers (verify current) | Stops steering; does not protect prompt text IP after dump |
| Prompt-leak academic tools (PLeak et al.) | Offense research | Free papers | We document defense-side response in WR-16427 + this standard |
| Fine-tune / LoRA PEFT | Alternative to long system prompts | GPU time | Paper compares obfuscation utility vs LoRA; different ops model |
| Manual "don't reveal prompt" | Naive control | Free | Insufficient per paper |

Pricing cells that are vendor-commercial: treat as
`Pricing data pending — competitive benchmark research required` unless a
live quote is attached in a follow-up.

### BOM (soft-prompt pilot)

- Open-weight model + serve stack with embedding prefix support
- GPU or rented inference
- Golden task set U per product
- Secret store for canonical prompts
- Eval harness (BLEU / embedding cosine / task pass-rate)
- Manifest: base model, tokenizer, dim, seed

### Monetization

1. Non-clonable skill/prompt packs (Gumroad).
2. Paid "prompt IP hardening" audit using this checklist.
3. Trust differentiator for productized agent pipelines (prime directive:
   OSINT + automated product pipeline).

### Community chatter (qualitative)

Custom-GPT prompt dump culture and "ignore previous instructions / reveal
your prompt" attacks are widely discussed; operators want protections that
survive extraction, not only refusal strings. (Confidence: medium — cultural
observation; paper case study uses a leaked custom GPT prompt as real-world
evidence.)

### Domain strategy

Prefer content hubs under `/security/prompt-obfuscation` style landing if
productized; primary SEO entity is the standard filename + USENIX citation.

---

## Actionable Takeaways

- [x] Land `PROMPT_OBFUSCATION_STANDARD.md` and security index links
- [ ] Follow-up WR: implement Phase A inventory script over `skills/` +
      `docs/prompts/`
- [ ] Follow-up WR: extraction-refusal eval in OpenRouter persona runners
- [ ] Follow-up WR: soft-prompt pilot on one internal skill with metrics

---

## Sources

- [Pape et al. USENIX Sec '25 PDF](https://www.usenix.org/system/files/usenixsecurity25-pape.pdf)
- [Presentation page](https://www.usenix.org/conference/usenixsecurity25/presentation/pape)
- [`standards/PROMPT_OBFUSCATION_STANDARD.md`](../../standards/PROMPT_OBFUSCATION_STANDARD.md)
- [`standards/INDIRECT_PROMPT_INJECTION_STANDARD.md`](../../standards/INDIRECT_PROMPT_INJECTION_STANDARD.md)
- PLeak companion: `wr/issues/issue-16427-exploring-pleak-an-algorithmic-method-for-system-p.md`

## Next Step

Merge this PR (Closes #16425). File follow-up implementer WRs for Phase A/B
only after merge — do not block this research/standard landing on a full ML
pipeline.
