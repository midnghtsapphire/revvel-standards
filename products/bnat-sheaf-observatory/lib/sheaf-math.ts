/**
 * BNAT sheaf math — browser/Node isomorphic port of scripts/bnatsheaf.
 * Credit-free pure TypeScript. Keep in sync with:
 *   scripts/bnatsheaf/{sheaf,cohomology,persistence,fingerprint}.js
 */

export type Stalks = Record<string, number[]>;
export type EdgeSpec = { u: string; v: string; ru?: number[][]; rv?: number[][] };

export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

export function matVec(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row, i) => {
    if (row.length !== vector.length) {
      throw new RangeError(`matVec: row ${i} length mismatch`);
    }
    return row.reduce((acc, v, j) => acc + v * vector[j], 0);
  });
}

export function normSq(v: number[]): number {
  return v.reduce((acc, x) => acc + x * x, 0);
}

export interface NormalizedEdge {
  u: string;
  v: string;
  ru: number[][];
  rv: number[][];
}

export class CellularSheaf {
  stalks: Stalks;
  edges: NormalizedEdge[];

  constructor(spec: { stalks: Stalks; edges: EdgeSpec[] }) {
    if (!spec.stalks || typeof spec.stalks !== "object") {
      throw new TypeError("stalks required");
    }
    this.stalks = spec.stalks;
    this.edges = (spec.edges || []).map((e) => {
      if (!(e.u in spec.stalks) || !(e.v in spec.stalks)) {
        throw new RangeError(`edge (${e.u}, ${e.v}) references unknown vertex`);
      }
      return {
        u: e.u,
        v: e.v,
        ru: e.ru || identity(spec.stalks[e.u].length),
        rv: e.rv || identity(spec.stalks[e.v].length),
      };
    });
  }

  edgeResiduals(): Array<{ u: string; v: string; residual: number[] }> {
    return this.edges.map((e) => {
      const pu = matVec(e.ru, this.stalks[e.u]);
      const pv = matVec(e.rv, this.stalks[e.v]);
      return {
        u: e.u,
        v: e.v,
        residual: pu.map((x, i) => x - pv[i]),
      };
    });
  }

  laplacianEnergy(): number {
    return this.edgeResiduals().reduce((acc, r) => acc + normSq(r.residual), 0);
  }

  isGlobalSection(epsilon = 1e-9): boolean {
    return this.laplacianEnergy() < epsilon;
  }

  h1Obstructions(epsilon = 1e-9) {
    return this.edgeResiduals()
      .filter((r) => normSq(r.residual) >= epsilon)
      .map((r) => ({
        edge: [r.u, r.v] as [string, string],
        residual: r.residual,
        energy: normSq(r.residual),
        transitionPatch: r.residual.slice(),
      }));
  }
}

const EPS = 1e-10;

export function matrixRank(rows: number[][], epsilon = EPS): number {
  if (!rows || rows.length === 0) return 0;
  const m = rows.length;
  const n = rows[0].length;
  const a = rows.map((r) => r.slice());
  let rank = 0;
  let col = 0;
  for (let row = 0; row < m && col < n; ) {
    let pivot = row;
    for (let i = row + 1; i < m; i++) {
      if (Math.abs(a[i][col]) > Math.abs(a[pivot][col])) pivot = i;
    }
    if (Math.abs(a[pivot][col]) < epsilon) {
      col++;
      continue;
    }
    if (pivot !== row) {
      const tmp = a[row];
      a[row] = a[pivot];
      a[pivot] = tmp;
    }
    const piv = a[row][col];
    for (let i = row + 1; i < m; i++) {
      const f = a[i][col] / piv;
      if (Math.abs(f) < epsilon) continue;
      for (let j = col; j < n; j++) a[i][j] -= f * a[row][j];
    }
    rank++;
    row++;
    col++;
  }
  return rank;
}

export function coboundaryMatrix(sheaf: CellularSheaf) {
  const vertexOrder = Object.keys(sheaf.stalks);
  const stalkOffsets: Record<string, number> = {};
  let dimC0 = 0;
  for (const v of vertexOrder) {
    stalkOffsets[v] = dimC0;
    dimC0 += sheaf.stalks[v].length;
  }
  const rows: number[][] = [];
  for (const e of sheaf.edges) {
    const xu = sheaf.stalks[e.u];
    const xv = sheaf.stalks[e.v];
    const edgeDim = e.ru.length;
    for (let k = 0; k < edgeDim; k++) {
      const row = Array(dimC0).fill(0);
      for (let j = 0; j < xu.length; j++) row[stalkOffsets[e.u] + j] += e.ru[k][j];
      for (let j = 0; j < xv.length; j++) row[stalkOffsets[e.v] + j] -= e.rv[k][j];
      rows.push(row);
    }
  }
  return { delta: rows, vertexOrder, dimC0, dimC1: rows.length, stalkOffsets };
}

