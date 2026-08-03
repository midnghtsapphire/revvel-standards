# BNAT Knowledge Sheaf

The BNAT Knowledge Sheaf is the mathematical correctness substrate for the multi-agent fleet. It enforces topological consistency across the agents' states and topics using cellular sheaves, cohomology, and persistent homology.

## Living Example Integration

This pure-Python mathematical substrate runs alongside the living Javascript components.
- **Living Feed:** `scripts/biome/sheaf.js` and `docs/biome/biome-status.json` remain the operational living feed.
- **Verification Layer:** The Python `bnatsheaf` acts as the verifier that emits topological fingerprints into the living JSON.

## Imprint-at-Spawn Rule

**Every new agent must be imprinted at spawn.**
Before an agent starts any work, it must call the restrict function from the knowledge sheaf to assert that its initial energy $E(x) < \varepsilon$ and $H^1 \approx 0$. This ensures the agent does not begin operations while the global state holds a topological obstruction.

See [BNAT_SHEAF_STANDARD.md](./BNAT_SHEAF_STANDARD.md) for detailed mathematical specifications.
