# NVIDIA NemoClaw Research Report

> Scope: Evaluate [`NVIDIA/NemoClaw`](https://github.com/NVIDIA/NemoClaw) for inclusion
> in the revvel-standards ecosystem — either as a **module** pulled into an existing
> app or as a **standalone wrapped app** — and determine whether it can be used to
> stand up an agent team suitable for `openaudrey` and/or `freedomangelcorps`, with
> room for resale.
>
> Companion document: [`openclaw-blue-ocean-research.md`](./openclaw-blue-ocean-research.md)

---

## 1. Executive Summary

`NVIDIA/NemoClaw` is NVIDIA's blueprint for running **OpenClaw** agents more
securely inside an NVIDIA-managed runtime. It is **not a net-new agent
framework** — it layers three things on top of the existing OpenClaw agent
platform that we have already catalogued in
[`openclaw-blue-ocean-research.md`](./openclaw-blue-ocean-research.md):

1. **OpenShell runtime** — a sandboxed container with strict filesystem,
   network, process, and device policy.
2. **Privacy Router** — routes inference to a **local NVIDIA Nemotron model**
   by default, and only egresses to cloud LLMs when policy allows.
3. **Network Policy Engine** — default-deny outbound network, with explicit
   operator approval and full audit.

That combination directly closes three of the most painful gaps we already
flagged for OpenClaw (the "Black Box," "Prompt Injection Defenses," and
"Sandboxed Skill Execution" items in the Blue Ocean top-20), which makes it
the **fastest way to harden** anything we build on OpenClaw.

**Recommendation:** adopt NemoClaw as a **module / runtime layer** underneath
our existing OpenClaw work, and ship a thin **standalone wrapper app** on top
of it branded for `freedomangelcorps` (enterprise / sellable) and reused by
`openaudrey` (consumer-friendly "Reese's Mode" UI). Details below.

---

## 2. What NemoClaw Actually Is (vs. OpenClaw)

| Layer | OpenClaw (base) | NemoClaw (NVIDIA) |
| :--- | :--- | :--- |
| Agent platform | ✅ Core agent runtime, skills, memory | Uses OpenClaw unchanged |
| Orchestration | ✅ Multi-agent, skills, MCP | Uses OpenClaw unchanged |
| Execution sandbox | ⚠️ Bring-your-own / partial | ✅ **OpenShell** — policy-based sandbox |
| Inference routing | ⚠️ Direct to provider | ✅ **Privacy Router** (local-first, cloud on policy) |
| Network control | ❌ Open egress | ✅ **Default-deny + audit** |
| Local model | Optional | ✅ Nemotron (NVIDIA local LLM) |
| Install / ops CLI | Varies | ✅ One-line install; Linux / WSL2 / macOS (Colima) |
| Agent marketplace / rental | ❌ | ❌ (still a blue-ocean opportunity for us) |
| Accessibility / non-coder UI | ❌ | ❌ (still a blue-ocean opportunity for us) |

**What changed vs. plain OpenClaw:**
- NemoClaw does **not** replace the agent framework — it *wraps* it.
- It adds the security/privacy posture that the "OpenClaw Incident" (see
  §4 of `openclaw-blue-ocean-research.md`) specifically called out.
- It assumes NVIDIA hardware/drivers are available for best local
  performance, but it can fall back to cloud inference.

**What's still missing (our differentiation space):**
- No marketplace, no rental, no reputation/insurance, no skill antivirus,
  no voice-first/accessibility UI, no cross-agent social graph.
  All of these remain open for us to build on top.

---

## 3. Module vs. Standalone App — Decision

We can do **both**, in this order:

### 3a. Phase 1 — Consume NemoClaw as a **module / runtime**
- Treat NemoClaw as a dependency of our OpenClaw-based services.
- Our agents keep being built against the OpenClaw contract; NemoClaw
  provides the sandbox + privacy router underneath them.
- Deliverable: a `nemoclaw/` runtime profile under `install/` that our
  deploy scripts select when a host has the NemoClaw CLI present.

### 3b. Phase 2 — Ship a **standalone wrapper app**
- A thin product ("agent team console") that bundles:
  - NemoClaw runtime (secure sandbox + privacy router)
  - OpenClaw agent framework
  - Our MCP catalog (see `MCP_REVVEL_CATALOG.md`)
  - Our accessibility/"Reese's Mode" UI layer
  - Our monetization hooks (rental, skill store — see Blue Ocean report)
- Two brandings of the same app:
  - **`freedomangelcorps`** — enterprise / sellable SKU, default-deny
    networking, audit logs, compliance posture.
  - **`openaudrey`** — consumer / creator SKU, same runtime, friendlier
    onboarding, non-coder UI.

### Why both
The module gets us hardened agents **this sprint**. The wrapper is what we
actually *sell* and is where our differentiation (marketplace, rental,
accessibility) lives. Building the wrapper without first consuming the
module means we'd be shipping the same security gaps the OpenClaw incident
exposed.

---

## 4. Can It Create an Agent Team

Yes. NemoClaw inherits OpenClaw's multi-agent orchestration, so an agent
team is expressible as:

- **Team definition:** a config file describing N agents, their skills,
  their memory scope, and their allowed egress.
- **Sandboxing:** each agent runs in its own OpenShell profile — this is
  the piece we don't get from OpenClaw alone.
- **Shared state:** OpenClaw memory + our GraphMemory fork for cross-agent
  context (already catalogued in `REPO_CATALOG.md`).
- **Inference:** Privacy Router pins sensitive roles (e.g. legal,
  financial) to local Nemotron; creative/research roles can egress to
  OpenRouter/Anthropic/OpenAI within policy.

Minimum viable team for v1:
1. **Researcher** (cloud egress allowed, read-only FS)
2. **Editor/Writer** (local-only inference, scoped FS write)
3. **Dispatcher** (no egress, coordinates the other two)
4. **Auditor** (read-only, produces the "Black Box" recording)

This maps cleanly onto the roles we already discuss in
`GROWLINGEYES_MASTER_SPEC.md` and `openclaw-agent-onboarding.md`.

---

## 5. Licensing / Resale Considerations

Before we commit to selling a wrapper, we need to confirm the following
items against the upstream repository at time of integration — do **not**
treat the answers below as final until a maintainer signs off:

- [ ] Confirm `NVIDIA/NemoClaw` license and whether it permits
      commercial redistribution of the runtime, or only of a wrapper that
      links to it.
- [ ] Confirm Nemotron model license — commercial redistribution vs.
      commercial *use* are different grants.
- [ ] Confirm trademark policy — our sellable SKU must not imply NVIDIA
      endorsement; use "Powered by NemoClaw" phrasing only if permitted.
- [ ] Confirm that telemetry in the NemoClaw CLI can be disabled for the
      `freedomangelcorps` enterprise SKU.

Any redistribution plan is **blocked** on the first three items above.

---

## 6. Integration Plan (minimum path)

1. Add a `nemoclaw` entry to `docs/REPO_CATALOG.md` / `_MASTER_INVENTORY.md`
   with the upstream URL and status `Research`.
2. Create an `install/nemoclaw.sh` placeholder that documents the one-line
   NVIDIA installer and our expected env vars (no secrets committed — see
   `SECRETS_MANAGEMENT.md`).
3. Add a `standards/` note that any new OpenClaw-based service MUST be
   runnable under a NemoClaw OpenShell profile (default-deny egress).
4. Prototype the Phase-2 wrapper app in a new repo
   (`freedomangelcorps/agent-team-console`) that vendors NemoClaw as a
   runtime dependency and exposes our MCP catalog.
5. Fork the same UI into an `openaudrey`-branded consumer variant once the
   enterprise SKU is stable.

Owner: TBD. Blocked on §5 licensing confirmation before step 4.

---

## 7. Open Questions

- Does NemoClaw's Privacy Router expose hooks we can use for our token
  arbitrage / unified credit system (Blue Ocean item #11)?
- Can OpenShell profiles be generated per-skill from our existing
  skill manifests, or does each skill need a hand-written profile?
- How does NemoClaw's audit log compare to the "Agent Activity Black
  Box Recorder" we want (Blue Ocean item #17)? If it's close, we reuse;
  if not, we layer on top.
- Is there a supported path for non-NVIDIA hardware (CPU-only / AMD)?
  This matters for `openaudrey` end users who don't own NVIDIA GPUs.

---

## 8. Summary Recommendation

- **Use NemoClaw as a module first**, underneath our existing OpenClaw
  work, to immediately close the security gaps flagged by the OpenClaw
  incident.
- **Then wrap it as a standalone app** for `freedomangelcorps` (sellable,
  enterprise) and re-skin for `openaudrey` (consumer, accessibility-first).
- **Our moat is not the runtime** — NVIDIA will maintain that. Our moat is
  the **marketplace, rental, reputation, accessibility, and MCP catalog**
  layers that NemoClaw and OpenClaw both still lack.
- **Do not ship a paid SKU until §5 licensing is confirmed.**
