// --corpus-template fast-path (added 2026-11-07, Gitar review PR #18302). It
// MUST run before the model-check below prints to stdout, so that
// `node verify.mjs --corpus-template > corpus.json` is valid JSON which
// `--corpus` then accepts — otherwise `verify.mjs ok` and the A/B/C rows would
// be prepended and corrupt the file. Inlined (not CORPUS_TEMPLATE) to avoid the
// const TDZ. This is the ONLY code above the model-check; every other
// invocation (bare, --linear-a, --corpus) skips it and the model-check is
// unchanged.
if (process.argv.includes("--corpus-template")) {
  console.log(JSON.stringify({
    sequences: [
      { seq: "KU-RO", role: "total", source: "GORILA <vol>:<page>; <tablet id>" },
      { seq: "A-TA-I-*301-WA-JA", role: "libation-frame-open", source: "SigLA <doc id>; GORILA ref" },
    ],
  }, null, 2));
  process.exit(0);
}

const scenarios = [
  { id: "A", base: 50, essay: 87, w: { proximity: 0.35, concealment: 0.05, metrology: 0.25, seismic: 0.05, acidity: -0.15 } },
  { id: "B", base: 30, essay: 64, w: { proximity: 0.15, concealment: -0.45, metrology: 0.15, seismic: 0.6, acidity: 0.2 } },
  { id: "C", base: 35, essay: 78, w: { proximity: 0.05, concealment: 0.55, metrology: 0.4, seismic: -0.2, acidity: 0.05 } },
];
const keys = ["proximity", "concealment", "metrology", "seismic", "acidity"];
const defaults = { proximity: 85, concealment: 90, metrology: 78, seismic: 65, acidity: 40 };

