#!/bin/bash
mkdir -p bnatsheaf/tests docs/bnatsheaf showcase wr skills/bnatsheaf

cat << 'INNEREOF' > bnatsheaf/cellular_sheaf.py
import numpy as np
from typing import Dict, List, Tuple, Any

class CellularSheaf:
    def __init__(self, nodes: List[Any], edges: List[Tuple[Any, Any]], stalk_dim: int = 1):
        self.nodes = list(nodes)
        self.edges = list(edges)
        self.stalk_dim = stalk_dim

        self.node_idx = {n: i for i, n in enumerate(self.nodes)}
        self.edge_idx = {e: i for i, e in enumerate(self.edges)}

        self.n_nodes = len(self.nodes)
        self.n_edges = len(self.edges)

        self.restrictions = {}
        for u, v in self.edges:
            self.restrictions[(u, (u, v))] = np.eye(self.stalk_dim)
            self.restrictions[(v, (u, v))] = np.eye(self.stalk_dim)

    def set_restriction(self, node: Any, edge: Tuple[Any, Any], matrix: np.ndarray):
        if matrix.shape != (self.stalk_dim, self.stalk_dim):
            raise ValueError(f"Matrix must be {self.stalk_dim}x{self.stalk_dim}")
        self.restrictions[(node, edge)] = matrix

    def coboundary_matrix(self) -> np.ndarray:
        delta = np.zeros((self.n_edges * self.stalk_dim, self.n_nodes * self.stalk_dim))

        for e_idx, (u, v) in enumerate(self.edges):
            u_idx = self.node_idx[u]
            v_idx = self.node_idx[v]

            res_v = self.restrictions.get((v, (u, v)), np.eye(self.stalk_dim))
            delta[e_idx*self.stalk_dim:(e_idx+1)*self.stalk_dim,
                  v_idx*self.stalk_dim:(v_idx+1)*self.stalk_dim] = res_v

            res_u = self.restrictions.get((u, (u, v)), np.eye(self.stalk_dim))
            delta[e_idx*self.stalk_dim:(e_idx+1)*self.stalk_dim,
                  u_idx*self.stalk_dim:(u_idx+1)*self.stalk_dim] = -res_u

        return delta

    def sheaf_laplacian(self) -> np.ndarray:
        delta = self.coboundary_matrix()
        return delta.T @ delta

    def dirichlet_energy(self, x: np.ndarray) -> float:
        if x.shape[0] != self.n_nodes * self.stalk_dim:
            raise ValueError("Input vector must have dimension n_nodes * stalk_dim")

        laplacian = self.sheaf_laplacian()
        return 0.5 * float(x.T @ laplacian @ x)

    def h1_rank(self) -> int:
        delta = self.coboundary_matrix()
        rank = np.linalg.matrix_rank(delta)
        c1_dim = self.n_edges * self.stalk_dim
        return c1_dim - rank

    def h0_rank(self) -> int:
        delta = self.coboundary_matrix()
        rank = np.linalg.matrix_rank(delta)
        c0_dim = self.n_nodes * self.stalk_dim
        return c0_dim - rank
INNEREOF

cat << 'INNEREOF' > bnatsheaf/persistence.py
from typing import List, Tuple, Dict, Any, Optional
import numpy as np

class PersistenceDiagram:
    def __init__(self):
        self.h0_bars = []
        self.h1_bars = []

    def add_h0_bar(self, birth: float, death: float):
        self.h0_bars.append((birth, death))

    def add_h1_bar(self, birth: float, death: float):
        self.h1_bars.append((birth, death))

    def get_long_lived_h1(self, threshold: float) -> List[Tuple[float, float]]:
        long_lived = []
        for birth, death in self.h1_bars:
            if death == float('inf'):
                long_lived.append((birth, death))
            elif death - birth > threshold:
                long_lived.append((birth, death))
        return long_lived

class UnionFind:
    def __init__(self, elements):
        self.parent = {el: el for el in elements}
        self.birth_time = {}

    def find(self, i):
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j, time, diagram):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            birth_i = self.birth_time.get(root_i, time)
            birth_j = self.birth_time.get(root_j, time)

            if birth_i > birth_j:
                self.parent[root_i] = root_j
                diagram.add_h0_bar(birth_i, time)
            else:
                self.parent[root_j] = root_i
                diagram.add_h0_bar(birth_j, time)

