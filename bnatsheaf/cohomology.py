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
