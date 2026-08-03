import pytest
import numpy as np
from bnatsheaf.cellular_sheaf import CellularSheaf
from bnatsheaf.cohomology import CohomologyGroups
from bnatsheaf.persistence import Filtration, PersistenceDiagram
from bnatsheaf.nsd import NeuralSheafDiffusion

def test_cellular_sheaf_consistency():
    # Simple path graph A -> B
    sheaf = CellularSheaf(nodes=['A', 'B'], edges=[('A', 'B')], stalk_dim=1)
    # Default restrictions are identity

    cohom = CohomologyGroups(sheaf)

    # Consistent section: x = [1, 1]^T
    x_consistent = np.array([1.0, 1.0])
    energy_cons = cohom.residual_energy(x_consistent)
    assert np.isclose(energy_cons, 0.0), f"Energy should be 0 for consistent sections, got {energy_cons}"

    # Conflicting section: x = [1, -1]^T
    x_conflict = np.array([1.0, -1.0])
    energy_conf = cohom.residual_energy(x_conflict)
    assert energy_conf > 0.0, f"Energy should be > 0 for conflicting sections, got {energy_conf}"

def test_sheaf_h0_h1_rank():
    # Triangle graph A-B, B-C, C-A (Cycle)
    nodes = ['A', 'B', 'C']
    edges = [('A', 'B'), ('B', 'C'), ('C', 'A')]
    sheaf = CellularSheaf(nodes=nodes, edges=edges, stalk_dim=1)

    cohom = CohomologyGroups(sheaf)

    assert cohom.dim_h0() == 1, f"H0 dimension of triangle with identity restrictions should be 1"
    # dim C^1 (3 edges) - rank(delta) (which is 2 since ker has dim 1 and C^0 has dim 3) -> 3 - 2 = 1
    assert cohom.dim_h1() == 1, f"H1 dimension of triangle (cycle) with identity restrictions should be 1"
    assert bool(cohom.report_obstruction()['has_obstruction']) is True

def test_filtration_and_persistence():
    filtration = Filtration(nodes=[1, 2, 3])

    # Add path 1-2, 2-3
    filtration.add_edge(1, 2, time=1.0)
    filtration.add_edge(2, 3, time=2.0)

    diagram = filtration.compute_diagram()

    # H0 bars: one should die at 1.0, one at 2.0, one lives forever
    deaths_h0 = sorted([death for birth, death in diagram.h0_bars])
    assert 1.0 in deaths_h0
    assert 2.0 in deaths_h0
    assert float('inf') in deaths_h0

    assert len(diagram.h1_bars) == 0, "No cycle means no H1 bars"

    # Now add cycle edge 3-1 at time 3.0
    filtration.add_edge(3, 1, time=3.0)
    diagram2 = filtration.compute_diagram()

    assert len(diagram2.h1_bars) == 1, "Cycle should create 1 H1 bar"
    h1_birth, h1_death = diagram2.h1_bars[0]
    assert h1_birth == 3.0
    assert h1_death == float('inf')

    long_lived = diagram2.get_long_lived_h1(threshold=2.0)
    assert len(long_lived) == 1, "The inf-lived H1 bar should be reported as long-lived"

def test_nsd_diffusion():
    # Triangle graph
    sheaf = CellularSheaf(nodes=['A', 'B', 'C'], edges=[('A', 'B'), ('B', 'C'), ('C', 'A')], stalk_dim=1)

    nsd = NeuralSheafDiffusion(sheaf, eta=0.1)

    # Start with a conflict
    x_conflict = np.array([1.0, -0.5, 0.2])
    energy_before = sheaf.dirichlet_energy(x_conflict)

    # Diffuse
    x_healed = nsd.diffuse(x_conflict, steps=10)
    energy_after = sheaf.dirichlet_energy(x_healed)

    assert energy_after < energy_before, "Diffusion should reduce Dirichlet energy"
