import numpy as np
from typing import Dict, List, Tuple, Any

class CellularSheaf:
    """
    A pure-Python (with numpy) implementation of a Cellular Sheaf on a graph.
    """
    def __init__(self, nodes: List[Any], edges: List[Tuple[Any, Any]], stalk_dim: int = 1):
        self.nodes = list(nodes)
        self.edges = list(edges)
        self.stalk_dim = stalk_dim

        self.node_idx = {n: i for i, n in enumerate(self.nodes)}
        self.edge_idx = {e: i for i, e in enumerate(self.edges)}

        self.n_nodes = len(self.nodes)
        self.n_edges = len(self.edges)

        # Default restriction maps are identity matrices
        self.restrictions = {}
        for u, v in self.edges:
            self.restrictions[(u, (u, v))] = np.eye(self.stalk_dim)
            self.restrictions[(v, (u, v))] = np.eye(self.stalk_dim)

    def set_restriction(self, node: Any, edge: Tuple[Any, Any], matrix: np.ndarray):
        """Sets the restriction map for a given node and adjacent edge."""
        if matrix.shape != (self.stalk_dim, self.stalk_dim):
            raise ValueError(f"Matrix must be {self.stalk_dim}x{self.stalk_dim}")
        self.restrictions[(node, edge)] = matrix

    def coboundary_matrix(self) -> np.ndarray:
        """Computes the coboundary matrix delta: C^0(F) -> C^1(F)"""
        delta = np.zeros((self.n_edges * self.stalk_dim, self.n_nodes * self.stalk_dim))

        for e_idx, (u, v) in enumerate(self.edges):
            u_idx = self.node_idx[u]
            v_idx = self.node_idx[v]

            # v -> (u,v) (positive)
            res_v = self.restrictions.get((v, (u, v)), np.eye(self.stalk_dim))
            delta[e_idx*self.stalk_dim:(e_idx+1)*self.stalk_dim,
                  v_idx*self.stalk_dim:(v_idx+1)*self.stalk_dim] = res_v

            # u -> (u,v) (negative)
            res_u = self.restrictions.get((u, (u, v)), np.eye(self.stalk_dim))
            delta[e_idx*self.stalk_dim:(e_idx+1)*self.stalk_dim,
                  u_idx*self.stalk_dim:(u_idx+1)*self.stalk_dim] = -res_u

        return delta

    def sheaf_laplacian(self) -> np.ndarray:
        """Computes the Sheaf Laplacian Delta = delta^T delta"""
        delta = self.coboundary_matrix()
        return delta.T @ delta

    def dirichlet_energy(self, x: np.ndarray) -> float:
        """Computes the Dirichlet energy E(x) = 1/2 x^T Delta x"""
        if x.shape[0] != self.n_nodes * self.stalk_dim:
            raise ValueError("Input vector must have dimension n_nodes * stalk_dim")

        laplacian = self.sheaf_laplacian()
        return 0.5 * float(x.T @ laplacian @ x)

    def h1_rank(self) -> int:
        """
        Computes the numerical H1 rank (obstruction dimension).
        H^1(F) approx coker(delta) or related to nullity of Laplacian.
        For graphs, dim H^1 = dim C^1 - rank(delta)
        """
        delta = self.coboundary_matrix()
        rank = np.linalg.matrix_rank(delta)
        c1_dim = self.n_edges * self.stalk_dim
        return c1_dim - rank

    def h0_rank(self) -> int:
        """
        Computes the numerical H0 rank (dimension of global sections).
        H^0(F) approx ker(delta)
        """
        delta = self.coboundary_matrix()
        rank = np.linalg.matrix_rank(delta)
        c0_dim = self.n_nodes * self.stalk_dim
        return c0_dim - rank
