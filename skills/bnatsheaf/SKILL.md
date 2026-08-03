# BNAT Sheaf Skill

**Description:** Mathematically enforces consistency between an agent's worldview and the repository state using cellular sheaf theory.

## Usage

This skill exposes two primary executable routines that agents must run as part of the Knowledge Sheaf grounding process:

### 1. Imprint at Spawn
Before taking any action, run the imprint script to assert the current state of the Knowledge Sheaf. This guarantees you are not hallucinating a starting state.

```bash
python3 bnatsheaf/scripts/imprint_agent.py <agent_id>
```

If the script fails (H^1 > 0), the agent must either halt and escalate or resolve the topological obstructions before proceeding with feature work.

### 2. Consistency Check
After making structural changes or resolving obstructions, run the consistency check to verify the global sheaf Laplacian energy $E(x)$ has returned to 0.

```bash
python3 bnatsheaf/scripts/consistency_check.py
```

## MOTU Directive
The MOTU Lead strictly oversees these checks. Do not bypass them. Any deployment with $E(x) > 0$ is a critical violation of fleet invariants.
