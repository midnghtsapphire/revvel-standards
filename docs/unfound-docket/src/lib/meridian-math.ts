/** Deterministic search exhibit. Every public function is a closed-form identity. */

export type Dist = readonly number[];

export function assertDist(poa: Dist): void {
  if (poa.length < 2) throw new Error("Need at least two segments");
  for (const p of poa) {
    if (!Number.isFinite(p) || p < 0) throw new Error("POA entries must be finite and ≥ 0");
  }
  const sum = poa.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) throw new Error(`POA must sum to 1 (got ${sum})`);
}

export function normalize(weights: readonly number[]): number[] {
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new Error("Weights must be finite and ≥ 0");
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("Weights must sum to a positive number");
  return weights.map((w) => w / sum);
}

/** Koopman random-search law. Coverage C = W·L / A. POD = 1 − e^(−C). */
export function podRandomSearch(
  sweepWidth: number,
  trackLength: number,
  area: number,
): { coverage: number; pod: number } {
  if (![sweepWidth, trackLength, area].every(Number.isFinite)) {
    throw new Error("Geometry must be finite");
  }
  if (sweepWidth < 0 || trackLength < 0 || area <= 0) {
    throw new Error("Sweep width and track length ≥ 0; area > 0");
  }
  const coverage = (sweepWidth * trackLength) / area;
  return { coverage, pod: 1 - Math.exp(-coverage) };
}

export function pos(poa: number, pod: number): number {
  if (pod < 0 || pod > 1) throw new Error("POD must be in [0, 1]");
  return poa * pod;
}

/**
 * Bayes update after one unsuccessful search of `index`.
 * P(fail) = 1 − POA_i·POD.
 * Posterior_i = POA_i·(1−POD) / P(fail).
 * Posterior_j = POA_j / P(fail) for j ≠ i.
 * Koopman / standard SAR debrief identity. Not a model of where a person went.
 */
export function bayesAfterMiss(poa: Dist, index: number, pod: number): number[] {
  assertDist(poa);
  if (!Number.isInteger(index) || index < 0 || index >= poa.length) {
    throw new Error("Segment index out of range");
  }
  if (!Number.isFinite(pod) || pod < 0 || pod > 1) throw new Error("POD must be in [0, 1]");
  const pFail = 1 - poa[index] * pod;
  if (pFail <= 1e-15) {
    throw new Error("A miss has probability 0 under these inputs; cannot condition");
  }
  return poa.map((p, j) => (j === index ? (p * (1 - pod)) / pFail : p / pFail));
}

/** Anti-pattern: shrink the searched cell and forget to redistribute. Not a distribution. */
export function naiveShrink(poa: Dist, index: number, pod: number): number[] {
  assertDist(poa);
  if (pod < 0 || pod > 1) throw new Error("POD must be in [0, 1]");
  return poa.map((p, j) => (j === index ? p * (1 - pod) : p));
}

export function sum(xs: Dist): number {
  return xs.reduce((a, b) => a + b, 0);
}

/** Stable rank: higher value first; ties keep the earlier index. */
export function rankDesc(values: Dist): number[] {
  return values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.i);
}

export const CANON = {
  id: "MERIDIAN-A",
  names: ["A · lot", "B · road", "C · remainder"] as const,
  prior: [0.5, 0.3, 0.2] as const,
  searched: 0,
  pod: 0.6,
  /** Closed form, written out so a reader can do it by hand. */
  expectedPosterior: [0.5 * 0.4 / 0.7, 0.3 / 0.7, 0.2 / 0.7] as const,
  expectedNaive: [0.5 * 0.4, 0.3, 0.2] as const,
};

export const RANDOM_CANON = {
  id: "MERIDIAN-W",
  sweepWidth: 20,
  trackLength: 5000,
  area: 100_000,
  expectedCoverage: 1,
  expectedPod: 1 - Math.exp(-1),
};

export type ProofRow = {
  id: string;
  claim: string;
  pass: boolean;
  detail: string;
};