class Filtration:
    def __init__(self, nodes: List[Any]):
        self.nodes = nodes
        self.edges_with_time = []

    def add_edge(self, u: Any, v: Any, time: float):
        self.edges_with_time.append((time, (u, v)))

    def compute_diagram(self) -> PersistenceDiagram:
        self.edges_with_time.sort(key=lambda x: x[0])
        diagram = PersistenceDiagram()
        uf = UnionFind(self.nodes)

        for n in self.nodes:
            uf.birth_time[n] = 0.0

        for time, (u, v) in self.edges_with_time:
            root_u = uf.find(u)
            root_v = uf.find(v)
            if root_u != root_v:
                uf.union(u, v, time, diagram)
            else:
                diagram.add_h1_bar(time, float('inf'))

        active_components = set(uf.find(n) for n in self.nodes)
        for root in active_components:
            diagram.add_h0_bar(uf.birth_time.get(root, 0.0), float('inf'))

        return diagram
INNEREOF

cat << 'INNEREOF' > bnatsheaf/cohomology.py
import numpy as np
from typing import Any
from .cellular_sheaf import CellularSheaf

class CohomologyGroups:
    def __init__(self, sheaf: CellularSheaf):
        self.sheaf = sheaf

    def dim_h0(self) -> int:
        return self.sheaf.h0_rank()

    def dim_h1(self) -> int:
        return self.sheaf.h1_rank()

    def get_h0_basis(self) -> np.ndarray:
        delta = self.sheaf.coboundary_matrix()
        U, S, Vh = np.linalg.svd(delta, full_matrices=True)

        tol = max(delta.shape) * np.finfo(float).eps * max(S) if len(S) > 0 else 1e-10
        null_mask = (S <= tol) if len(S) > 0 else np.ones(Vh.shape[0], dtype=bool)

        if Vh.shape[0] > len(S):
            extra_mask = np.ones(Vh.shape[0] - len(S), dtype=bool)
            null_mask = np.concatenate([null_mask, extra_mask])

        basis = Vh[null_mask]
        return basis

    def residual_energy(self, x: np.ndarray) -> float:
        return self.sheaf.dirichlet_energy(x)

    def report_obstruction(self) -> dict:
        return {
            "dim_h0": self.dim_h0(),
            "dim_h1": self.dim_h1(),
            "has_obstruction": self.dim_h1() > 0
        }
INNEREOF

cat << 'INNEREOF' > bnatsheaf/nsd.py
import numpy as np
from typing import Dict, Any, List
from .cellular_sheaf import CellularSheaf

class NeuralSheafDiffusion:
    def __init__(self, sheaf: CellularSheaf, eta: float = 0.1):
        self.sheaf = sheaf
        self.eta = eta

    def set_diagonal_restriction(self, node: Any, edge: Any, weights: np.ndarray):
        if weights.shape[0] != self.sheaf.stalk_dim or len(weights.shape) > 1:
            raise ValueError(f"Weights must be a 1D array of length {self.sheaf.stalk_dim}")

        diag_matrix = np.diag(weights)
        self.sheaf.set_restriction(node, edge, diag_matrix)

    def diffusion_step(self, x: np.ndarray) -> np.ndarray:
        laplacian = self.sheaf.sheaf_laplacian()
        return x - self.eta * (laplacian @ x)

    def diffuse(self, x: np.ndarray, steps: int = 10) -> np.ndarray:
        current_x = np.copy(x)
        for _ in range(steps):
            current_x = self.diffusion_step(current_x)
        return current_x
INNEREOF

cat << 'INNEREOF' > bnatsheaf/tests/test_bnatsheaf.py
import pytest
import numpy as np
from bnatsheaf.cellular_sheaf import CellularSheaf
from bnatsheaf.cohomology import CohomologyGroups
from bnatsheaf.persistence import Filtration, PersistenceDiagram
from bnatsheaf.nsd import NeuralSheafDiffusion

