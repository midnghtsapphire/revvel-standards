from typing import List, Tuple, Dict, Any, Optional
import numpy as np

class PersistenceDiagram:
    def __init__(self):
        self.h0_bars = []
        self.h1_bars = []

    def add_h0_bar(self, birth: float, death: float):
        self.h0_bars.append((birth, death))

    def add_h1_bar(self, birth: float, death: float):
        self.h1_bars.append((birth, death))

    def get_long_lived_h1(self, threshold: float) -> List[Tuple[float, float]]:
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
            birth_i = self.birth_time.get(root_i, time)
            birth_j = self.birth_time.get(root_j, time)

            if birth_i > birth_j:
                self.parent[root_i] = root_j
                diagram.add_h0_bar(birth_i, time)
            else:
                self.parent[root_j] = root_i
                diagram.add_h0_bar(birth_j, time)

class Filtration:
    def __init__(self, nodes: List[Any]):
        self.nodes = nodes
        self.edges_with_time = []
        self.patches_with_time: List[Tuple[float, Tuple[Any, Any, Any]]] = []

    def add_edge(self, u: Any, v: Any, time: float):
        self.edges_with_time.append((time, (u, v)))

    def add_patch(self, u: Any, v: Any, w: Any, time: float):
        """Record a 2-cell (triangle u-v-w) entering the filtration at *time*.

        Each 2-cell kills one open H¹ bar (the elder/oldest-born cycle) using the
        standard persistence cancellation rule.  Call this after adding the three
        bounding edges so that death times are always ≥ the corresponding birth time.
        """
        self.patches_with_time.append((time, (u, v, w)))

    def compute_diagram(self) -> PersistenceDiagram:
        # Merge edges and 2-cells into a single chronological event stream.
        events: list = [(t, 'edge', e) for t, e in self.edges_with_time]
        events += [(t, 'patch', p) for t, p in self.patches_with_time]
        events.sort(key=lambda x: x[0])

        diagram = PersistenceDiagram()
        uf = UnionFind(self.nodes)
        open_h1_births: List[float] = []  # birth times of unresolved H¹ bars

        for n in self.nodes:
            uf.birth_time[n] = 0.0

        for event in events:
            time = event[0]
            if event[1] == 'edge':
                u, v = event[2]
                root_u = uf.find(u)
                root_v = uf.find(v)
                if root_u != root_v:
                    uf.union(u, v, time, diagram)
                else:
                    # A new independent cycle is born at this time.
                    open_h1_births.append(time)
            elif event[1] == 'patch':
                # A 2-cell fills one cycle, killing the oldest (smallest birth time)
                # open H¹ class according to the elder/cancellation rule.
                if open_h1_births:
                    open_h1_births.sort()
                    birth = open_h1_births.pop(0)
                    diagram.add_h1_bar(birth, time)

        # Remaining open H¹ bars have no death in this filtration.
        for birth in open_h1_births:
            diagram.add_h1_bar(birth, float('inf'))

        active_components = set(uf.find(n) for n in self.nodes)
        for root in active_components:
            diagram.add_h0_bar(uf.birth_time.get(root, 0.0), float('inf'))

        return diagram
