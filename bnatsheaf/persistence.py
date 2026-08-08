from __future__ import annotations
from typing import TYPE_CHECKING, List, Tuple, Dict, Any, Optional
import numpy as np

if TYPE_CHECKING:
    from .cellular_sheaf import CellularSheaf

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


class SheafFiltration:
    """Sheaf-aware persistence that tracks H¹ births and deaths using coboundary
    rank changes across a sequence of :class:`CellularSheaf` snapshots.

    Unlike :class:`Filtration`, which only records graph topology, this class
    accepts full sheaf snapshots (including restriction maps) at successive
    time steps.  H¹ bars open/close as the coboundary rank changes, so the
    resulting persistence diagram reflects actual knowledge-sheaf obstructions
    rather than mere graph cycles.

    Usage::

        sf = SheafFiltration()
        sf.add_snapshot(sheaf_t0, time=0.0)
        sf.add_snapshot(sheaf_t1, time=1.0)
        diagram = sf.compute_diagram()
    """

    def __init__(self) -> None:
        self._snapshots: List[Tuple[float, "CellularSheaf"]] = []

    def add_snapshot(self, sheaf: "CellularSheaf", time: float) -> None:
        """Record a sheaf snapshot at the given filtration time."""
        self._snapshots.append((time, sheaf))

    @staticmethod
    def _coboundary_rank(sheaf: "CellularSheaf") -> int:
        delta = sheaf.coboundary_matrix().astype(float)
        if delta.size == 0:
            return 0
        tol = (
            max(delta.shape)
            * np.finfo(delta.dtype).eps
            * float(np.linalg.norm(delta, ord=2))
        )
        return int(np.linalg.matrix_rank(delta, tol=tol))

    def compute_diagram(self) -> PersistenceDiagram:
        """Compute H¹ persistence by monitoring rank changes across snapshots.

        A new H¹ bar is opened whenever ``dim H¹ = (n_edges - rank)`` increases
        (a new obstruction appears) and closed when it decreases (the obstruction
        is healed).  Bars that survive to the last snapshot are given infinite
        death.
        """
        if not self._snapshots:
            return PersistenceDiagram()

        sorted_snaps = sorted(self._snapshots, key=lambda t: t[0])
        diagram = PersistenceDiagram()
        # Track currently open H¹ bars as a heap of birth times (ascending).
        open_h1: List[float] = []
        prev_dim_h1 = 0

        for time, sheaf in sorted_snaps:
            rank = self._coboundary_rank(sheaf)
            dim_h1 = max(0, sheaf.n_edges * sheaf.stalk_dim - rank)

            delta = dim_h1 - prev_dim_h1
            if delta > 0:
                # New H¹ classes born at this snapshot.
                for _ in range(delta):
                    open_h1.append(time)
            elif delta < 0:
                # H¹ classes healed; close oldest-born bars first (O(1) pops).
                open_h1.sort(reverse=True)
                for _ in range(-delta):
                    if open_h1:
                        birth = open_h1.pop()  # pops smallest after reverse sort
                        diagram.add_h1_bar(birth, time)

            prev_dim_h1 = dim_h1

        # Remaining open bars have no death within this filtration.
        for birth in open_h1:
            diagram.add_h1_bar(birth, float("inf"))

        return diagram