function raw(scenario, drivers) {
  return keys.reduce((sum, key) => sum + scenario.w[key] * drivers[key], scenario.base);
}
function asWritten(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

const rows = scenarios.map((scenario) => {
  const value = raw(scenario, defaults);
  return { ...scenario, raw: value, shown: asWritten(value) };
});
const expected = { A: [101, 99], B: [60.95, 61], C: [108.95, 99] };
for (const row of rows) {
  const [wantRaw, wantShown] = expected[row.id];
  if (Math.abs(row.raw - wantRaw) > 1e-9) {
    throw new Error(`${row.id} raw ${row.raw} !== ${wantRaw}`);
  }
  if (row.shown !== wantShown) throw new Error(`${row.id} shown ${row.shown} !== ${wantShown}`);
  if (row.shown === row.essay) throw new Error(`${row.id} unexpectedly matched the essay`);
}
const structural = rows.map((row) => Math.max(0, row.raw));
const total = structural.reduce((sum, value) => sum + value, 0);
const shares = structural.map((value) => (value / total) * 100);
const shareSum = shares.reduce((sum, value) => sum + value, 0);
if (Math.abs(shareSum - 100) > 1e-6) throw new Error(`shares sum to ${shareSum}`);
if (!(shares[2] > shares[0] && shares[0] > shares[1])) {
  throw new Error(`expected C > A > B, got ${shares}`);
}
console.log("verify.mjs ok");
console.log(
  rows
    .map((row, index) => `${row.id} essay ${row.essay} shown ${row.shown} raw ${row.raw} share ${shares[index].toFixed(2)}`)
    .join("\n"),
);

// ───────────────────────────────────────────────────────────────────────────
// Linear A structural loop — added 2026-11-07 (session request, decided with
// the session owner). The model-check CODE above is unchanged; the only thing
// added above it is the `--corpus-template` fast-path (PR #18302), which fires
// only for that one new flag. A bare `node verify.mjs` still runs only the
// model-check and prints the same output, so every existing consumer is
// unaffected. The loop below runs ONLY when the `--linear-a` flag is passed.
//
// WHY THIS EXISTS: a deterministic "decipherment loop" that proposes a
// falsifiable rule, tests it against a seed corpus of ATTESTED Linear A
// sequences, and records what SURVIVES vs. what is KILLED vs. what is
// UNRESOLVABLE. It reuses the epigraphy already vouched for in FORMULAS.md
// (KU-RO is the total word; JA-SA-SA-RA-ME / A-TA-I-*301-WA-JA are libation
// pieces; *301 is undeciphered; TE-KI-TO-NE is NOT Linear A). It is a METHOD
// HARNESS, not a decipherment — Linear A is unread. It deliberately does NOT
// generate random readings: a kill logged is the real product (cf. the repo's
// NULL_RESULT posture), not an invented meaning.
//
// IF REMOVED: the project loses its only runnable, reproducible test of a
// decipherment hypothesis and reverts to the static widget alone.
//
// SCOPE LIMIT: the seed below is a SMALL labelled sample, not the corpus. Its
// frequency/positional numbers are illustrative of the method, never
// corpus-wide findings. Real work needs SigLA/GORILA ingestion (see README).
//
// Run:  node verify.mjs --linear-a            (run the whole ledger)
//       node verify.mjs --linear-a --iter 3   (stop after 3 hypotheses)
// ───────────────────────────────────────────────────────────────────────────

// Each entry is an attested Linear A sign-sequence with the role the published
// corpus assigns it. `source` cites where the claim comes from; do not add a
// row without one. "not-linear-a" rows are decoys kept on purpose so the loop
// can demonstrate a KILL.
const LINEAR_A_SEED = [
  { seq: "A-TA-I-*301-WA-JA", role: "libation-frame-open", source: "libation formula, GORILA; FORMULAS.md" },
  { seq: "JA-SA-SA-RA-ME", role: "libation", source: "libation formula, GORILA; FORMULAS.md" },
  { seq: "U-NA-KA-NA-SI", role: "libation", source: "libation formula, GORILA" },
  { seq: "I-PI-NA-MA", role: "libation", source: "libation formula, GORILA" },
  { seq: "SI-RU-TE", role: "libation", source: "libation formula, GORILA" },
  { seq: "A-DI-KI-TE", role: "toponym", source: "Mt. Dikte region place-name, attested on tablets" },
  { seq: "KU-RO", role: "total", source: "administrative totalling word, GORILA; FORMULAS.md" },
  { seq: "KI-RO", role: "deficit", source: "administrative deficit/owed word, GORILA" },
  { seq: "PO-TO-KU-RO", role: "grand-total", source: "administrative grand-total, GORILA" },
  { seq: "TE-KI-TO-NE", role: "not-linear-a", source: "decoy: Linear B te-ko-to-ne (τέκτονες), -ko- not -ki-; FORMULAS.md" },
];

const tokenize = (seq) => seq.split("-");
const isUndeciphered = (sign) => sign.startsWith("*"); // starred signs have no agreed value

function corpusStats(corpus) {
  const freq = new Map();
  const initial = new Map();
  const final = new Map();
  for (const { seq } of corpus) {
    const signs = tokenize(seq);
    signs.forEach((s, i) => {
      freq.set(s, (freq.get(s) || 0) + 1);
      if (i === 0) initial.set(s, (initial.get(s) || 0) + 1);
      if (i === signs.length - 1) final.set(s, (final.get(s) || 0) + 1);
    });
  }
  return { freq, initial, final };
}

// A hypothesis is a claim + a test(corpus) that returns a verdict and the
// evidence it stands or falls on. verdict ∈ SURVIVES | KILLED | UNRESOLVABLE.
const HYPOTHESES = [
  {
    id: "H1",
    claim: "KU-RO and KI-RO are distinct lexemes (a U/I minimal pair), not spelling variants.",
    test(c) {
      const ku = c.find((e) => e.seq === "KU-RO");
      const ki = c.find((e) => e.seq === "KI-RO");
      if (!ku || !ki) return { verdict: "UNRESOLVABLE", evidence: "one of the pair absent from seed" };
      const differ = ku.seq !== ki.seq && tokenize(ku.seq)[1] === tokenize(ki.seq)[1];
      return differ
        ? { verdict: "SURVIVES", evidence: `both attested, differ only in sign 1 (KU vs KI); roles differ: ${ku.role} vs ${ki.role}` }
        : { verdict: "KILLED", evidence: "not a minimal pair as claimed" };
    },
  },
  {
    id: "H2",
    claim: "PO-TO-KU-RO (grand-total) is built on the total word KU-RO (ends in it).",
    test(c) {
      const g = c.find((e) => e.seq === "PO-TO-KU-RO");
      if (!g) return { verdict: "UNRESOLVABLE", evidence: "grand-total form absent from seed" };
      return g.seq.endsWith("KU-RO")
        ? { verdict: "SURVIVES", evidence: "PO-TO-KU-RO ends in KU-RO; consistent with a compounded total" }
        : { verdict: "KILLED", evidence: "does not contain KU-RO" };
    },
  },
  {
    id: "H3",
    claim: "The libation formula is a multi-word frame opening with A-TA-I-*301-WA-JA.",
    test(c) {
      const open = c.find((e) => e.seq === "A-TA-I-*301-WA-JA");
      const others = c.filter((e) => e.role === "libation").length;
      if (!open || others < 1) return { verdict: "UNRESOLVABLE", evidence: "frame opener or formula body absent" };
      const starred = tokenize(open.seq).filter(isUndeciphered);
      return { verdict: "SURVIVES", evidence: `opener attested + ${others} further libation word(s); note undeciphered sign(s): ${starred.join(", ") || "none"}` };
    },
  },
  {
    id: "H4",
    claim: "The sign *301 (in A-TA-I-*301-WA-JA) has a known phonetic value.",
    test(c) {
      // Check for *301 specifically — the sign this claim is about — not "any
      // starred sign", so the verdict always follows from the claim it reports
      // (cf. standards/VERIFY_THE_POSTCONDITION.md). Gitar review, PR #18298.
      const has301 = c.some((e) => tokenize(e.seq).includes("*301"));
      return has301
        ? { verdict: "KILLED", evidence: "*301 is a starred sign = no agreed phonetic value; cannot be read" }
        : { verdict: "UNRESOLVABLE", evidence: "*301 not present in seed" };
    },
  },
  {
    id: "H5",
    claim: 'TE-KI-TO-NE is Linear A for "carpenters".',
    test(c) {
      const t = c.find((e) => e.seq === "TE-KI-TO-NE");
      if (!t) return { verdict: "UNRESOLVABLE", evidence: "sequence absent from seed" };
      return t.role === "not-linear-a"
        ? { verdict: "KILLED", evidence: "garbled Linear B te-ko-to-ne (τέκτονες, 'carpenters'): Linear B spells -ko-, not -ki-. Not Linear A." }
        : { verdict: "SURVIVES", evidence: "attested as Linear A" };
    },
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Corpus-scale hypotheses — added 2026-11-07 (same session). Pushed onto the
// EXISTING ledger (nothing above is edited or removed). These are the claims
// that only a real SigLA/GORILA corpus can settle: against the 10-row seed
// they deliberately return UNRESOLVABLE ("corpus too small"), so the loop can
// never pass off a sample as a corpus-wide finding (NULL_RESULT posture;
// standards/VERIFY_THE_POSTCONDITION.md). Each verdict is DERIVED from the
// loaded data, never hard-coded — the evidence prints the real counts.
const CORPUS_SCALE_MIN = 25; // below this, positional/frequency claims are noise
HYPOTHESES.push(
  {
    id: "H6",
    claim: "Sign-group-final position is dominated by a small set of signs (an administrative/grammatical suffix effect) — testable only at corpus scale.",
    test(c) {
      if (c.length < CORPUS_SCALE_MIN) {
        return { verdict: "UNRESOLVABLE", evidence: `corpus too small: ${c.length} sequences, need ≥${CORPUS_SCALE_MIN} — load a real export with --corpus` };
      }
      const finals = [...corpusStats(c).final.entries()].sort((a, b) => b[1] - a[1]);
      const totalFinal = finals.reduce((sum, [, n]) => sum + n, 0);
      const [topSign, topCount] = finals[0];
      const topShare = (topCount / totalFinal) * 100;
      return topShare >= 15
        ? { verdict: "SURVIVES", evidence: `top sign-final sign ${topSign} is ${topShare.toFixed(1)}% of ${totalFinal} sequence-final signs — concentration consistent with a suffix effect` }
        : { verdict: "KILLED", evidence: `sequence-final signs are near-uniform (top ${topSign} only ${topShare.toFixed(1)}%) — no suffix concentration at this scale` };
    },
  },
  {
    id: "H7",
    claim: "Undeciphered (*-starred) signs are a MINORITY of all sign tokens — i.e. most of the script carries agreed phonetic values — testable only at corpus scale.",
    test(c) {
      if (c.length < CORPUS_SCALE_MIN) {
        return { verdict: "UNRESOLVABLE", evidence: `corpus too small: ${c.length} sequences, need ≥${CORPUS_SCALE_MIN} — load a real export with --corpus` };
      }
      let starred = 0;
      let total = 0;
      for (const { seq } of c) {
        for (const sign of tokenize(seq)) {
          total += 1;
          if (isUndeciphered(sign)) starred += 1;
        }
      }
      const pct = (starred / total) * 100;
      return pct < 50
        ? { verdict: "SURVIVES", evidence: `${starred}/${total} sign tokens (${pct.toFixed(1)}%) are starred/undeciphered — the majority have agreed values` }
        : { verdict: "KILLED", evidence: `${pct.toFixed(1)}% of ${total} sign tokens are undeciphered — the majority cannot be read` };
    },
  },
);

function runLinearALoop(maxIter, corpus = LINEAR_A_SEED, sourceLabel = "seed sample; method harness, not a decipherment") {
  const stats = corpusStats(corpus);
  console.log(`\n── Linear A structural loop (${sourceLabel}) ──`);
  console.log(`corpus: ${corpus.length} attested sequences, ${stats.freq.size} distinct signs`);
  const top = [...stats.freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s}:${n}`).join("  ");
  console.log(`most frequent signs: ${top}`);
  const undeciphered = [...stats.freq.keys()].filter(isUndeciphered);
  console.log(`undeciphered (starred) signs present: ${undeciphered.join(", ") || "none"}`);

  const limit = Number.isFinite(maxIter) && maxIter > 0 ? maxIter : HYPOTHESES.length;
  const ledger = [];
  console.log(`\nhypothesis ledger (running ${Math.min(limit, HYPOTHESES.length)} of ${HYPOTHESES.length}):`);
  for (const h of HYPOTHESES.slice(0, limit)) {
    const { verdict, evidence } = h.test(corpus);
    const mark = verdict === "SURVIVES" ? "✓" : verdict === "KILLED" ? "✗" : "?";
    console.log(`  ${mark} ${h.id} [${verdict}] ${h.claim}`);
    console.log(`      evidence: ${evidence}`);
    ledger.push({ id: h.id, verdict });
  }
  const tally = ledger.reduce((m, e) => ((m[e.verdict] = (m[e.verdict] || 0) + 1), m), {});
  console.log(`\nsummary: ${JSON.stringify(tally)} — survivors are kept, kills are logged, not re-tried.`);
  return ledger;
}

if (process.argv.includes("--linear-a")) {
  const i = process.argv.indexOf("--iter");
  const maxIter = i >= 0 ? Number(process.argv[i + 1]) : undefined;
  // Fail loudly on a bad --iter rather than silently running the whole ledger,
  // so a mistyped limit can't look like a successful bounded run (Gitar review,
  // PR #18298; same postcondition-honesty rule as H4).
  if (i >= 0 && !(Number.isInteger(maxIter) && maxIter > 0)) {
    throw new Error(`--iter expects a positive integer, got ${JSON.stringify(process.argv[i + 1])}`);
  }
  // Was `runLinearALoop(maxIter);` — now dispatched so `--corpus <path>` can
  // run the SAME ledger against a real export. With no --corpus, dispatch calls
  // runLinearALoop(maxIter) exactly as before: the seed path is byte-identical.
  dispatchLinearA(maxIter);
}

// ───────────────────────────────────────────────────────────────────────────
// Real-corpus ingestion — added 2026-11-07 (same session). Lets the ledger run
// against an ATTESTED SigLA/GORILA export instead of the built-in seed. It does
// NOT ship a corpus and it does NOT invent one: you supply the file. The loader
// refuses any row without a `source` citation, so "ran against an attested
// corpus" is a checked claim, not decoration (standards/VERIFY_THE_POSTCONDITION.md).
//
//   node verify.mjs --linear-a --corpus path/to/corpus.json
//   node verify.mjs --linear-a --corpus corpus.json --iter 4
//   node verify.mjs --corpus-template        # print the expected JSON schema
//
// Expected JSON: an array of rows, or { "sequences": [ ...rows ] }. Each row:
//   { "seq": "KU-RO", "role": "total", "source": "GORILA <vol>:<page>; <id>" }
// `seq` and `source` are REQUIRED; `role` is optional (defaults to "unknown").
// (The --corpus-template fast-path at the top of this file prints this schema.)

async function loadCorpus(path) {
  const { readFileSync } = await import("node:fs");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`--corpus: cannot read ${JSON.stringify(path)}: ${err.message}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`--corpus: ${JSON.stringify(path)} is not valid JSON: ${err.message}`);
  }
  const rows = Array.isArray(data) ? data : data && data.sequences;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`--corpus: expected a non-empty array or {"sequences":[...]} in ${JSON.stringify(path)}`);
  }
  // Postcondition (RVS-VERIFY-001): reject loudly on the first row that is not
  // a cited attestation. Do NOT silently drop rows — a partial load that looked
  // complete would be exactly the marker-nobody-checks failure the repo bans.
  return rows.map((row, idx) => {
    if (!row || typeof row.seq !== "string" || row.seq.trim() === "") {
      throw new Error(`--corpus: row ${idx} has no "seq" string`);
    }
    if (typeof row.source !== "string" || row.source.trim() === "") {
      throw new Error(`--corpus: row ${idx} (${row.seq}) has no "source" — attested rows need a citation (SigLA/GORILA ref)`);
    }
    return { seq: row.seq.trim(), role: typeof row.role === "string" && row.role.trim() ? row.role.trim() : "unknown", source: row.source.trim() };
  });
}

function dispatchLinearA(maxIter) {
  const corpusIdx = process.argv.indexOf("--corpus");
  if (corpusIdx < 0) {
    runLinearALoop(maxIter); // unchanged seed behaviour
    return;
  }
  const path = process.argv[corpusIdx + 1];
  if (!path || path.startsWith("--")) {
    throw new Error(`--corpus expects a file path, got ${JSON.stringify(path)}`);
  }
  loadCorpus(path)
    .then((corpus) => {
      console.log(`loaded ${corpus.length} attested sequences from ${path}`);
      runLinearALoop(maxIter, corpus, `real corpus: ${path}`);
    })
    .catch((err) => {
      console.error(String((err && err.message) || err));
      process.exit(1);
    });
}

if (process.argv.includes("--corpus") && !process.argv.includes("--linear-a")) {
  throw new Error('--corpus must be combined with --linear-a, e.g. node verify.mjs --linear-a --corpus corpus.json');
}
