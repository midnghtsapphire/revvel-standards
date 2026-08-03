# Neural Sheaf Diffusion (NSD) Exploration

## Lineage
Following Bodnar et al. (NeurIPS 2022), Neural Sheaf Diffusion (NSD) upgrades standard Graph Neural Networks by associating cellular sheaves to the underlying graph, learning restriction maps to handle complex heterophily.

## Discrete Layer
In our `bnatsheaf` implementation, the NSD layer acts as a discrete explicit Euler diffusion process. The update rule is:
$$ x_{t+1} = x_t - \eta \Delta_{\mathcal{F}} x_t $$
where $\Delta_{\mathcal{F}} = \delta^T \delta$ is the Sheaf Laplacian.

## Mapping to Energy
The driving mechanism of this diffusion is to minimize the Dirichlet energy:
$$ E(x) = \frac{1}{2} x^T \Delta_{\mathcal{F}} x $$
By stepping in the negative gradient direction of the Laplacian, the system flows towards consensus, dynamically healing local conflicts without tearing the topology.

## Imprint-at-Spawn Integration
When an agent spawns, it inherits restriction maps from the deterministic `CellularSheaf`. If the agent starts with high residual energy ($E(x) > \varepsilon$), the discrete NSD layer can be triggered to simulate a rapid learning or consensus phase, allowing the agent to naturally align before acting.
