# BNAT Knowledge Sheaf

The BNAT Knowledge Sheaf is the mathematical correctness substrate for the multi-agent fleet. It enforces topological consistency across the agents' states and topics using cellular sheaves, cohomology, and persistent homology.

## Living Example Integration

This pure-Python mathematical substrate runs alongside the living Javascript components.
- **Living Feed:** `scripts/biome/sheaf.js` and `docs/biome/biome-status.json` remain the operational living feed.
- **Verification Layer (planned):** The Python `bnatsheaf` will emit topological fingerprints into the living JSON once the integration is wired. As of now `bnatsheaf` is a standalone library; `scripts/biome/sheaf.js` writes its existing status object directly and does not yet read from `bnatsheaf`.

## Imprint-at-Spawn Rule

**Every new agent must be imprinted at spawn.**
Before an agent starts any work, it must call `bnatsheaf.imprint_agent.imprint_agent(sheaf, x=state_vector)` to assert that its initial energy $E(x) < \varepsilon$ and $H^1 = 0$. The callable gate is implemented in `bnatsheaf/imprint_agent.py`. Raise an error and halt if it returns `passed: false`.

See [BNAT_SHEAF_STANDARD.md](./BNAT_SHEAF_STANDARD.md) for detailed mathematical specifications.
