from typing import List, Tuple, Dict, Any, Optional
import numpy as np

class PersistenceDiagram:
    def __init__(self):
        self.h0_bars = [] # List of tuples (birth, death)
        self.h1_bars = [] # List of tuples (birth, death)

    def add_h0_bar(self, birth: float, death: float):
        self.h0_bars.append((birth, death))

    def add_h1_bar(self, birth: float, death: float):
        self.h1_bars.append((birth, death))

    def get_long_lived_h1(self, threshold: float) -> List[Tuple[float, float]]:
        """Returns H1 bars with persistence greater than threshold (topological tears)"""
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
            # Merge root_j into root_i (arbitrary)
            birth_i = self.birth_time.get(root_i, time)
            birth_j = self.birth_time.get(root_j, time)

            # The younger component dies
            if birth_i > birth_j:
                self.parent[root_i] = root_j
                diagram.add_h0_bar(birth_i, time)
            else:
                self.parent[root_j] = root_i
                diagram.add_h0_bar(birth_j, time)

class Filtration:
    """Computes persistence diagram for a sequence of graph structures (edges added over time)"""
    def __init__(self, nodes: List[Any]):
        self.nodes = nodes
        self.edges_with_time = [] # List of (time, (u, v))

    def add_edge(self, u: Any, v: Any, time: float):
        self.edges_with_time.append((time, (u, v)))

    def compute_diagram(self) -> PersistenceDiagram:
        self.edges_with_time.sort(key=lambda x: x[0])
        diagram = PersistenceDiagram()
        uf = UnionFind(self.nodes)

        for n in self.nodes:
            uf.birth_time[n] = 0.0 # Nodes born at time 0

        current_edges = []
        previous_h1_rank = 0

        # Simple H1 rank tracking via a proxy logic (assuming stalk dim 1 and simple graph for logic)
        for time, (u, v) in self.edges_with_time:
            # H0 logic
            root_u = uf.find(u)
            root_v = uf.find(v)
            if root_u != root_v:
                uf.union(u, v, time, diagram)
            else:
                # Cycle created, H1 bar born
                # Simplistic tracking: birth time is edge time, death is inf for this basic proxy
                diagram.add_h1_bar(time, float('inf'))

        # Close remaining H0 bars
        active_components = set(uf.find(n) for n in self.nodes)
        for root in active_components:
            diagram.add_h0_bar(uf.birth_time.get(root, 0.0), float('inf'))

        return diagram
