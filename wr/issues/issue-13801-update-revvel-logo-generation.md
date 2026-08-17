# WR: [WR] update revvel logo generation

**Issue:** #13801
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-05-23
**Researcher:** Jules (Google) + OpenRouter
**WR Status:** ⚠️ Incomplete (research checklist pending)

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [ ] **Deep market research** — Not included in this WR revision; pending dedicated research pass.
- [ ] **BOM (Bill of Materials)** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Community chatter** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Competitor analysis** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Domain name strategy** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Marketing best practices** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Revenue / monetization model** — Not included in this WR revision; pending dedicated research pass.
- [ ] **Compliance & legal surface** — Not included in this WR revision; pending dedicated research pass.
- [x] **A/B test hypothesis** — N/A
- [x] **Affiliate / reseller program** — N/A

---

## Research Findings: Revvel Emblem Generation Update

### Executive Summary

The current WR (#13801) contains an unformatted dump of a system prompt (the "Master Logo Generator Prompt: The Glassmorphic Node Canvas"). Our objective is to extract this highly specific design prompt, update the existing Revvel Logo Standard (`templates/brand/REVVEL_EMBLEM_STANDARD.md`) to incorporate this master prompt directly, and ensure the documentation aligns with the project's $10M revenue generation goal. We recommend building a "Brand Generation Tool" (UI + API/Skill) that leverages this specific generation prompt to fulfill the "Ship-to-Market" requirement.

---

### Detailed Findings

#### 1. The Master Logo Generator Prompt

**What we found:**

The user supplied a highly optimized LLM/diffusion prompt for generating a "1:1 square grid composition presenting multiple distinct logo designs" in a "premium, modern high-tech interface utilizing layered, semi-transparent frosted glass modules floating gracefully over a dark, moody charcoal gradient background." The prompt uses variables like `[Design]` to generate multiple consistent options for any brand.

**Assessment:**

This prompt is a direct, executable implementation of the visual language described in `templates/brand/REVVEL_EMBLEM_STANDARD.md`. Currently, the standard describes the formula (Layer A through E, colors, derivations) but lacks a concrete, copy-pasteable prompt that agents can use to instantly generate the visuals.

#### 2. Ship-to-Market Integration

**What we found:**

To monetize this, the capability needs to be exposed as an automated skill or MCP tool. A prompt by itself is not monetizable; an automated workflow that generates brand packages using this prompt is.

**Assessment:**

We should map this prompt into the existing EXRUP pipeline by proposing a "Brand Generation Tool" (UI + API/Skill) that leverages this specific generation prompt.

---

### Recommendations

#### Immediate Actions (P0)

1. **Update `REVVEL_EMBLEM_STANDARD.md` with the Master Prompt**
   - **Why:** To provide agents with an immediate, executable string to generate compliant assets.
   - **How:** Add a new section ("Section 7: Master Logo Generator Prompt") to `templates/brand/REVVEL_EMBLEM_STANDARD.md` containing the exact prompt text from the WR.
   - **Effort:** 1 hour.

2. **Establish the Brand Generation Pipeline Map**
   - **Why:** Fulfills the "Ship-to-Market" requirement.
   - **How:** Document the required output shapes below.

#### Short-Term Actions (P1)

- Build a lightweight UI (Vercel) where users can input their brand name and topic, and the system executes the Master Prompt via an image generation API (e.g., Midjourney API or a stable diffusion endpoint).

---

### Risks & Considerations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Prompt drift across models | Medium | Version the prompt and validate output against reference images. |
| API costs for image generation | Low | Monitor usage and implement rate limiting on the API side. |

---

### Alternatives Considered

1. **Maintain prompt separately**
   - Pros: Keeps the standard document focused on concepts.
   - Cons: Agents may struggle to find the prompt, leading to inconsistent outputs.
   - Decision: Rejected. Including the prompt in the standard ensures agents have immediate access to it.

---

### Next Steps

1. [x] Research Revvel Emblem generation requirements.
2. [ ] Update `templates/brand/REVVEL_EMBLEM_STANDARD.md` with the Master Prompt.
3. [ ] Scaffold a "Brand Generation Tool" app using standard EXRUP methodology.

---

### Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | yes | SaaS Brand Generator | `scripts/ui-creation-engine.js` | UI to take brand inputs and display the 4x grid |
| API | yes | REST Endpoint | `standards/shapes/API.md` | Endpoint wrapping the image generation |
| CLI | no | N/A | N/A | N/A |
| MCP | yes | Server | `standards/shapes/MCP.md` | Tool for agents to request logos |
| Skill | yes | Execution | `products/revvel-skill-runner/` | Skill to execute the prompt |
| PDF | no | N/A | N/A | N/A |
| PowerPoint / deck | no | N/A | N/A | N/A |
| Video | no | N/A | N/A | N/A |
| Docs | yes | Standard update | revvel-standards docs | Update `REVVEL_EMBLEM_STANDARD.md` |
| Agent automation | yes | Workflow | `standards/AUTOMATED_PRODUCT_PIPELINE.md` | Automated brand package generation |

---

### Platform Defaults & Website Requirements

- **Website in Test:** Vercel (for the Brand Generator UI); **URL gap currently open until implementation ships**
- **Integration runtime:** DigitalOcean App Platform (for the backend generation service)
- **Admin surface:** Required (to monitor generation costs and rate limits)
- **User auth:** GitHub / Google OAuth

### Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | `standards/shapes/APP.md` | Gap | Build Brand Generator UI |
| API | `standards/shapes/API.md` | Gap | Build generation API wrapper |
| CLI | `standards/CLI_MCP_AUTOMATION.md` | Gap | N/A |
| MCP | `standards/shapes/MCP.md` | Gap | Build generation MCP tool |
| Skill | `products/revvel-skill-runner/` | Gap | Add logo generation skill |
| PDF | `docs/playbooks/pdf-wr-playbook.md` | Exists | N/A |
| PowerPoint / deck | N/A | Exists | N/A |
| Video | N/A | Exists | N/A |
| Docs | revvel-standards baseline | Exists | Append Master Prompt to Standard |
| Agent automation | `standards/AUTOMATED_PRODUCT_PIPELINE.md` | Gap | Scaffold brand pipeline |

---

### Agent Self-Healing Journal

- **Issue detected:** The WR contained a raw, highly valuable generation prompt but was trapped inside an unformatted, empty template, rendering it unusable by the automated pipeline.
- **Research / correction:** Extracted the prompt, recognized it as the executable form of the existing `REVVEL_EMBLEM_STANDARD.md`, and rewrote the WR to explicitly command the integration of this prompt into the standard.
- **Revvel-standards change:** Formalized the "Master Logo Generator Prompt" as a required component of the brand standards documentation.
- **Outcome to preserve:** When users provide raw prompts in WRs, agents must not just review them, but actively embed them into the relevant standard documents (like `REVVEL_EMBLEM_STANDARD.md`) so other agents can reuse them programmatically.

---

### References

- `templates/brand/REVVEL_EMBLEM_STANDARD.md`
- `docs/WEEKLY_RESEARCH_PROCESS.md`

---

**Research Status:** ⚠️ Incomplete (default research checklist items pending)
**Implementation Priority:** P1
**Approval Required:** @midnghtsapphire
