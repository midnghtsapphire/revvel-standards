# WR: [WR] review <https://github.com/google/ax> as a controller

**Issue:** #13741
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-05-23
**Status:** ✅ Complete

---

## What I Want

[WR] review <https://github.com/google/ax> as a controller

The user requested a review of the Google AX (Agent eXecutor) repository and an analysis of how its controller architecture can be applied to our ecosystem, specifically comparing it to an IoT "Controller-Microcontroller" architecture.

---

## Specific Requirements

### UI Look & Feel

SaaS Dashboard for fleet management.

### Must Have

- Implement a controller-microcontroller architecture within the EXRUP methodology.
- Align with the $10M revenue target via a monetizable fleet management system.
- Include a pre-flight autonomous research check.

### Must NOT Have

- Avoid heavy dependencies like Kubernetes; keep infrastructure simple (DigitalOcean/Vercel).

### Deadline

N/A

### Budget

N/A

### Other Notes

Must adhere to revvel-standards EXRUP methodology.

---

## Research Auto-Fills This

### Deep Market Research

Google AX (Agent eXecutor) is an open-source distributed agent runtime that uses a hub-and-spoke "Controller" model to orchestrate isolated agents, skills, and tools across a distributed environment. The AI engineering community is shifting away from monolithic agents towards distributed, secure, and isolated execution harnesses.

- **Keywords:** distributed agent runtime, agent orchestration framework, event-sourced agent execution, agent fleet management, ai agent controller platform.
- **Traction:** Google AX (708 stars), LangGraph (32.7k stars), AutoGen (58.3k stars).

### BOM (Bill of Materials)

- **Controller Infrastructure:** DigitalOcean App Platform (existing).
- **MCU Fleet Infrastructure:** Vercel / Local environments.
- **Signaling Protocol:** REST/WebSocket APIs.

### Community Chatter

DevOps teams and enterprise buyers require separated orchestration and execution for security (least privilege principle). Monolithic agents present security risks at scale.

### Competitor Analysis

Google AX relies heavily on Kubernetes and is in early development. Our solution will leverage simpler infrastructure (Vercel/DigitalOcean) and integrate seamlessly with our OpenRouter/GOAP OS pipeline, offering a direct path to monetization.

### Revenue / Monetization Model

- Ship open-core Controller.
- Paid Fleet Management SaaS per managed MCU node.
- Upsell enterprise controls (audit trails, policy packs, SSO, compliance exports).

### Compliance & Legal Surface

- Must respect the sandbox execution boundaries for agents.
- Compliance exports and audit trails are a premium upsell feature.

### Repository Discovery

Our ecosystem (Revvel Execution OS) already acts as an Orchestrator. We need to formalize this into a Controller-Microcontroller architecture and build edge nodes.

### Implementation Plan & Steps

#### Immediate Actions (P0)

1. **Adopt Controller/MCU Lexicon**
   - Update `RUNNER_TARGETS.md` and `CONTRACT.md` terminology to explicitly map Orchestrators to "Controllers" and Runners to "Microcontrollers".
   - *Owner:* @midnghtsapphire
2. **Scaffold the Revvel MCU Node App**
   - Scaffold a new `production-app` named `revvel-mcu-node` using `scripts/init-product.sh`.
   - *Owner:* Copilot / Agents

#### Short-Term Actions (P1)

1. **Build Signaling & Resumption Protocol**

- Implement persistent event logging and a resumption protocol (Webhook/WebSocket) between the Controller and Microcontrollers.

#### Long-Term Actions (P2)

1. **Develop Fleet Management Dashboard**

- Build and monetize the "Microcontroller" fleet management via a SaaS dashboard.

### Ship to Market Checklist

- [ ] Scaffold `revvel-mcu-node` app.
- [ ] Define REST/WebSocket API specification.
- [ ] Create UI for Fleet Management Dashboard.
- [ ] Pass all tests, linting, and CodeQL/Semgrep scans.
- [ ] Deploy Vercel app and update URL in README.

### Product / Output Selections

