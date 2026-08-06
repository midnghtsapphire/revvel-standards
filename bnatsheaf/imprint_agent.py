"""imprint_agent — pre-action gate for the BNAT Knowledge Sheaf.

Every agent must call :func:`imprint_agent` before taking any operational
action (WR triage, PR authoring, label manipulation, etc.).  The gate
checks two invariants:

1. **H¹ ≈ 0** – no topological obstruction exists in the current sheaf
   configuration.  A nonzero H¹ means at least one restriction-map cycle
   cannot be globally resolved; agents should wait for healing rather than
   propagating a torn state.
2. **E(x) < ε** – the Dirichlet energy of the current agent-state vector *x*
   is below the caller-supplied tolerance.  High energy indicates conflicting
   beliefs between adjacent agents.

Returns a dict with ``passed`` (bool) and ``reason`` (str).

Typical usage::

    from bnatsheaf.imprint_agent import imprint_agent
    result = imprint_agent(sheaf, x=agent_state_vector, epsilon=0.1)
    if not result["passed"]:
        raise RuntimeError(f"Pre-action gate failed: {result['reason']}")
"""

from typing import Any, Optional
import numpy as np
from .cellular_sheaf import CellularSheaf
from .cohomology import CohomologyGroups


def imprint_agent(
    sheaf: CellularSheaf,
    x: Optional[np.ndarray] = None,
    epsilon: float = 0.1,
) -> dict:
    """Verify H¹ ≈ 0 and E(x) < epsilon before the agent acts.

    Args:
        sheaf:   The live CellularSheaf representing the current multi-agent state.
        x:       Agent-state section vector (length ``n_nodes * stalk_dim``).
                 If *None*, only the topological invariant (H¹) is checked.
        epsilon: Maximum acceptable Dirichlet energy.  Defaults to 0.1.

    Returns:
        dict with keys:
            ``passed`` (bool)  – True iff all checked invariants hold.
            ``reason`` (str)   – Human-readable explanation of the outcome.
            ``dim_h1`` (int)   – Computed H¹ dimension.
            ``energy`` (float) – Computed Dirichlet energy (NaN when *x* is None).
    """
    cohom = CohomologyGroups(sheaf)
    dim_h1: int = cohom.dim_h1()

    if dim_h1 > 0:
        return {
            "passed": False,
            "reason": (
                f"Topological obstruction detected: dim H¹ = {dim_h1}. "
                "The Knowledge Sheaf has unresolved cycles; run Neural Sheaf "
                "Diffusion to heal before proceeding."
            ),
            "dim_h1": dim_h1,
            "energy": float("nan"),
        }

    energy: float = float("nan")
    if x is not None:
        energy = sheaf.dirichlet_energy(x)
        if energy >= epsilon:
            return {
                "passed": False,
                "reason": (
                    f"Dirichlet energy E(x) = {energy:.4f} ≥ ε = {epsilon}. "
                    "Agent states are insufficiently aligned; heal before acting."
                ),
                "dim_h1": dim_h1,
                "energy": energy,
            }

    return {
        "passed": True,
        "reason": "Sheaf invariants satisfied: H¹ = 0 and E(x) < ε.",
        "dim_h1": dim_h1,
        "energy": energy,
    }
