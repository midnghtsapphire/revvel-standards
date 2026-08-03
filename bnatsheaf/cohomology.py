import numpy as np
from typing import Any
from .cellular_sheaf import CellularSheaf

class CohomologyGroups:
    """Computes Sheaf Cohomology Groups and related metrics for a given CellularSheaf."""

    def __init__(self, sheaf: CellularSheaf):
        self.sheaf = sheaf

    def dim_h0(self) -> int:
        """
        Dimension of H^0(F) (Global sections).
        H^0 approx ker(delta)
        """
        return self.sheaf.h0_rank()

    def dim_h1(self) -> int:
        """
        Dimension of H^1(F) (Obstructions).
        H^1 approx coker(delta)
        """
        return self.sheaf.h1_rank()

    def get_h0_basis(self) -> np.ndarray:
        """
        Returns an approximate basis for H^0(F) via SVD (ker delta).
        Rows of returned matrix correspond to basis vectors.
        """
        delta = self.sheaf.coboundary_matrix()
        # SVD: delta = U @ S @ Vh
        # ker(delta) is spanned by rows of Vh corresponding to zero singular values
        U, S, Vh = np.linalg.svd(delta, full_matrices=True)

        tol = max(delta.shape) * np.finfo(float).eps * max(S) if len(S) > 0 else 1e-10
        null_mask = (S <= tol) if len(S) > 0 else np.ones(Vh.shape[0], dtype=bool)

        # If nullity > len(S), append true values for the rest
        if Vh.shape[0] > len(S):
            extra_mask = np.ones(Vh.shape[0] - len(S), dtype=bool)
            null_mask = np.concatenate([null_mask, extra_mask])

        basis = Vh[null_mask]
        return basis

    def residual_energy(self, x: np.ndarray) -> float:
        """
        Residual Dirichlet energy E(x) = 1/2 x^T Delta_F x.
        If this is > 0, the section x is in conflict.
        """
        return self.sheaf.dirichlet_energy(x)

    def report_obstruction(self) -> dict:
        """
        Returns a summary report of the topological obstruction state.
        """
        return {
            "dim_h0": self.dim_h0(),
            "dim_h1": self.dim_h1(),
            "has_obstruction": self.dim_h1() > 0
        }