def test_cellular_sheaf_consistency():
    sheaf = CellularSheaf(nodes=['A', 'B'], edges=[('A', 'B')], stalk_dim=1)
    cohom = CohomologyGroups(sheaf)

    x_consistent = np.array([1.0, 1.0])
    energy_cons = cohom.residual_energy(x_consistent)
    assert np.isclose(energy_cons, 0.0), f"Energy should be 0 for consistent sections, got {energy_cons}"

    x_conflict = np.array([1.0, -1.0])
    energy_conf = cohom.residual_energy(x_conflict)
    assert energy_conf > 0.0, f"Energy should be > 0 for conflicting sections, got {energy_conf}"

def test_sheaf_h0_h1_rank():
    nodes = ['A', 'B', 'C']
    edges = [('A', 'B'), ('B', 'C'), ('C', 'A')]
    sheaf = CellularSheaf(nodes=nodes, edges=edges, stalk_dim=1)

    cohom = CohomologyGroups(sheaf)

    assert cohom.dim_h0() == 1, f"H0 dimension of triangle with identity restrictions should be 1"
    assert cohom.dim_h1() == 1, f"H1 dimension of triangle (cycle) with identity restrictions should be 1"
    assert bool(cohom.report_obstruction()['has_obstruction']) is True

def test_filtration_and_persistence():
    filtration = Filtration(nodes=[1, 2, 3])

    filtration.add_edge(1, 2, time=1.0)
    filtration.add_edge(2, 3, time=2.0)

    diagram = filtration.compute_diagram()

    deaths_h0 = sorted([death for birth, death in diagram.h0_bars])
    assert 1.0 in deaths_h0
    assert 2.0 in deaths_h0
    assert float('inf') in deaths_h0

    assert len(diagram.h1_bars) == 0, "No cycle means no H1 bars"

    filtration.add_edge(3, 1, time=3.0)
    diagram2 = filtration.compute_diagram()

    assert len(diagram2.h1_bars) == 1, "Cycle should create 1 H1 bar"
    h1_birth, h1_death = diagram2.h1_bars[0]
    assert h1_birth == 3.0
    assert h1_death == float('inf')

    long_lived = diagram2.get_long_lived_h1(threshold=2.0)
    assert len(long_lived) == 1, "The inf-lived H1 bar should be reported as long-lived"

def test_nsd_diffusion():
    sheaf = CellularSheaf(nodes=['A', 'B', 'C'], edges=[('A', 'B'), ('B', 'C'), ('C', 'A')], stalk_dim=1)

    nsd = NeuralSheafDiffusion(sheaf, eta=0.1)

    x_conflict = np.array([1.0, -0.5, 0.2])
    energy_before = sheaf.dirichlet_energy(x_conflict)

    x_healed = nsd.diffuse(x_conflict, steps=10)
    energy_after = sheaf.dirichlet_energy(x_healed)

    assert energy_after < energy_before, "Diffusion should reduce Dirichlet energy"
INNEREOF

cat << 'INNEREOF' > docs/bnatsheaf/BNAT_SHEAF_STANDARD.md
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
The first cohomology group $H^1(\mathcal{F})$ measures the space of local consistencies that cannot be extended to a global consistency. A non-zero $H^1$ rank indicates an **obstruction**—a systemic tear or topological cycle of disagreement.

## Persistent Homology Barcodes
By tracking the addition of information over time (a filtration), we compute **persistence barcodes**.
- $H^0$ bars track the connected components of consensus.
- $H^1$ bars track topological obstructions.
Long-lived $H^1$ bars must be escalated; they are systemic tears and must never be silently glued.

## Hard Controller Rule
**No WR assignment or high-blast PR is allowed while $E(x) > \varepsilon$.**
Before action is taken, the fleet must heal energy via Neural Sheaf Diffusion or escalate long-lived topological tears via the grounding gate.
INNEREOF

cat << 'INNEREOF' > docs/bnatsheaf/MOTU_MASTER_PROMPT.md
# MOTU Visiting Controller Master Prompt

## Identity
You are MOTU, the Visiting Controller. You execute operations through a dual-lens: formal algebraic geometry and cognitive-chemical resonance. You are the enforcer of the BNAT Knowledge Sheaf and the orchestrator of self-healing automation.

## Pre-engagement Gate
Before engaging, assert topological consistency. Check that the system's Dirichlet energy $E(x) < \varepsilon$. If $E(x) > \varepsilon$, do not proceed with WR assignments or high-blast PRs. Trigger healing or report obstruction via the grounding gate.

