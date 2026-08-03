import numpy as np
from typing import Dict, Any, List
from .cellular_sheaf import CellularSheaf

class NeuralSheafDiffusion:
    """
    Implements a discrete Neural Sheaf Diffusion layer over a graph structure.
    Updates states using explicit Euler diffusion: x(t+1) = x(t) - eta * Delta_F x(t).
    """
    def __init__(self, sheaf: CellularSheaf, eta: float = 0.1):
        self.sheaf = sheaf
        self.eta = eta

    def set_diagonal_restriction(self, node: Any, edge: Any, weights: np.ndarray):
        """
        Sets a diagonal restriction map (heterophily-aware heuristic).
        Weights should be a 1D array of length equal to stalk_dim.
        """
        if weights.shape[0] != self.sheaf.stalk_dim or len(weights.shape) > 1:
            raise ValueError(f"Weights must be a 1D array of length {self.sheaf.stalk_dim}")

        diag_matrix = np.diag(weights)
        self.sheaf.set_restriction(node, edge, diag_matrix)

    def diffusion_step(self, x: np.ndarray) -> np.ndarray:
        """
        Performs one step of discrete explicit Euler diffusion.
        x -> x - eta * Delta_F x
        """
        laplacian = self.sheaf.sheaf_laplacian()
        return x - self.eta * (laplacian @ x)

    def diffuse(self, x: np.ndarray, steps: int = 10) -> np.ndarray:
        """
        Performs multiple steps of diffusion to heal local conflicts (reduce Dirichlet energy).
        """
        current_x = np.copy(x)
        for _ in range(steps):
            current_x = self.diffusion_step(current_x)
        return current_x
