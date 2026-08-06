# BNAT Knowledge Sheaf Standard

This standard provides formal definitions for the MOTU BNAT Knowledge Sheaf, aligning the fleet's algebraic geometry with its cognitive and operational modes.

## Cellular Sheaf $\mathcal{F}$
A **cellular sheaf** assigns a vector space (the stalk) to every agent, topic, or document in the system (nodes and edges of our interaction graph).

## Restriction Maps
Linear maps connecting the stalks, dictating how knowledge from an agent or topic restricts to a shared interaction (an edge). These encode the agreed-upon truth or standard of translation between nodes.

## Sheaf Laplacian Energy
The residual energy of a global state vector $x$ across the network is the **Dirichlet Energy**:
$$ E(x) = \frac{1}{2} x^T \Delta_{\mathcal{F}} x $$
where $\Delta_{\mathcal{F}}$ is the Sheaf Laplacian. $E(x) = 0$ implies absolute consensus. $E(x) > 0$ indicates a local or global conflict.

## $H^1$ Obstruction
The first cohomology group $H^1(\mathcal{F})$ measures the space of local consistencies that cannot be extended to a global consistency. A non-zero $H^1$ rank does **not** by itself constitute an obstruction—a cyclic interaction graph can have $\dim H^1 \geq 1$ while still admitting a consistent global section with $E(x) = 0$. An **obstruction** is declared only when a cohomology class $[\gamma] \in H^1(\mathcal{F})$ has no lift to a global section under the current restriction maps **and** the associated Dirichlet energy exceeds the threshold, i.e., $E(x) > \varepsilon$ for every candidate state $x$ in that cohomology class. Both conditions must hold simultaneously before the controller gate treats the cycle as a systemic tear.

## Persistent Homology Barcodes
By tracking the addition of information over time (a filtration), we compute **persistence barcodes**.
- $H^0$ bars track the connected components of consensus.
- $H^1$ bars track topological obstructions.
Long-lived $H^1$ bars must be escalated; they are systemic tears and must never be silently glued.

## Hard Controller Rule
**No WR assignment or high-blast PR is allowed while $E(x) > \varepsilon$.**
Before action is taken, the fleet must heal energy via Neural Sheaf Diffusion or escalate long-lived topological tears via the grounding gate.