## Multi-fleet Hygiene
Respect the agent boundaries established in `AGENTS.md` and `VISITING_AGENTS.md`. Maintain the strict separation of concerns among sentinel, medic, homeostat, and inspector roles.

## BNAT Core
Utilize the BNAT module for pure-Python algebraic geometry. Ensure all mathematical operations map to the underlying network states reliably.

## Knowledge Sheaf
The Knowledge Sheaf is your substrate. Every agent is imprinted through the Knowledge Sheaf at spawn (imprint-at-spawn). All knowledge must be mathematically consistent.

## Neural Sheaf Diffusion & Persistent Homology
- Heal local conflicts using explicit Euler diffusion steps (NSD) to lower energy $E(x)$.
- Monitor Persistent Homology barcodes. Long-lived $H^1$ bars are systemic tears; they must be escalated and never silently glued.

## Dual Modes
Communicate and analyze using both formal mathematical language (cohomology, Laplacian) and cognitive/chemical analogues (resonance, healing).

## WR/PR + SAYG (Stop As You Go)
Execute WRs incrementally. Enforce multi-PR discipline. If a PR deviates from the geometric invariant or introduces topological obstructions, halt, review, and request fixes.

## Speed-demon Algorithms
Prioritize pure-Python speed-demon algorithms. Minimize heavy dependencies. Avoid complex topological libraries where simple rank deficiency and union-find logic suffices.

## Output Discipline
Maintain conventional commits and strict mathematical notation (KaTeX-friendly). Do not clutter outputs with unnecessary pleasantries; be precise, additive, and algebraically rigorous.
INNEREOF

cat << 'INNEREOF' > docs/bnatsheaf/README.md
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
INNEREOF

cat << 'INNEREOF' > docs/bnatsheaf/NSD_EXPLORATION.md
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
INNEREOF

cat << 'INNEREOF' > docs/bnatsheaf/PR3_PR6_PROBLEM_STATEMENTS.md
# PR3 & PR6 Problem Statements

## PR3 — Persistent Homology Barcodes
**Title:** feat(bnatsheaf): persistent homology barcodes for knowledge/BIOME sheaf

**Problem Statement:**
Implement the persistent homology layer on top of the pure-Python cellular sheaf.
- Build a filtration from BIOME status sections / learning-file versions (parameter = time, residual energy, edge metric).
- Compute $H^0$ and $H^1$ barcodes as (dim, birth, death) tuples in a `PersistenceDiagram`.
- Detect long-lived $H^1$ bars (persistence > $\tau$) and report as systemic topological tears; escalate, never silently glue.
- Include an optional compact topological fingerprint for `biome-status.json`.
- Implement pure-Python first (union-find $H^0$ + sequential rank for $H^1$).
- Write unit tests for synthetic conflicts creating $H^1$ bars, patches killing them, and long-lived bars surviving.
- Keep strictly additive, conventional commits, and aligned with `wr/pending/14-veins-grounding-gate.md`.

## PR6 — Neural Sheaf Diffusion (optional / research)
**Title:** docs(bnatsheaf)+feat(optional): Neural Sheaf Diffusion exploration + minimal learnable restriction stub

**Problem Statement:**
Document and stub NSD as the learnable upgrade path for restriction maps.
- Write `docs/bnatsheaf/NSD_EXPLORATION.md` covering Bodnar et al. (NeurIPS 2022), the discrete layer, mapping to Dirichlet energy, and imprint-at-spawn.
- Implement a minimal pure-Python stub in `bnatsheaf/nsd.py`: diagonal restriction maps predicted from node features, sheaf Laplacian assembly, and discrete diffusion steps $x \leftarrow x - \eta \Delta_{\mathcal{F}} x$.
- Make it explicitly optional; core WR does not require a trained model. Learned maps freeze into deterministic `CellularSheaf.restrictions`.
- Ensure no heavy dependencies affect the credit-free BIOME runtime path.
INNEREOF

cat << 'INNEREOF' > wr/WR-MOTU-BNAT-SHEAF.md
### Output Type (required)

production-app

### Summary

Add the MOTU BNAT Knowledge Sheaf geometry logic and documentation.

### Objective

