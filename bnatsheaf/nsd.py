import numpy as np
from typing import Dict, Any, List
from .cellular_sheaf import CellularSheaf

class NeuralSheafDiffusion:
    def __init__(self, sheaf: CellularSheaf, eta: float = 0.1):
        self.sheaf = sheaf
        self.eta = eta

    def set_diagonal_restriction(self, node: Any, edge: Any, weights: np.ndarray):
        # Check ndim first: a scalar (0-D) array has no shape[0] and would raise IndexError
        if weights.ndim != 1 or weights.shape[0] != self.sheaf.stalk_dim:
            raise ValueError(f"Weights must be a 1D array of length {self.sheaf.stalk_dim}")

        diag_matrix = np.diag(weights)
        self.sheaf.set_restriction(node, edge, diag_matrix)

    def diffusion_step(self, x: np.ndarray) -> np.ndarray:
        laplacian = self.sheaf.sheaf_laplacian()
        # Explicit Euler converges only when 0 < eta < 2/lambda_max.
        # Validate the bound before applying so callers get a clear error instead of
        # silently diverging energy — a large eta on a high-degree sheaf would increase
        # energy rather than decrease it, breaking the healing guarantee.
        if self.eta <= 0:
            raise ValueError("eta must be positive.")
        lambda_max = float(np.linalg.eigvalsh(laplacian).max()) if laplacian.size else 0.0
        if lambda_max > 0 and self.eta >= 2.0 / lambda_max:
            raise ValueError(
                f"Step size eta={self.eta} violates stability bound: "
                f"eta must be < {2.0 / lambda_max:.6f} (= 2 / lambda_max). "
                "Reduce eta or the sheaf's maximum degree."
            )
        return x - self.eta * (laplacian @ x)

    def diffuse(self, x: np.ndarray, steps: int = 10) -> np.ndarray:
        current_x = np.copy(x)
        for _ in range(steps):
            current_x = self.diffusion_step(current_x)
        return current_x