- **Website / app UI:** Yes (SaaS Dashboard)
- **API:** Yes (REST/WebSocket for Controller signaling)
- **CLI:** Yes (`revvel-mcu` for local MCU spin-up)
- **MCP:** Yes (Agent commands to MCU)
- **Skill:** Yes (Skill to deploy an MCU)
- **Docs:** Yes (Architecture spec for Controller-MCU)
- **Agent automation:** Yes (Product pipeline workflow)

### Platform Defaults

- **Website in Test:** Vercel (Fleet Management Dashboard).
- **Integration runtime:** DigitalOcean App Platform (Controller).
- **Admin surface:** Required (Fleet Management UI).
- **User auth:** GitHub / Google OAuth.

### Artifact Engine Map

- **Website / UI:** `standards/shapes/APP.md` (Gap - Needs Fleet Management Dashboard)
- **API:** `standards/shapes/API.md` (Gap - Needs signaling API)
- **CLI:** `standards/CLI_MCP_AUTOMATION.md` (Gap - Needs `revvel-mcu` CLI)
- **MCP:** `standards/shapes/MCP.md` (Gap - Needs MCU control MCP)
- **Skill:** `products/revvel-skill-runner/` (Exists - Add MCU deployment skill)
- **Docs:** revvel-standards baseline (Exists - Add Controller-MCU architecture docs)
- **Agent automation:** `standards/AUTOMATED_PRODUCT_PIPELINE.md` (Exists - Scaffold product pipeline)

### Agent Self-Healing Journal

- **Issue detected:** Request to evaluate Google AX's "controller" architecture.
- **Correction / Alignment:** Mapped Google AX capabilities to an IoT microcontroller metaphor. Formalizing our Orchestrator/Runner system as a Controller-Microcontroller architecture creates a clear, monetizable SaaS product (Fleet Management).
- **Preserved Outcome:** Extract architecture patterns from open source, map them to our EXRUP methodology (Create -> Ship -> Monetize -> Scale), and bundle assets to align with the $10M revenue goal.

---

## Research Fleet Plan & Review Fleet Plan

**Research Fleet:** Jules researched the Google AX architecture, identified its distributed runtime benefits, and aligned it with Revvel's IoT microcontroller vision and EXRUP monetization strategy.
**Review Fleet:** Reviewed and verified that the proposed Controller-Microcontroller architecture and implementation steps meet revvel-standards and the ship-to-market bundle requirements.
**Gate Rule:** WR research cannot be marked complete until Review Fleet passes.

---

**Last Updated:** 2026-05-23

### Risks & Considerations

| Risk | Severity | Mitigation |
| ------ | ---------- | ------------ |
| Over-engineering the execution layer | High | Keep the initial "Microcontroller" node as a simple HTTP/webhook listener that executes local shell/API commands, avoiding the complexity of Kubernetes (unlike Google AX). |
| Latency between Controller and Microcontroller | Medium | Use lightweight WebSocket or optimized HTTP signaling. |
| Monetization friction | Medium | Ensure the core open-source Controller has obvious value, while the Fleet Management Dashboard is the premium upgrade. |

### Alternatives Considered

1. **Adopt Google AX directly**
   - Pros: Built by Google, designed for Kubernetes, has event logging.
   - Cons: Still in active early development (breaking changes expected), heavy Kubernetes dependency, does not natively integrate with our OpenRouter/GOAP OS execution pipeline.
   - Decision: Rejected. We should learn from the *architecture* (Controller-Microcontroller) but build our own monetizable asset within the Revvel ecosystem that runs on simple infrastructure (DigitalOcean/Vercel).

### References

- [Google AX GitHub Repository](https://github.com/google/ax)
- [LangGraph GitHub Repository](https://github.com/langchain-ai/langgraph)
- [AutoGen GitHub Repository](https://github.com/microsoft/autogen)
- `engines/CONTRACT.md` (Revvel Orchestrator and Runners)
- `standards/RUNNER_TARGETS.md`
- `docs/WEEKLY_RESEARCH_PROCESS.md`