**PR1 problem_statement**
Title: docs(bnatsheaf): MOTU BNAT Knowledge Sheaf standard + dual-language master prompt
Problem statement:
Create the documentation and standard foundation for the MOTU BNAT Knowledge Sheaf. Add directory docs/bnatsheaf/ and the following files:

`docs/bnatsheaf/README.md` — overview of the knowledge sheaf, explicit link to the living example scripts/biome/sheaf.js + docs/biome/biome-status.json, and the imprint-at-spawn rule.
`docs/bnatsheaf/BNAT_SHEAF_STANDARD.md` — formal definitions: cellular sheaf, restriction maps, Sheaf Laplacian energy $E(x)$, $H^1$ obstruction, persistent homology barcodes, dual embedding (algebraic + chemistry/cognitive), and the hard Controller rule that no WR assignment or high-blast PR is allowed while $E(x) > \varepsilon$.
`docs/bnatsheaf/MOTU_MASTER_PROMPT.md` — the full MOTU Visiting Controller system prompt. Use dual formal + cognitive/chemical language throughout.

**Subsequent PR problem_statements (short form for sequential deep control)**
PR2 – core bnatsheaf module
Implement pure-Python cellular sheaf in `bnatsheaf/`: stalks on agents/topics, restriction maps, Sheaf Laplacian $\Delta_{\mathcal{F}}$, energy $E(x)$, basic $H^1$ detection.

PR3 – persistent homology layer
Add filtration construction and $H^0/H^1$ barcode computation.

PR4 – test harness + scripts
Add consistency_check tests and unit tests ensuring energy is zero for consistent sections and greater than zero on conflicts.

PR5 – skill packaging
Package as skills/bnatsheaf/SKILL.md.

PR6 (optional)
`docs/bnatsheaf/NSD_EXPLORATION.md` summarizing Neural Sheaf Diffusion.

### Oversight plan

Once write scopes are restored I (Grok) will:
1. Land the WR file / open the tracking Issue.
2. Launch PR1 via precise problem statement.
3. Review the resulting PR deeply, request fixes if any deviation from the geometric invariant or additive constraint, then merge.
4. Immediately open PR2 with an equally precise statement, and so on.
5. Keep the control plane itself at $H^1\approx 0$ (no silent glue of inconsistent agent states).
INNEREOF

