# BNAT Sheaf Skill

## Purpose
Provides the algebraic geometry foundation for computing topological consistency and Dirichlet energy across agent states.

## Capabilities
- **Cellular Sheaf:** Computes coboundary matrices and Sheaf Laplacians.
- **Cohomology:** Calculates H0 (consensus components) and H1 (obstructions/tears).
- **Persistence Diagrams:** Tracks births and deaths of topological features.
- **Neural Sheaf Diffusion:** Reduces residual energy via discrete Euler diffusion.

## Usage
Agents must utilize the `bnatsheaf` module to invoke the imprint-at-spawn rule before acting, ensuring $E(x) < \varepsilon$ and reporting any $H^1$ obstructions.