export function runProofs(): ProofRow[] {
  const post = bayesAfterMiss(CANON.prior, CANON.searched, CANON.pod);
  const naive = naiveShrink(CANON.prior, CANON.searched, CANON.pod);
  const rows: ProofRow[] = [];

  const close = (a: number, b: number) => Math.abs(a - b) <= 1e-12;

  rows.push({
    id: "bayes-values",
    claim: "Posterior matches the hand calculation 0.20/0.70, 0.30/0.70, 0.20/0.70",
    pass: post.every((p, i) => close(p, CANON.expectedPosterior[i])),
    detail: post.map((p) => p.toFixed(10)).join(" · "),
  });

  rows.push({
    id: "sums-to-one",
    claim: "Posterior is a distribution (sums to 1)",
    pass: close(sum(post), 1),
    detail: `sum = ${sum(post).toFixed(12)}`,
  });

  const ratioPrior = CANON.prior[1] / CANON.prior[2];
  const ratioPost = post[1] / post[2];
  rows.push({
    id: "odds-preserved",
    claim: "Unsearched segments keep their odds ratio",
    pass: close(ratioPrior, ratioPost),
    detail: `prior B:C ${ratioPrior.toFixed(6)} → posterior ${ratioPost.toFixed(6)}`,
  });

  const narrativeTop = rankDesc(CANON.prior)[0];
  const mathTop = rankDesc(post)[0];
  rows.push({
    id: "narrative-diverges",
    claim: "A prior-only story still ranks A first; the posterior ranks B first",
    pass: narrativeTop === 0 && mathTop === 1,
    detail: `narrative top ${CANON.names[narrativeTop]}; posterior top ${CANON.names[mathTop]}`,
  });

  rows.push({
    id: "naive-not-dist",
    claim: "The shrink-and-forget spreadsheet is not a probability distribution",
    pass: Math.abs(sum(naive) - 1) > 0.1 && close(sum(naive), sum(CANON.expectedNaive)),
    detail: `naive sum = ${sum(naive).toFixed(2)}; naive B = ${naive[1].toFixed(2)} but posterior B = ${post[1].toFixed(4)}`,
  });

  const geo = podRandomSearch(
    RANDOM_CANON.sweepWidth,
    RANDOM_CANON.trackLength,
    RANDOM_CANON.area,
  );
  rows.push({
    id: "random-search",
    claim: "W=20, L=5000, A=100000 → coverage 1 → POD = 1 − e^(−1)",
    pass: close(geo.coverage, 1) && close(geo.pod, RANDOM_CANON.expectedPod),
    detail: `C = ${geo.coverage.toFixed(4)}; POD = ${geo.pod.toFixed(10)}`,
  });

  rows.push({
    id: "no-confidence-input",
    claim: "No narrative confidence term enters the posterior",
    pass: bayesAfterMiss.length === 3,
    detail: "bayesAfterMiss(poa, index, pod) — three arguments, none of them a story score",
  });

  return rows;
}

export function proofsPass(rows: ProofRow[] = runProofs()): boolean {
  return rows.every((r) => r.pass);
}

export type SegmentInput = { name: string; weight: number };

export type ExhibitResult = {
  prior: number[];
  posterior: number[];
  naive: number[];
  pod: number;
  coverage: number | null;
  pFail: number;
  narrativeTop: number;
  posteriorTop: number;
  diverges: boolean;
};

export function evaluateExhibit(args: {
  segments: readonly SegmentInput[];
  searched: number;
  podDirect: number | null;
  sweepWidth: number;
  trackLength: number;
  area: number;
  useCoverage: boolean;
}): ExhibitResult {
  const prior = normalize(args.segments.map((s) => s.weight));
  let pod = args.podDirect ?? 0;
  let coverage: number | null = null;
  if (args.useCoverage) {
    const geo = podRandomSearch(args.sweepWidth, args.trackLength, args.area);
    pod = geo.pod;
    coverage = geo.coverage;
  }
  if (pod < 0 || pod > 1) throw new Error("POD must be in [0, 1]");
  const posterior = bayesAfterMiss(prior, args.searched, pod);
  const naive = naiveShrink(prior, args.searched, pod);
  const narrativeTop = rankDesc(prior)[0];
  const posteriorTop = rankDesc(posterior)[0];
  return {
    prior,
    posterior,
    naive,
    pod,
    coverage,
    pFail: 1 - prior[args.searched] * pod,
    narrativeTop,
    posteriorTop,
    diverges: narrativeTop !== posteriorTop,
  };
}

export function affidavitAppendix(args: {
  matter: string;
  segments: readonly { name: string; prior: number; posterior: number; naive: number }[];
  searchedName: string;
  pod: number;
  coverage: number | null;
  pFail: number;
}): string {
  const lines = [
    "APPENDIX — SEARCH MATH EXHIBIT (NOT PROBABLE CAUSE)",
    `Matter: ${args.matter || "UNSTATED"}`,
    "Method: one unsuccessful search; Koopman identity POS = POA × POD;",
    "random-search POD = 1 − exp(−W·L/A) only if coverage inputs were used;",
    "Bayes miss update: posterior_i = POA_i·(1−POD) / (1 − POA_i·POD);",
    "posterior_j = POA_j / (1 − POA_i·POD) for segments not searched.",
    "These segment weights are the declaration's inputs. They are not ISRID tables,",
    "not a finding that a person is in a segment, and not legal authority to search.",
    `Searched segment: ${args.searchedName}`,
    `POD used: ${args.pod.toFixed(6)}`,
    args.coverage == null
      ? "POD source: stated directly (not derived from coverage in this run)."
      : `POD source: coverage C = ${args.coverage.toFixed(6)} under the random-search law.`,
    `P(miss) = ${args.pFail.toFixed(6)}`,
    "",
    "Segment | prior POA | naive shrink (not a distribution) | posterior POA",
    ...args.segments.map(
      (s) =>
        `${s.name} | ${s.prior.toFixed(6)} | ${s.naive.toFixed(6)} | ${s.posterior.toFixed(6)}`,
    ),
    "",
    "A narrative that still ranks segments by the prior is not this exhibit.",
    "Confirm every statute and case in the accompanying course against official text before you cite it.",
  ];
  return lines.join("\n");
}
