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
