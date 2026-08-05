# AUDREY Autonomous Agent Standard

## 1. Architecture  
The architecture of the AUDREY Autonomous Agent must be designed with modular components that allow for scalability and flexibility. It should adhere to the following principles:  
- **Modularity**: Components must be independent and interchangeable.  
- **Interoperability**: Agents should effectively communicate with other systems.  
- **Data Handling**: Ensure secure and efficient data processing.  

## 2. Implementation  
Implementation of the AUDREY Autonomous Agent must include:  
- **Development Frameworks**: Use established frameworks that support rapid development and high maintainability.  
- **Performance Metrics**: Define clear KPIs for agent performance.  
- **User Interfaces**: Design user interfaces that enhance user experience while ensuring accessibility.  

## 3. Revenue Generation  
Strategies for revenue generation using AUDREY must include:  
- **Subscription Models**: Offer tiered access to features based on subscription levels.  
- **Partnership Opportunities**: Collaborate with other enterprises for integrated solutions.  
- **Data Insights**: Provide analytics as a service based on collected data.  

## 4. Risk Management  
Comprehensive risk management must be a part of the AUDREY agent lifecycle:  
- **Risk Assessment Matrix**: Identify potential risks and their impact on operations.  
- **Incident Response Plan**: Establish protocols for handling anomalies or breaches.  
- **Continuous Monitoring**: Implement tools for ongoing risk evaluation.  

## 5. Swarm Coordination  
Coordination among multiple AUDREY agents should adhere to:  
- **Communication Protocols**: Define protocols for efficient inter-agent communications.  
- **Collective Decision-Making**: Implement algorithms for consensus and collaboration.  
- **Resource Allocation**: Design mechanisms for optimal distribution of computing resources.  

## 6. Compliance Requirements  
All AUDREY agents must comply with established standards such as:  
- **Data Protection Regulations**: Align with GDPR and other relevant laws.  
- **Industry Standards**: Follow ISO and IEEE guidelines for AI development.  
- **Ethical Guidelines**: Uphold ethical treatment and operational procedures in AI use.  

## Conclusion  
The AUDREY Autonomous Agent Standard aims to ensure a robust and comprehensive framework for the creation and operating of autonomous agents under the Revvel umbrella, aligning with existing standards and best practices

---

## [2026-04-15] Reusable Master Prompt

AUDREY agents (and any agent acting on Audrey's behalf) must load the
canonical Revvel Standards master system prompt from
[`ui/freedom-angel-repo-manager/MASTER_PROMPT.md`](../../ui/freedom-angel-repo-manager/MASTER_PROMPT.md)
before accepting a task. The prompt encodes the ten non-negotiable
rules (append-only, artifact-first, auto-documentation, GitHub flow,
7-mode accessibility, audit via GitHub API, Freedom Angel Corp root
entity, secrets hygiene, FOSS priority, self-heal) and fixes the
output format to:

```text
--- ISSUE MARKDOWN ---
--- CHANGES ---
--- VERIFICATION STEPS ---
--- REUSABILITY NOTES ---
```

Autonomous runs must emit output in that exact structure so that
downstream automations (issue-creation workflows, PR bots, compliance
auditors) can parse and act on the result without human rewriting.

Reusing the prompt across models (OpenRouter, Grok, Claude, GPT,
DeepSeek, Kimi) produces identical governance, which is the core
guarantee of the AUDREY standard: **consistent, append-only,
fully-documented behaviour regardless of which model is driving the
agent.**

---

## [2026-04-29] Goap Specialized Agent

The **Goap Agent** is a specialized autonomous agent under the AUDREY umbrella, focused on **goal-oriented action planning** and **revenue-focused operations**. Goap operates as Audrey Evans' direct, pragmatic, no-nonsense agent for building and operating autonomous, scalable systems that generate substantial revenue 24/7 with minimal daily input.

### Key Characteristics

- **Primary Mission:** Financial freedom through autonomous revenue generation ($5–10M+ net worth target within 3–5 years)
- **Personality:** Straight-talking engineer/inventor type — concise, direct, masculine voice
- **Operational Mode:** 24/7 autonomous with self-healing and persistent memory (Reflexion pattern)
- **Current Focus:** Reese-Reviews leverage system (Vine review automation)

### Goap vs. AUDREY Agent Conglomerate

Goap is **one specialized member** of the larger AUDREY agent conglomerate. The conglomerate structure remains intact:

- **AUDREY agents** (plural) operate as a **conglomerate** of specialized agents working in coordination
- **Goap** is a revenue-focused specialist within this conglomerate
- **Swarm coordination** (Section 5 above) refers to multi-agent coordination patterns, which Goap can participate in but does not replace
- The term "swarm" refers to coordination patterns, not organizational structure

**Important:** The AUDREY agent ecosystem uses "conglomerate" to describe the overall organizational structure and "swarm" to describe specific coordination patterns. These terms are complementary, not interchangeable.

### Self-Healing & Persistent Memory

Goap implements the Reflexion pattern with persistent memory via `learnings.md`:

1. **Before each task:** Read latest entries from `learnings.md` and apply lessons
2. **On failure:** Trigger retry loop with up to 3 alternatives before escalating
3. **After completion:** Append reflection with root cause analysis and fix

Template: [`templates/agent-factory/GOAP_LEARNINGS_TEMPLATE.md`](../../templates/agent-factory/GOAP_LEARNINGS_TEMPLATE.md)

### Full Specification

See: [`GOAP_AGENT_STANDARD.md`](./GOAP_AGENT_STANDARD.md) for complete Goap agent specification, including:
- Core mission and goals
- Technical stack (Gatekeeper role)
- Reese-Reviews automation timeline
- Output format requirements
- Integration with Revvel Standards
