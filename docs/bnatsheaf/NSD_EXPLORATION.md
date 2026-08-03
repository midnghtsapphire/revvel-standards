# Neural Sheaf Diffusion (NSD) Exploration

## Concept
Following the rigid $H^1 \approx 0$ constraint implemented in the BNAT Sheaf (v1), the next evolutionary step for the fleet's cognitive architecture is **Neural Sheaf Diffusion**.

Instead of purely rigid restriction maps (e.g., $F(v) \to F(e)$ where values must perfectly equal), NSD introduces learnable restriction maps and sheaf Laplacians that are optimized over time.

## Objective
To allow agents to tolerate *epsilon-bounded* ambiguities during complex migrations or systemic refactors, while maintaining a mathematically provable boundary on divergence.

## How it works (Theoretical Stub)
1. **Learnable Weights:** Instead of `lambda x: x`, edges possess learnable weight matrices $W_e$.
2. **Diffusion Process:** Information diffuses across the network over time $t$:
   $$X(t+1) = X(t) - \Delta_{F} X(t)$$
   where $\Delta_{F}$ is the sheaf Laplacian.
3. **Training Signal:** The system trains $W_e$ to minimize $H^1$ obstructions over successful historical PRs, effectively learning the natural bounds of the repository's architecture.

## Next Steps
- Collect telemetry from `bnatsheaf/scripts/ph_monitor.py` for 30 days.
- Implement a PyTorch stub mapping historical JSON states to tensor operations.
- Introduce an NSD agent (e.g., the 'Radiochaser' topology variant) that recommends optimal paths to resolution when $H^1 > 0$.