export interface CohomologyResult {
  dimC0: number;
  dimC1: number;
  rankDelta: number;
  dimH0: number;
  dimH1: number;
  energy: number;
  inH0: boolean;
  obstruction: boolean;
}

export function computeCohomology(
  sheaf: CellularSheaf,
  epsilon = 1e-9
): CohomologyResult {
  const { delta, dimC0, dimC1 } = coboundaryMatrix(sheaf);
  const rankDelta = matrixRank(delta);
  const energy = sheaf.laplacianEnergy();
  const inH0 = energy < epsilon;
  const dimH0 = dimC0 - rankDelta;
  const dimH1 = dimC1 - rankDelta;
  return {
    dimC0,
    dimC1,
    rankDelta,
    dimH0,
    dimH1,
    energy,
    inH0,
    obstruction: dimH1 > 0 || !inH0,
  };
}

export function cohomologyOfGraph(
  vertices: string[],
  edges: Array<{ u: string; v: string }>,
  d = 1,
  stalkValues: Stalks | null = null
): CohomologyResult & { sheaf: CellularSheaf } {
  const stalks: Stalks = {};
  for (const v of vertices) {
    stalks[v] = stalkValues?.[v]?.slice() ?? Array(d).fill(0);
  }
  const sheaf = new CellularSheaf({ stalks, edges });
  return { sheaf, ...computeCohomology(sheaf) };
}

/** Classic proof-table rows used by the observatory UI and tests. */
export function proofTable() {
  const path = cohomologyOfGraph(
    ["a", "b", "c"],
    [
      { u: "a", v: "b" },
      { u: "b", v: "c" },
    ]
  );
  const cycle = cohomologyOfGraph(
    ["a", "b", "c"],
    [
      { u: "a", v: "b" },
      { u: "b", v: "c" },
      { u: "c", v: "a" },
    ]
  );
  const two = cohomologyOfGraph(
    ["a", "b", "c", "d"],
    [
      { u: "a", v: "b" },
      { u: "c", v: "d" },
    ]
  );
  const constant = computeCohomology(
    new CellularSheaf({
      stalks: { a: [3], b: [3], c: [3] },
      edges: [
        { u: "a", v: "b" },
        { u: "b", v: "c" },
      ],
    })
  );
  return [
    {
      name: "Path (tree)",
      dimH0: path.dimH0,
      dimH1: path.dimH1,
      rankDelta: path.rankDelta,
      gluing: path.inH0 && path.dimH1 === 0 ? "yes" : "obstruction",
      energy: path.energy,
    },
    {
      name: "Cycle",
      dimH0: cycle.dimH0,
      dimH1: cycle.dimH1,
      rankDelta: cycle.rankDelta,
      gluing: cycle.dimH1 > 0 ? "obstruction" : "yes",
      energy: cycle.energy,
    },
    {
      name: "2 components",
      dimH0: two.dimH0,
      dimH1: two.dimH1,
      rankDelta: two.rankDelta,
      gluing: two.inH0 && two.dimH1 === 0 ? "yes" : "obstruction",
      energy: two.energy,
    },
    {
      name: "Constant section",
      dimH0: constant.dimH0,
      dimH1: constant.dimH1,
      rankDelta: constant.rankDelta,
      gluing: constant.inH0 ? "in H⁰" : "obstruction",
      energy: constant.energy,
    },
  ];
}

export type WorkerStatus = "healthy" | "degraded" | "down";

const SEVERITY: Record<string, number> = { healthy: 0, degraded: 1, down: 2 };

export function sheafFromWorkers(
  workers: Record<string, { status: WorkerStatus | string }>
): CellularSheaf {
  const stalks: Stalks = {};
  for (const [name, w] of Object.entries(workers)) {
    const sev = SEVERITY[w.status];
    stalks[name] = [sev === undefined ? 1 : sev];
  }
  const names = Object.keys(stalks);
  const edges: EdgeSpec[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      edges.push({ u: names[i], v: names[j] });
    }
  }
  return new CellularSheaf({ stalks, edges });
}

export function fingerprintFromWorkers(
  workers: Record<string, { status: WorkerStatus | string }>
) {
  const sheaf = sheafFromWorkers(workers);
  const coh = computeCohomology(sheaf);
  const obs = sheaf.h1Obstructions();
  return {
    schema: "bnat-fingerprint/v1" as const,
    credit_free: true as const,
    dim_H0: coh.dimH0,
    dim_H1: coh.dimH1,
    rank_delta: coh.rankDelta,
    energy: coh.energy,
    consistent: coh.inH0,
    obstruction: coh.obstruction,
    obstructions: obs,
    workers: Object.keys(sheaf.stalks).length,
  };
}