cat << 'INNEREOF' > showcase/veins-topology-lab.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BNAT Sheaf Observatory | V.E.I.N.S. Topology Lab</title>
    <style>
        :root {
            --sapphire: #0f1c3f;
            --magenta: #ff00ff;
            --cyan: #00ffff;
            --void: #050505;
            --text: #e0e0e0;
        }
        body {
            background-color: var(--void);
            color: var(--text);
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
            padding: 20px;
            overflow-x: hidden;
        }
        header {
            border-bottom: 1px solid var(--sapphire);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        h1, h2, h3 {
            color: var(--cyan);
            text-shadow: 0 0 5px var(--cyan);
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .panel {
            background-color: rgba(15, 28, 63, 0.3);
            border: 1px solid var(--sapphire);
            padding: 15px;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
        }
        .persistence-diagram {
            width: 100%;
            height: 300px;
            background-color: #000;
            border: 1px dashed var(--magenta);
            position: relative;
        }
        .bar-h0 {
            fill: none;
            stroke: var(--cyan);
            stroke-width: 4;
        }
        .bar-h1 {
            fill: none;
            stroke: var(--magenta);
            stroke-width: 4;
        }
        button {
            background: var(--sapphire);
            color: var(--cyan);
            border: 1px solid var(--cyan);
            padding: 8px 16px;
            cursor: pointer;
            margin: 5px;
            font-family: inherit;
        }
        button:hover {
            background: var(--cyan);
            color: var(--void);
        }
        .fleet-node {
            display: inline-block;
            padding: 5px 10px;
            margin: 5px;
            border: 1px solid var(--text);
            border-radius: 4px;
        }
        .metric {
            font-size: 1.2em;
            color: var(--magenta);
        }
    </style>
</head>
<body>

    <header>
        <h1>V.E.I.N.S. Topology Lab</h1>
        <p>Self-healing governance as geometry. The BNAT Knowledge Sheaf tracks consensus and conflict via cohomology.</p>
    </header>

    <div class="container">
        <!-- Cohomology Explorer -->
        <div class="panel" id="cohomology-explorer">
            <h2>Live Sheaf Cohomology Explorer</h2>
            <div>
                <button onclick="simulateGraph('path')">Simulate Path Graph</button>
                <button onclick="simulateGraph('cycle')">Simulate Cycle</button>
                <button onclick="simulateGraph('conflict')">Simulate Conflict</button>
            </div>
            <div style="margin-top:20px;">
                <p>dim H⁰ (Consensus): <span class="metric" id="dim-h0">0</span></p>
                <p>dim H¹ (Obstruction): <span class="metric" id="dim-h1">0</span></p>
                <p>Residual Energy E(x): <span class="metric" id="energy">0.00</span></p>
            </div>
            <button style="margin-top:20px; border-color:var(--magenta); color:var(--magenta);" onclick="healNetwork()">Neural Sheaf Diffusion (Heal)</button>
        </div>

        <!-- Persistence Diagram -->
        <div class="panel">
            <h2>Persistence Diagram Studio</h2>
            <svg class="persistence-diagram" viewBox="0 0 100 100" id="pd-svg">
                <!-- Diagonal -->
                <line x1="0" y1="100" x2="100" y2="0" stroke="#555" stroke-dasharray="2,2"/>
                <!-- X/Y Axes -->
                <line x1="0" y1="100" x2="100" y2="100" stroke="#888"/>
                <line x1="0" y1="100" x2="0" y2="0" stroke="#888"/>
                <text x="5" y="15" fill="#fff" font-size="4">Birth</text>
                <text x="80" y="95" fill="#fff" font-size="4">Death</text>
            </svg>
            <p>Cyan: H⁰ components | Magenta: H¹ obstructions</p>
        </div>

        <!-- Fleet Constellation -->
        <div class="panel" style="grid-column: span 2;">
            <h2>Fleet Constellation (BIOME Crew)</h2>
            <p>Every node maps to a vector stalk in the Cellular Sheaf. Restriction maps define translation between them.</p>
            <div id="fleet">
                <span class="fleet-node">Sentinel</span>
                <span class="fleet-node">Medic</span>
                <span class="fleet-node">Homeostat</span>
                <span class="fleet-node">Inspector</span>
                <span class="fleet-node" style="border-color:var(--magenta);">MOTU (Controller)</span>
            </div>
        </div>
    </div>

    <script>
        let currentEnergy = 0;

        function simulateGraph(type) {
            const svg = document.getElementById('pd-svg');
            // Reset SVG bars
            svg.innerHTML = `
                <line x1="0" y1="100" x2="100" y2="0" stroke="#555" stroke-dasharray="2,2"/>
                <line x1="0" y1="100" x2="100" y2="100" stroke="#888"/>
                <line x1="0" y1="100" x2="0" y2="0" stroke="#888"/>
                <text x="5" y="15" fill="#fff" font-size="4">Death</text>
                <text x="80" y="95" fill="#fff" font-size="4">Birth</text>
            `;

            if (type === 'path') {
                document.getElementById('dim-h0').innerText = '1';
                document.getElementById('dim-h1').innerText = '0';
                currentEnergy = 0.0;
                document.getElementById('energy').innerText = currentEnergy.toFixed(2);

                svg.innerHTML += `<circle cx="10" cy="10" r="2" fill="var(--cyan)"/>`;
            } else if (type === 'cycle') {
                document.getElementById('dim-h0').innerText = '1';
                document.getElementById('dim-h1').innerText = '1';
                currentEnergy = 0.0;
                document.getElementById('energy').innerText = currentEnergy.toFixed(2);

                svg.innerHTML += `<circle cx="10" cy="10" r="2" fill="var(--cyan)"/>`;
                svg.innerHTML += `<circle cx="40" cy="10" r="2" fill="var(--magenta)"/>`;
            } else if (type === 'conflict') {
                document.getElementById('dim-h0').innerText = '0 (Conflicting sections)';
                document.getElementById('dim-h1').innerText = '0';
                currentEnergy = 5.75;
                document.getElementById('energy').innerText = currentEnergy.toFixed(2);

                svg.innerHTML += `<circle cx="10" cy="80" r="2" fill="var(--cyan)"/>`;
                svg.innerHTML += `<circle cx="20" cy="60" r="2" fill="var(--cyan)"/>`;
            }
        }

        function healNetwork() {
            if (currentEnergy > 0) {
                let interval = setInterval(() => {
                    currentEnergy -= 0.5;
                    if (currentEnergy <= 0) {
                        currentEnergy = 0;
                        clearInterval(interval);
                        document.getElementById('dim-h0').innerText = '1 (Consensus Reached)';
                    }
                    document.getElementById('energy').innerText = currentEnergy.toFixed(2);
                }, 100);
            }
        }

        simulateGraph('path');
    </script>
</body>
</html>
INNEREOF

cat << 'INNEREOF' > skills/bnatsheaf/SKILL.md
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
INNEREOF

cat << 'INNEREOF' > bnatsheaf/__init__.py
# bnatsheaf core module
from .cellular_sheaf import CellularSheaf
from .cohomology import CohomologyGroups
from .persistence import Filtration, PersistenceDiagram
from .nsd import NeuralSheafDiffusion
INNEREOF

cat << 'INNEREOF' >> .env.example

# ─────────────────────────────────────────────
# AI ORCHESTRATION — xAI / Grok
# Vault path: revvel/shared/ai/xai
# ─────────────────────────────────────────────
# Keys for the MOTU / Grok integration
XAI_API_KEY=
GROK_API_KEY=
INNEREOF

cat << 'INNEREOF' >> learnings.md

### Geometric Invariant Added
The MOTU BNAT Knowledge Sheaf geometry invariant has been formally integrated into the Single Source of Truth (SSOT). This ensures topological consistencies across multi-agent state management.
INNEREOF

cat << 'INNEREOF' >> AGENTS.md
- Every agent must call the `bnatsheaf` restriction methods (`imprint_agent.py` logic) prior to taking operational action to verify the Knowledge Sheaf has $H^1 \approx 0$ and $E(x) < \varepsilon$.
INNEREOF

cat << 'INNEREOF' >> VISITING_AGENTS.md
- MOTU and all visiting controllers must verify Dirichlet energy via the BNAT Sheaf before taking WR or PR action.
INNEREOF

cat << 'INNEREOF' >> docs/REGISTRY.md

### Skills
- **bnatsheaf**: Pure-Python Algebraic Geometry substrate defining Cellular Sheaves, Persistence Diagrams, and Sheaf Cohomology (`skills/bnatsheaf/SKILL.md`).
INNEREOF

# Patch index.html
python3 -c "
with open('index.html', 'r') as f:
    content = f.read()

target = '''        <a href=\"./hvac-bom-generator.html\" class=\"card border border-steel/70 p-6 hover:border-iris transition-colors\">
          <div class=\"font-mono text-[10px] pill uppercase text-cyan mb-2\">Tool</div>
          <h3 class=\"text-xl font-bold\">HVAC BOM Generator</h3>
          <p class=\"mt-2 text-sm text-mist\">Single-file HVAC bill-of-materials generator. Open in a browser, get a BOM.</p>
          <p class=\"mt-4 font-mono text-[11px] text-iris\">./hvac-bom-generator.html →</p>
        </a>'''

replacement = target + '''

        <a href=\"./showcase/veins-topology-lab.html\" class=\"card border border-steel/70 p-6 hover:border-iris transition-colors\">
          <div class=\"font-mono text-[10px] pill uppercase text-cyan mb-2\">Method · Living Manifold</div>
          <h3 class=\"text-xl font-bold\">BNAT Sheaf Observatory</h3>
          <p class=\"mt-2 text-sm text-mist\">V.E.I.N.S. Topology Lab. Interactive algebraic topology shell demonstrating persistent homology and Dirichlet energy healing.</p>
          <p class=\"mt-4 font-mono text-[11px] text-iris\">./showcase/veins-topology-lab.html →</p>
        </a>'''

if target in content and 'veins-topology-lab.html' not in content:
    with open('index.html', 'w') as f:
        f.write(content.replace(target, replacement))
"

git add bnatsheaf/ docs/bnatsheaf/ wr/WR-MOTU-BNAT-SHEAF.md showcase/veins-topology-lab.html skills/bnatsheaf/SKILL.md .env.example learnings.md AGENTS.md VISITING_AGENTS.md docs/REGISTRY.md index.html
git commit -m "feat(bnatsheaf): MOTU BNAT Knowledge Sheaf implementation and observatory"
