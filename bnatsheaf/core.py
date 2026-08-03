import math
from typing import Dict, Any, List, Optional, Tuple, Callable

class Node:
    def __init__(self, id: str, value: Any = None):
        self.id = id
        self.value = value

class Edge:
    def __init__(self, source: str, target: str):
        self.source = source
        self.target = target

class CellularSheaf:
    """
    A mathematical cellular sheaf implementation for agent state and knowledge graphs.
    """
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        # Restriction maps mapping a node ID to an edge ID to a function
        # e.g., restriction_maps['node_a'][('node_a', 'node_b')] = lambda x: x
        self.restriction_maps: Dict[str, Dict[Tuple[str, str], Callable]] = {}

    def add_node(self, node_id: str, value: Any = None):
        if node_id not in self.nodes:
            self.nodes[node_id] = Node(node_id, value)
            self.restriction_maps[node_id] = {}

    def add_edge(self, source_id: str, target_id: str,
                 res_source: Callable = lambda x: x,
                 res_target: Callable = lambda x: x):
        """
        Adds an edge and the restriction maps from the two nodes to this shared edge.
        """
        if source_id not in self.nodes:
            self.add_node(source_id)
        if target_id not in self.nodes:
            self.add_node(target_id)

        edge = Edge(source_id, target_id)
        self.edges.append(edge)
        edge_tuple = (source_id, target_id)

        self.restriction_maps[source_id][edge_tuple] = res_source
        self.restriction_maps[target_id][edge_tuple] = res_target

    def update_node_value(self, node_id: str, value: Any):
        if node_id in self.nodes:
            self.nodes[node_id].value = value

    def calculate_edge_disagreement(self, edge: Edge) -> float:
        """
        Calculates the distance between restricted values on the edge space.
        If the restricted values match exactly, disagreement is 0.
        """
        node_u = self.nodes[edge.source]
        node_v = self.nodes[edge.target]

        edge_tuple = (edge.source, edge.target)

        # Restrict values to the edge
        try:
            val_u = self.restriction_maps[edge.source][edge_tuple](node_u.value)
            val_v = self.restriction_maps[edge.target][edge_tuple](node_v.value)

            # Simple numeric or exact match distance
            if type(val_u) in (int, float) and type(val_v) in (int, float):
                return float(abs(val_u - val_v))
            else:
                return 0.0 if val_u == val_v else 1.0
        except Exception:
            # If restriction fails, it's a maximal disagreement
            return 1.0

    def compute_laplacian_energy(self) -> float:
        """
        E(x) = sum over edges || F(v_u -> e)(x_u) - F(v_v -> e)(x_v) ||^2
        """
        energy = 0.0
        for edge in self.edges:
            disagreement = self.calculate_edge_disagreement(edge)
            energy += (disagreement ** 2)
        return energy

    def detect_h1_obstructions(self, epsilon: float = 1e-6) -> List[Tuple[str, str]]:
        """
        Identifies edges where the restricted sections disagree.
        Any disagreement > epsilon indicates an H^1 obstruction.
        """
        obstructions = []
        for edge in self.edges:
            if self.calculate_edge_disagreement(edge) > epsilon:
                obstructions.append((edge.source, edge.target))
        return obstructions

    def is_consistent(self, epsilon: float = 1e-6) -> bool:
        """
        True if E(x) < epsilon (and thus H^1 is trivial ~0).
        """
        return self.compute_laplacian_energy() < epsilon
