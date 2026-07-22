# WR-4600 · Photon Bench Directive

A self-contained, zero-build photobiomodulation (PBM) engineering dashboard —
660nm red, 850nm near-infrared. It is both a working design tool (an interactive
biphasic dose calculator) and a complete reasoning record: the gates that stop a
naive build, the evidence that grounds it, and the kill ledger of refused ideas.

**Physics gates the fleet. Measurement gates the physics.**

## What it is

A single static page (`index.html` + three JS files + one stylesheet) with 12
tabs covering the whole directive:

- **Dose Bench** — interactive: two independent sliders (irradiance mW/cm²,
  exposure s) plus spot area, live fluence (`J/cm² = mW/cm² × s ÷ 1000`), a
  schematic Arndt–Schulz biphasic curve with a live dose marker, and a
  therapeutic-window classifier.
- **Verdict · Measurement (Gate Ø) · The Probes · Prompts · Fleet · Sync Map ·
  BOM · Evidence · Textiles & Pulsing · Watchtower · Kill Ledger · Thought
  Process** — the full directive, rendered.

## The two design rules this build honors

1. **Irradiance and fluence are independent.** Equal joules at unequal power
   density are not equal treatments (Lopes: 0.9 J/cm² at 55 vs 155 mW/cm²,
   opposite outcomes). That is why the Bench has two sliders where most
   calculators have one, and why `dose-engine.js` never collapses them.
2. **Never emit a URL that was not returned by a live call.** Per WR-4200, a
   fabricated citation is a P0 incident. The Evidence tab therefore renders
   source **titles + `[PROVEN]/[EMERGING]/[SPECULATIVE]` tags only** — live URLs
   are resolved by the Watchtower / Prospector harvest against the APIs, not
   typed from memory. (The "73 vs 135" count discrepancy from the source thread
   is flagged in-tab as unresolved, not papered over.)

## Architecture

```text
products/wr-4600-photon-bench/
├── index.html      # page shell (loads the three scripts + stylesheet)
├── styles.css      # dark instrument-panel UI
├── dose-engine.js  # UMD: fluence / total-joules / Arndt–Schulz / classify
├── content.js      # the 12 tabs' content
├── app.js          # tab nav + interactive Dose Bench (curve, sliders)
├── vercel.json     # static deploy, no build step
└── README.md
```

`dose-engine.js` is the single source of truth for the dose math and is directly
`require()`-able from Node — regression tests live in
`tests/wr-4600-dose-engine.test.js`. Everything is deterministic (no
`Date`/`Math.random`), so the Bench is reproducible and testable.

## Local development

```bash
cd products/wr-4600-photon-bench
python3 -m http.server 8080    # then open http://localhost:8080
```

No build step, no dependencies. Drop in a repo, enable Pages, done.

## Scope & safety

This is an **engineering and measurement-discipline tool**, not medical advice.
It reports mW/cm² and °C; it makes no therapeutic claim. It is the opposite of a
wellness-marketing surface — its entire purpose (Gate Ø, the asymmetry rule, the
refusal set) is to *kill* unfounded claims and force measurement before belief.
Pairs with the existing `products/red-light-therapy-dosage-calculator/`.

## Roadmap

- Wire the Watchtower harvest (`tools/harvest.py` + `watchtower.yml`) to populate
  live citation URLs and daily snapshots, resolving the 73/135 count to one
  live-verified number.
- MCX (`pmcx`) tissue Monte Carlo behind the Photometer for real depth/penetration
  at 660 vs 850nm.
- Reconcile against `red-light-therapy-dosage-calculator` — shared dose engine.
