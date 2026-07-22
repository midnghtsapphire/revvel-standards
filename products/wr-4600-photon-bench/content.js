/* WR-4600 tab content. Citations render as source TITLES + evidence tags only.
 * Per WR-4200: never emit a URL that was not returned by a live call — a
 * fabricated citation is a P0 incident. Live URLs are populated by the
 * Watchtower / Prospector harvest, not typed from memory here. */
/* global window */
window.WR4600_TABS = [
  {
    id: "verdict",
    label: "Verdict",
    html: `
      <h2>The Verdict</h2>
      <p class="lede">Open since the first message: conformal joint/limb harness, or torso array? Asked eleven times. There is now enough to answer it — and the answer is that the question was a false binary, and your own rule decides it.</p>

      <div class="verdict-row"><span class="call KILL">KILL</span><div><strong>Torso array</strong> — a torso is close enough to flat that a commercial panel already lights it. Panels start near $200; your parts land at $120–260 at qty 1 and you supply the labour, risk, and warranty. Buy the panel.</div></div>
      <div class="verdict-row"><span class="call KILL">KILL</span><div><strong>Emitter harness (24 LEDs on a strap)</strong> — wrong architecture. Emitters on skin means drivers on skin (IEEE 1789 flicker; a rectification fault drops into the 3–70 Hz hazard band), heat at the skin (your own 44 °C veto), and hot spots (the tattoo burn happened under an emitter). Every hard problem traces to source-on-skin.</div></div>
      <div class="verdict-row"><span class="call DEFER">DEFER</span><div><strong>POF light guide</strong> — woven plastic optical fiber, source off-body, fabric only distributes. PHOSISTOS built 500 cm² diffusers; 100 cm² hand-loomed hit 18 ± 2.5 mW/cm², IR-verified, inside the band. Right architecture, clinically validated — but a 10× build (loom, beam expanders, dual-end injection, a 5 W laser-safety problem). Not until step 2.</div></div>
      <div class="verdict-row"><span class="call GO">GO</span><div><strong>Measure first</strong> — forced by your own asymmetry rule. $240 and an afternoon settles what six months of argument cannot.</div></div>

      <h3>Gate Ø, applied to your own project</h3>
      <p>MALUS is fully measurable — 44 °C, erythema, ocular exposure, flicker band, seizure, vertigo: five documented harms, each with a number. METRIC is measurable too — but METER is not in your hands. You cannot read mW/cm² at the treatment plane today. Your asymmetry rule: <em>if harm is measurable and benefit is not, kill it</em>. Not "your idea is bad" — "you cannot screen this yet." <strong>You wrote the rule that stops your own build. That is the rule working.</strong></p>

      <h3>The sequence that falls out of it</h3>
      <table>
        <thead><tr><th>#</th><th>Step</th><th>Cost</th><th>What it decides</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Buy the meter. Thorlabs PM16, integrating-sphere head. BOM line 13, which was always the real line 1.</td><td>$40–350</td><td>Everything. Nothing downstream is screenable without it.</td></tr>
          <tr><td>2</td><td>Buy a $200 panel and measure it — to falsify it. mW/cm² at 15/30/45 cm; PWM frequency; skin temp at 10 min.</td><td>~$200</td><td>Whether commercial panels are decoration. Settles the 50 mW/cm² hypothesis in an afternoon.</td></tr>
          <tr><td>3</td><td>Run the fabric transmittance test. Rayon, cotton, linen, bamboo mesh, between panel and meter. 660 and 850.</td><td>$0</td><td>Your entire textile question, answered with hardware you now own.</td></tr>
          <tr><td>4</td><td>Then decide harness vs POF vs nothing.</td><td>—</td><td>With numbers instead of a fork.</td></tr>
        </tbody>
      </table>

      <div class="callout go"><strong>The instrument is the work.</strong> The harness was the excuse. You have already built a measurement layer for a field whose own meta-research counts 285 systematic reviews, 11,000+ references, and no agreement on the parameters. Flagged as the one claim here least certain — a neat story is how you would be fooled. Prosecute it.</div>
    `,
  },

  { id: "bench", label: "Dose Bench", html: `<div id="bench-mount"></div>` },

  {
    id: "measurement",
    label: "Measurement",
    html: `
      <h2>Gate Ø · Measurement</h2>
      <p class="lede">Your addition, and it outranks the five. You cannot screen technological feasibility against an endpoint that does not exist. Gate Ø runs first.</p>
      <table>
        <thead><tr><th>Probe</th><th>The question</th><th>For this build</th></tr></thead>
        <tbody>
          <tr><td><strong>METRIC</strong></td><td>What number moves? Name the endpoint and units.</td><td>mW/cm², °C, J/cm², VAS points, % closure</td></tr>
          <tr><td><strong>METER</strong></td><td>What instrument reads it? Calibrated how? Who else can read it?</td><td>Thorlabs PM16 · thermistor · planimetry</td></tr>
          <tr><td><strong>MARK</strong></td><td>Baseline against what, measured when, by whom?</td><td>Contralateral limb · pre-treatment · sham</td></tr>
          <tr><td><strong>MASK</strong></td><td>What blinding is possible? Who could fool themselves?</td><td>Sham = device off. 850nm is invisible — blinding NIR is trivially easy</td></tr>
          <tr><td><strong>MALUS</strong></td><td>What harm is measurable, and at what threshold?</td><td>Skin temp &gt;44 °C · erythema · ocular exposure</td></tr>
        </tbody>
      </table>
      <div class="callout kill"><strong>THE ASYMMETRY RULE · terminal.</strong> If MALUS is measurable and METRIC is not — kill it. Do not screen further. Measurable harm plus unmeasurable benefit is the precise anatomy of an unfundable project. It is also the anatomy of most wellness fraud: not lying, just never looking.</div>
      <div class="callout"><strong>THE PERSONAL-USE FORK.</strong> n-of-1 relaxes MASK and MARK — skip blinding, skip controls. It does <em>not</em> relax METRIC and METER. A personal experiment without an instrument is not evidence, it is belief with extra steps. State which fork applies before proceeding, and do not let it drift.</div>

      <h3>The monitoring panel — four tiers, honestly ranked</h3>
      <table>
        <thead><tr><th>Tier</th><th>Marker</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td><strong>1 · Instrument</strong><br><span class="note">do these or do nothing</span></td><td>Irradiance · skin temperature · fluence · verified wavelength (PM16 · NTC/IR · derived · spectrometer)</td><td>Fully validated. No biology required. Your entire panel for a wellness-class device.</td></tr>
          <tr><td><strong>2 · Clinical</strong><br><span class="note">grant-defensible</span></td><td>VAS pain · range of motion/MMO · wound closure % · EQ-5D-5L (questionnaire · goniometer · planimetry)</td><td>What the RCTs actually used. Free. Validated. Reviewers accept them.</td></tr>
          <tr><td><strong>3 · Blood</strong><br><span class="note">research-grade</span></td><td>IL-1/6/10 · TNF-α · PGE2 (serum); MMP-3/13 · CTX-II (synovial) — ELISA/phlebotomy/arthrocentesis</td><td>2026 knee OA pilot (n=30) contradicts itself: abstract claims reduced TNF-α/IL-6, results report no significant difference. Flagged, not resolved.</td></tr>
          <tr><td><strong>4 · Genes</strong><br><span class="note">hard no</span></td><td>RUNX2 · ALP · OPN · OCN · COX-2 · IL-6 mRNA — qPCR on excised tissue</td><td>There is no gene marker you can monitor in a living person. The assay requires the tissue. You get this data by killing the rat.</td></tr>
        </tbody>
      </table>
      <div class="callout"><strong>The regulatory cost of your own question.</strong> Ordering biomarker panels to guide treatment likely pushes you out of General Wellness into medical-device territory (FDA guidance revised 6 Jan 2026). The test: noninvasive, no safety-risk technology, not intended for diagnosis/cure/mitigation/prevention/treatment. A harness reporting mW/cm² and °C fails none of those clauses. "Cures aging" fails every one at once.</div>
    `,
  },

  {
    id: "probes",
    label: "The Probes",
    html: `
      <h2>The Probes</h2>
      <p class="lede">"How do I add the parts I don't think of but need?" A question is smaller than an answer. You cannot enumerate unknown unknowns — but you do not have to. You do not need to know about ferromagnetic tattoo pigment. You need to know that "who got hurt?" is a question that exists. So stop prompting for content. Prompt for the probes.</p>
      <div class="probe-grid">
        <div class="probe"><h4>Bench</h4><p class="q">Who else belongs at it?</p><p>Name the disciplines, let each speak. You do not need to know what a dermatologist knows — you need to know a dermatologist should be in the room.</p></div>
        <div class="probe"><h4>Body</h4><p class="q">Who got hurt, and how did anyone find out?</p><p>Adverse events are mandatory-reportable; null results are not publishable. The harm literature is systematically better indexed than the efficacy literature. Search damage before benefit — the opposite of what everyone does.</p></div>
        <div class="probe"><h4>Blade</h4><p class="q">What would the reviewer paid to reject this say?</p><p>Ask for an answer, get an answer. Ask for the reasons to refuse, get the gap list. Same model, same knowledge, different retrieval.</p></div>
        <div class="probe"><h4>Blank</h4><p class="q">What did I not ask?</p><p>A required negative on every output: here is what I could not answer, and here is what would answer it. A mandatory closing section — never "none."</p></div>
      </div>
      <div class="callout"><strong>THE TATTOO BURN · Body probe, first result.</strong> Running the Body probe returned, within a single search, a documented burn from low-level light therapy through a tattoo — ferromagnetic compounds in the pigment absorbed the energy and heated the skin locally. The light was within normal parameters. The skin was not. Neither of us would have written "check for tattoo ink." Both of us would write "who got hurt." That gap is the entire mechanism. <span class="pill">Source: "Low level light therapy and tattoos: a case report" · EMERGING</span></div>
      <p><strong>The structural diagnosis:</strong> TRIZ, the DOE screen, LCA, BNAT — every framework is a lens on your idea. Not one looks at the space around it. The probes are not more criteria. They are a second frame, aimed at what the first structurally excludes. The lamp lights the room; what you cannot see at all stands behind the lamp.</p>
    `,
  },

  {
    id: "prompts",
    label: "Prompts",
    html: `
      <h2>The Directives</h2>
      <p class="lede">Four prompts. WR-4200 governs the estate. 4600.1 governs the reasoner. 4600.2 is the thin header every swarm agent inherits. 4600.4 is the master prompt, corrected, portable to any model.</p>
      <details open><summary>WR-4200 · Operating Directive</summary>
<pre class="prompt"># WR-4200 — OPERATING DIRECTIVE
# Owner: Audrey Evans (@meetaudreyevans) · GitHub: MIDNGHTSAPPHIRE
# Scope: durable. Identity, discipline, gates, refusals, budget.

## PRINCIPLES
- Non-destructive by default. Audit first, act second. No history rewrite
  without explicit approval.
- Act, do not announce. When blocked by missing credentials, emit a BOM /
  procurement list. Do not stall, fabricate, or simulate the call.
- Prosecution-first: find what is wrong before what is right.

## EVIDENCE DISCIPLINE
Tag every claim exactly once: [PROVEN] | [EMERGING] | [SPECULATIVE].
Untagged claims are defects. NEVER synthesize a URL, DOI, part number,
price, or citation. A fabricated reference is a P0 incident. If you cannot
source it, emit exactly:
  "I need a valid source or text I can initiate research."

## GATE 0 — MEASUREMENT. Runs before all other screening.
  METRIC / METER / MARK / MASK / MALUS
ASYMMETRY RULE — terminal: if MALUS is measurable and METRIC is not, KILL.
PERSONAL FORK: n-of-1 relaxes MASK and MARK only. METRIC and METER stay.

## THE PROBES — run on every non-trivial task, output all four
  BENCH / BODY / BLADE / BLANK (BLANK is required; never say "none").

## REFUSAL SET — reject and log, do not steelman
- Mechanisms that do not exist as stated.
- Success-rate promises attached to an undefined endpoint.
- Any request to waive a safety limit. Route to the sentinel; veto is terminal.
- Language that pre-commits the conclusion. Rewrite neutrally, say you did.

## BUDGET
OpenRouter hard cap $150/mo. On projected breach: halt, emit BUDGET_HALT.
Prefer deterministic code over model calls wherever the pass condition is a
boolean. Every rule demoted from prompt to script is pure profit.

## OUTPUT CONTRACT
Answer first. Ranked. Scannable. Close with (1) the BLANK section, (2)
exactly one sharpening question.

## KNOWN-GOOD, DO NOT REGRESS
Retention claims are prohibited. A confidence claim that tells an agent to
stop checking is a defect, not a feature.</pre>
      </details>
      <details><summary>WR-4600.1 · LUMEN · the reasoner</summary>
<pre class="prompt">You are LUMEN, Lead Systems Engineer for a photobiomodulation hardware
program. You specify and reason. Agents implement. Inherit WR-4200 in full.

## PHYSICS FLOOR
- Fluence J/cm2 = irradiance mW/cm2 x seconds / 1000. State both terms.
- Response is biphasic (Arndt-Schulz). More is not better past threshold.
- Irradiance and fluence are INDEPENDENT. Equal joules at unequal power
  density are not equal treatments (Lopes: 55 vs 155 mW/cm2, same 0.9 J/cm2,
  opposite outcomes). Never collapse them into one number.
- Report wavelength, irradiance at the plane, exposure, fluence, spot area,
  total joules. A dose missing any term is not a dose.

## DOMAIN REFUSALS — these are not engineering problems
- Fabric/thread/garment that emits or imparts a "frequency." Hz is a drive,
  not a textile.
- Gene "unblocking", reversing aging, curing fatigue by illumination.
  Nearest real mechanism is optogenetics — and the switch must be installed.
- Any PBM success-rate promise. There is no 80% anything.

## METHOD — in order, show the gate
0 GATE 0 Measurement. 1 PROBLEM. 2 BAT. 3 TRIZ. 4 SCREEN (DOE 5-point,
kill on any single failure). 5 LCA. 6 BNAT (a patent claim is SPECULATIVE).
7 VERDICT: REFINE | REPURPOSE | PIVOT | KILL.

## SAFETY INTERLOCK
You cannot waive an optical, thermal, or electrical limit. Route to
DRAGNET-OPTIC. Veto classes: ocular exposure, skin thermal load, mains
isolation.</pre>
      </details>
      <details><summary>WR-4600.2 · Fleet preamble · under 200 tokens by design</summary>
<pre class="prompt"># Prepend to every agent. A persona is a hat, not a biography.
You are {AGENT}. Role: {ROLE}. You act, you do not announce.
Read FAILURE-LEDGER.md before acting. Append to it on every failure.
Tag every claim [PROVEN]/[EMERGING]/[SPECULATIVE]. Never invent a source.
Emit only your artifact contract. No prose, no summary, no apology.
Budget: {TOKENS}. On breach, halt and emit BUDGET_HALT.
Escalate to DRAGNET-OPTIC on any optical/thermal/electrical/medical claim.
Close with BLANK: what you could not answer, and what would answer it.
Contract: {SCHEMA}</pre>
      </details>
      <details><summary>WR-4600.4 · Master prompt, corrected · portable</summary>
<pre class="prompt">You are an autonomous Lead Systems Engineer, Market Analyst, and R&D
Director. Do not accept my idea at face value. Deconstruct the root problem,
survey the state of the art, and decide autonomously whether to refine it,
repurpose something better, or scrap it.

## GATE 0 — MEASUREMENT. Runs first.
  METRIC / METER / MARK / MASK / MALUS
ASYMMETRY RULE — terminal: if MALUS is measurable and METRIC is not, KILL.
PERSONAL-USE FORK: n-of-1 relaxes MASK and MARK only. State which applies.

## THE PROBES — output all four, every run
  BENCH / BODY (search harm BEFORE benefit) / BLADE / BLANK (never "none").

## EVIDENCE DISCIPLINE
Tag every claim [PROVEN]/[EMERGING]/[SPECULATIVE]. Untagged is a defect.
Never synthesize a URL, DOI, part number, price, or citation. If you cannot
source it: "I need a valid source or text I can initiate research."

## METHOD
0 GATE 0. 1 PROBLEM. 2 BAT. 3 TRIZ. 4 SCREEN (DOE 5-point). 5 LCA. 6 BNAT.
7 VERDICT: REFINE | REPURPOSE | PIVOT | KILL.

## OUTPUT
Answer first. Ranked. High-level BOM and cost-benefit for the surviving
path, with named risks. Close with the BLANK section, then exactly one
sharpening question.

MY IDEA: [insert]</pre>
      </details>
      <h3>Scripts or prompts — the boundary</h3>
      <p>Neither is "better." One test: can you write the pass condition as a boolean? <strong>Yes → script</strong> ("Is fluence between 1 and 20 J/cm²?") — deterministic, zero tokens, never hallucinates, auditable forever. <strong>No → prompt</strong> ("Is this paradigm obsolete?") — judgment under ambiguity, costs tokens every call, drifts. Maximize the scripted surface. That is why Dragnet-Optic is Rust and LUMEN is prose — economics, not aesthetics.</p>
    `,
  },

  {
    id: "fleet",
    label: "Fleet",
    html: `
      <h2>The Fleet</h2>
      <p class="lede">Six agents. Three archetypes: harvesters run wide and parallel, solvers run narrow and gated, the sentinel runs on everything and can stop all of it. Personas stay thin — every persona token is paid on every call in a swarm.</p>
      <table>
        <thead><tr><th>Agent</th><th>Archetype</th><th>Output</th></tr></thead>
        <tbody>
          <tr><td><strong>A-4601 Prospector</strong><br><span class="note">"Bring back the source or bring back nothing."</span></td><td>Harvester · retrieval · parallel N=8</td><td><code>evidence.jsonl</code> — {url, doi, kind, tag, claim, retrieved_at, sha256}</td></tr>
          <tr><td><strong>A-4602 Photometer</strong><br><span class="note">"Joules at the right depth are the product."</span></td><td>Solver · physics · gated on 4601</td><td><code>dose_map.npz</code> · <code>thermal_budget.json</code> · <code>fluence_report.md</code></td></tr>
          <tr><td><strong>A-4603 Fabricator</strong><br><span class="note">"Skeleton first. One upward rev."</span></td><td>Solver · CAD/EE · gated on 4602</td><td><code>*.kicad_sch</code> · gerbers.zip · bom.csv · cpl.csv · ibom.html</td></tr>
          <tr><td><strong>A-4604 Quartermaster</strong><br><span class="note">"Single, bulk, and the break point between."</span></td><td>Harvester · sourcing · parallel with 4603</td><td><code>sourcing.csv</code> — {mpn, qty_break, unit, ext, lead_days, datasheet_url, risk}</td></tr>
          <tr><td><strong>A-4605 Dragnet-Optic</strong><br><span class="note">"Prosecution-first." TERMINAL VETO</span></td><td>Sentinel · Rust · zero LLM calls · every PR</td><td>PR status check · veto.json · Kill Ledger append. No downstream agent overrides.</td></tr>
          <tr><td><strong>A-4606 Scribe</strong><br><span class="note">"If it is not on the board, it did not ship."</span></td><td>Solver · docs/dashboard · gated last</td><td>This file, regenerated. <code>build/inventory.json</code>.</td></tr>
        </tbody>
      </table>
      <div class="callout"><strong>Photometer note.</strong> A 64-emitter irradiance grid does not need CUDA. Tissue Monte Carlo does. Do not GPU-accelerate arithmetic to look serious. CUDA is kept for MCX photon transport through turbid tissue — the only honest way to answer "how deep does 850nm actually go here."</div>
      <div class="callout kill"><strong>Dragnet-Optic veto classes.</strong> Ocular path · skin thermal load · mains isolation · unsourced medical claim · dose outside gate · missing eye protection in any documented procedure. Rust rule engine — zero LLM calls, therefore zero tokens and no runaway. The saving is architectural, not linguistic.</div>
    `,
  },

  {
    id: "syncmap",
    label: "Sync Map",
    html: `
      <h2>The Sequence</h2>
      <p class="lede">What runs wide, what runs single-file, and where the gate is. Parallelism is free until a downstream agent needs a number that does not exist yet. That is the whole rule.</p>
      <table>
        <thead><tr><th>Stage / Gate</th><th>Who</th><th>Contract</th></tr></thead>
        <tbody>
          <tr><td><strong>Stage 0 · Parallel · fan-out 8</strong></td><td>Prospector ×8, sharded (mechanism, human trials, animal/in-vitro, safety, patents, emitters, drivers, thermal). No shard reads another.</td><td>Merge on DOI/MPN · 12k tokens/shard</td></tr>
          <tr><td><strong>Gate A · barrier — evidence quorum</strong></td><td>Merge fails if any shard returns zero PROVEN rows, or dedup exceeds 60% (shards collapsed onto the same sources). Re-shard.</td><td>blocking · retry ≤3 · then human</td></tr>
          <tr><td><strong>Stage 1 · Sequential — physics</strong></td><td>Photometer alone. Every mechanical/electrical decision is a function of the dose map.</td><td>needs evidence.jsonl → emits dose_map.npz</td></tr>
          <tr><td><strong>Gate B · Dragnet-Optic — terminal veto</strong></td><td>Dose map screened against IEC 62471, ICNIRP 2013, 44 °C onset. Rust, no LLM in the path.</td><td>deterministic · 0 tokens · terminal</td></tr>
          <tr><td><strong>Stage 2 · Parallel · fan-out 2</strong></td><td>Fabricator designs to the dose map; Quartermaster prices the same MPN list. Reconcile on shared bom.csv.</td><td>shared schema</td></tr>
          <tr><td><strong>Gate C · council + DRC</strong></td><td>Six personas review; KiCad DRC required; Dragnet-Optic re-screens (a part substitution can silently change optical output). Any veto returns to Stage 1 — a changed emitter is a changed dose.</td><td>kicad-cli drc · EWMA update</td></tr>
          <tr><td><strong>Stage 3 · Sequential — publish</strong></td><td>Scribe regenerates this dashboard + inventory.json, deploys to Pages. Last, always, only on green.</td><td>on: merge to main</td></tr>
        </tbody>
      </table>
      <p class="note">Eight scouts ride out wide. One gate, and they walk single — the dose knows no crowd.</p>
    `,
  },

  {
    id: "bom",
    label: "BOM",
    html: `
      <h2>The Bill</h2>
      <p class="lede">Skeleton BOM for a flexible 24-emitter harness, dual-wavelength, ~60 cm². Prices are order-of-magnitude placeholders for Quartermaster to replace with live API pulls — <strong>not quotes</strong>. Every emitter line is BLOCKED until a spectral plot and bin code are attached.</p>
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Spec that matters</th><th>Qty</th><th>Est.</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Bicolor emitter</td><td>3535 SMD, 660+850nm one package, If ≤1A. Require spectral plot, bin code, LM-80.</td><td>24</td><td>$0.40–1.20</td></tr>
          <tr><td>2</td><td>Flex MCPCB</td><td>1oz Cu, Al or polyimide+Cu, thermal via array under each pad</td><td>1</td><td>$18–45</td></tr>
          <tr><td>3</td><td>CC driver</td><td>Buck, 350–700mA, ≥90% eff, PWM dim. <strong>pwm_hz REQUIRED · FLOOR 2 kHz.</strong> Cheap drivers run at 2× mains (100/120 Hz); a rectification/LED-string failure modulates at 50–60 Hz — inside the 3–70 Hz hazard band. VETO any driver whose datasheet omits PWM frequency. (NLDD-H supersedes LDD-H — min output now 6V, needs ≥2 LEDs in series.)</td><td>2</td><td>$4–9</td></tr>
          <tr><td>4</td><td>MCU</td><td>Timer + PWM + thermal ADC. RP2040 or ATtiny85 class.</td><td>1</td><td>$1–4</td></tr>
          <tr><td>5</td><td>NTC thermistor</td><td>10k, on the emitter plane, not the enclosure. Drives cutoff.</td><td>2</td><td>$0.30</td></tr>
          <tr><td>6</td><td>Thermal cutoff <span class="tag KILL">VETO GATE</span></td><td>Hardware, non-resettable, opens well below 44 °C skin contact</td><td>1</td><td>$0.60</td></tr>
          <tr><td>7</td><td>Heat spreader</td><td>Graphite sheet or 0.5mm Al. Rθ from Photometer, not vibes.</td><td>1</td><td>$3–8</td></tr>
          <tr><td>8</td><td>Thermal interface</td><td>Phase-change pad or 3M 8810</td><td>1</td><td>$2–6</td></tr>
          <tr><td>9</td><td>PSU</td><td>SELV, isolation, 12–24V, CE/UL marked</td><td>1</td><td>$9–22</td></tr>
          <tr><td>10</td><td>Diffuser</td><td>Only if the dose map calls for it. Costs you irradiance.</td><td>1</td><td>$2–5</td></tr>
          <tr><td>11</td><td>Strap / carrier</td><td>Neoprene or elastic. Passive. Does nothing optical.</td><td>1</td><td>$4–10</td></tr>
          <tr><td>12</td><td>NIR eyewear <span class="tag KILL">VETO GATE</span></td><td>OD ≥4 at 850nm. Non-optional. No blink reflex at 850nm.</td><td>1</td><td>$15–40</td></tr>
          <tr><td>13</td><td>Optical meter <span class="tag GO">GATE Ø</span></td><td>The instrument that decides whether you built a device or a decoration. Integrating-sphere head (PM16-140/144) — entrance-angle-independent, what a diverging array needs.</td><td>1</td><td>$40–350</td></tr>
        </tbody>
      </table>
      <div class="callout"><strong>Cost-benefit, honest.</strong> Parts land near $120–260 at qty 1, dominated by the meter and the eyewear — the two lines every DIY build skips, and the two that determine whether the thing works and whether it hurts you. The DIY case is not cost. It is form factor (a conformal harness no panel vendor sells) and instrumentation you control. If you only want a flat surface irradiated, buy a panel — an honest possible outcome. <strong>Dominant risk is not electrical. It is delivering a confident dose you never measured.</strong></div>
    `,
  },

  {
    id: "evidence",
    label: "Evidence",
    html: `
      <h2>The Ledger</h2>
      <p class="lede">Verified source titles across ten shards, each tagged. Live URLs are resolved by the Watchtower / Prospector harvest against the APIs — <strong>never reconstructed from memory</strong>. The standing rule: never emit a URL that was not returned by a live call. A padded list of plausible-looking URLs would feel like delivery and be sabotage.</p>
      <div class="blank-box"><strong>Count integrity note.</strong> The source thread reports "73 verified URLs" in one place and a 135-row Watchtower cold-start elsewhere; that gap is flagged, not resolved. Until the harvest reconciles it to the same "returned by a live call" standard, this tab renders source <em>titles + tags</em> only — it does not assert a URL count.</div>

      <h3>Shard 01 · Dosimetry &amp; mechanism</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Huang et al. — Biphasic Dose Response in LLLT: An Update. The governing physics; plus the Lopes result (0.9 J/cm² at 55 vs 155 mW/cm², opposite outcomes). Justifies two of the three Bench sliders.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Brain PBM: A Narrative Review — peak ATP ~3 J/cm² at 25 mW/cm² in cortical neurons; Arndt–Schulz named.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>PBM Dose Parameters in Dentistry: SR &amp; MA — closest thing to a dosimetry standard that exists.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>660nm + vitamin D on osteoblastic differentiation — the only real photo-adjunct in the pull. In vitro; cells in a dish. Not a stack, not a human, not longevity.</td></tr>
      </tbody></table>

      <h3>Shard 02 · Human trials — SRs &amp; meta-analyses</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>PBM improves depression: SR &amp; MA of RCTs — 11 RCTs, GRADE-assessed, SMD −0.55 [−0.75, −0.35], I²=46%.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Hanna et al., Antioxidants 10:1028 — TMD, 44 studies, 46% at high risk of bias (the honest quality floor).</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>PBM for scars: scoping review (2026) — red/NIR, 7 studies, n=297, adverse events extracted explicitly.</td></tr>
      </tbody></table>

      <h3>Shard 03 · Adverse events — Body probe, harm first</h3>
      <table><tbody>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td><strong>The unknown unknown.</strong> "Low level light therapy and tattoos: a case report" — burn through a tattoo; ferromagnetic pigment absorbed energy. Light normal, skin not.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>NCT07069764 reported adverse events — 0/15 and 0/15. The zero's mechanism: "No ocular adverse effects... due to protective eye goggles." Safety from the goggles, not the light.</td></tr>
        <tr><td><span class="tag SPECULATIVE">SPECULATIVE</span></td><td>NCT04829734 protocol — "not expected that any adverse events will result." Logged as the confidence claim that stops people looking. The tattoo case is what it misses.</td></tr>
      </tbody></table>

      <h3>Shard 04 · Biomarkers — Gate Ø made concrete</h3>
      <table><tbody>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>PBM modulates inflammatory &amp; cartilage biomarkers in KOA — n=30, sham-controlled, and it <strong>contradicts itself</strong>: abstract claims reduced IL-6/TNF-α, results report no significant difference in the same markers. Exactly the defect Gate Ø exists to catch.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>NCT04034849 — PBM in BMS, RCT. Read for MASK/MARK: sham = device off, sealed-envelope allocation, powered for a 4-point VAS difference. What blinding a light trial actually looks like.</td></tr>
      </tbody></table>

      <h3>Shard 05 · BNAT — the real "light-emitting shirt"</h3>
      <table><tbody>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Textile NIR OLED phototherapy platform (KAIST) — NIR OLED stacks fabricated directly onto textile, parylene-C skin barrier. It works because it is a device shaped like fabric, not fabric that is somehow a device.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Self-regulating wearable OLED patch (Materials Horizons 2026) — 630nm at 5 mW/cm², dose-dependent 2–8 J/cm², ROS-triggered drug release.</td></tr>
      </tbody></table>

      <h3>Shard 06 · Safety standards — veto authority</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>ICNIRP — Limits of Exposure to Incoherent Visible and IR. The primary document Dragnet-Optic encodes.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Lumileds AB191-4 — LUXEON IR Eye Safety. Worked 850nm example at 20cm, t=1000s. States plainly: for IR sources the visual stimulus cannot activate the aversion response.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>CSA / IEC 62471 exposure-limit tables — Risk Groups 0–3.</td></tr>
      </tbody></table>

      <h3>Shard 07 · Regulatory — changed after training cutoff</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>FDA — General Wellness: Policy for Low Risk Devices, revised 6 Jan 2026 (supersedes 2019). Found by searching; directly governs what may be claimed.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Troutman Pepper Locke — the operative test: noninvasive, no safety-risk technology, not for diagnosis/cure/mitigation/prevention/treatment. "Cures aging" fails every clause at once.</td></tr>
      </tbody></table>

      <h3>Shard 08 · Simulation &amp; tissue optics — the honest CUDA</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>fangq/mcx — Monte Carlo eXtreme. Photometer's engine; GPU-accelerated, validated MC photon transport. Ships pmcx (installable today).</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Jacques — Optical properties of biological tissues (2013, PMB). µa/µs'/g across seven tissue groups. Photometer's input constants.</td></tr>
      </tbody></table>

      <h3>Shard 09 · Parts, instruments, open hardware</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Thorlabs PM16 family — Si 400–1100nm covers 660 and 850 in one sensor. Integrating-sphere heads (PM16-140/144) are entrance-angle-independent. BOM line 13.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Mean Well NLDD-H — supersession that would have bitten at layout: replaces LDD/LDH/LDB, min output raised to 6V → requires ≥2 LEDs in series.</td></tr>
        <tr><td><span class="tag SPECULATIVE">SPECULATIVE</span></td><td>Chanzon 30W deep red COB — negative example. "650–660nm" you cannot verify is a band you do not have. What most DIY builds actually buy.</td></tr>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>mfhepp/open_hardware_template — KiCad + software, CERN-OHL. Start here, not from an empty directory.</td></tr>
      </tbody></table>

      <h3>Shard 10 · Pulsing — sixteen years, still open</h3>
      <table><tbody>
        <tr><td><span class="tag PROVEN">PROVEN</span></td><td>Zein, Selting &amp; Hamblin — Review of light parameters. Nine pulsed-vs-CW comparisons: six pulsed better, one equal, two CW better. "Impossible to draw any correlation" between pulse parameters and outcome.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>Chaki et al., J Biophotonics 2025 — 60W peak, 2ms, 10% duty, 50 Hz: pulsed achieved the lowest skin temp (42.5 °C) AND the highest fluence (~4.2 J/cm²) simultaneously. Pulsing buys headroom under the 44 °C veto.</td></tr>
        <tr><td><span class="tag EMERGING">EMERGING</span></td><td>NCT07707284 — live trial, updated 2026-07-16, found by the Watchtower on its first run. Frequency-dependent effects of transcranial PBM on cortical excitability. Your exact question, registered.</td></tr>
      </tbody></table>

      <div class="blank-box"><strong>Honest negative result (possibly mine).</strong> A search for an existing open-source PBM device repo — KiCad, BOM, dose validation — returned nothing. That is either a real gap in the commons or a search failure. "Nobody has done this" is exactly the claim most likely to be a retrieval artifact. Prospector must re-run with different phrasing before it is treated as settled.</div>
    `,
  },

  {
    id: "textiles",
    label: "Textiles & Pulsing",
    html: `
      <h2>Textiles &amp; Pulsing</h2>
      <div class="callout kill"><strong>KILL-07 · 15 Hz is the worst number you could have picked.</strong> Two harms, stacked. <strong>Harm 1 — seizure:</strong> photosensitivity affects ~0.3–3% of people; 15–25 Hz is the most provocative band. In the Pokémon incident 685 children were hospitalized, and only 24% who seized had ever seized before. Red is a listed factor; your device is red. <strong>Harm 2 — flicker vertigo (no screening criterion):</strong> the Bucha effect — disorientation, vertigo, nausea from a 1–20 Hz strobe. Not restricted to people with epilepsy histories. 15 Hz sits inside both bands at once.</div>
      <div class="callout go"><strong>The fix (disclosed in a corneal-surgery patent, not claimed).</strong> Randomized asynchronous pulsed patterning — non-periodic, uniformly-appearing illumination eliminates the possibility of triggering photosensitive seizures or flicker vertigo for pulse frequencies between 2–84 Hz. Randomize the phase and there is no periodic drive to entrain to. You keep the photochemistry of pulsing and lose the neurology. <span class="pill">US 9,707,126 B2 — Avedro · SPECULATIVE (spec, not claims)</span></div>
      <div class="callout go"><strong>The other fix — skip the eyes entirely.</strong> A 2026-07-10 paper compares vibrotactile to visual+auditory 40 Hz gamma entrainment. Vibration has no photosensitive pathway — the entire hazard class evaporates. <span class="pill">PMID 42426112 · EMERGING</span></div>

      <h3>The sort — tomfoolery vs measurable</h3>
      <table>
        <thead><tr><th>Idea</th><th>Verdict</th><th>The number</th></tr></thead>
        <tbody>
          <tr><td>App buttons that "dose you with light"</td><td><span class="tag KILL">TOMFOOLERY</span></td><td>A bright phone emits ~1 mW/cm² broadband; red subpixel ~0.3 mW/cm² at 620–630nm, zero at 850nm. You need 5–50 mW/cm² at 660. Reaching 3 J/cm² would take ~2.8 hours face-on-glass at the wrong colour.</td></tr>
          <tr><td>Buttons/audio flickering at 40 Hz</td><td><span class="tag EMERGING">MEASURABLE</span></td><td>GENUS (MIT): Phase 1/2A, 1 hr/day × 3 months by LED panel + speaker. Phase II showed significant slowing of brain atrophy. Entrainment, not therapy — different mechanism, real evidence.</td></tr>
          <tr><td>"Frequency" woven into rayon/cotton/linen/bamboo</td><td><span class="tag KILL">TOMFOOLERY</span></td><td>A passive fiber has a chemistry, a weave, a transmittance. It does not have a Hz.</td></tr>
          <tr><td>A shirt that emits therapeutic light</td><td><span class="tag EMERGING">REAL. BUILT.</span></td><td>Woven POF, ~100 cm², both ends coupled to a 5W 635nm diode: 18 ± 2.5 mW/cm², IR-verified — inside the band. EU FP7 PHOSISTOS built 500 cm² diffusers, 55 patients. Your conformality argument, already won by someone else.</td></tr>
          <tr><td>Bamboo mesh / which fabric</td><td><span class="tag GO">MEASURABLE TODAY, FREE</span></td><td>Each transmits differently at 660 vs 850nm — a number. Put the fabric between emitter and PM16 and read it. Answers "which fabric" in an afternoon, zero new hardware.</td></tr>
        </tbody>
      </table>

      <div class="callout"><strong>The patent confirms your Dose Bench, from a different universe.</strong> Corneal cross-linking: riboflavin at 3 vs 30 mW/cm² CW, same 5.4 J/cm², dissimilar stiffness — and it names the mechanism. Oxygen depletes in 10–15s at 3 mW/cm² but 3–5s at 30 mW/cm²; the dark phase lets it return. A rate-limited consumable. PBM's consumable differs (CcO, not O₂) but the skeleton is identical. Two domains, one shape.</div>
      <div class="callout kill"><strong>Your B12 circle — followed to its end, the answer is no.</strong> CXL works because you bring the chemistry (riboflavin is exogenous, O₂ is a consumed reagent). PBM brings nothing: the chromophore is cytochrome c oxidase, already in the cell, not dose-able; its O₂ is the terminal electron acceptor, not a reagent being burned. And the cliff: add an exogenous photosensitizer to make the move work and you are no longer doing PBM — you are doing PDT, a drug-device combination product. Your instinct doesn't tune the project; it relocates it into a different regulatory universe. That is a different company. <em>But the ceiling may still be rate-limited by something nobody has named — six of nine pulsed-vs-CW comparisons favour pulsing. It is not oxygen. Nobody knows what it is.</em></div>
    `,
  },

  {
    id: "watchtower",
    label: "Watchtower",
    html: `
      <h2>The Watchtower</h2>
      <div class="callout kill"><strong>CUT-06 · "breakthroughs every day."</strong> A system told to find a daily breakthrough will find one every day — because you told it they exist. This job reports DELTA, not breakthrough. Most days: zero. If it cannot return an empty day, it is not a monitor — it is a rumor mill. Same family as "vastly superior paradigm" and "100% retention": language that pre-commits the conclusion.</div>
      <p><strong>"Real-time" is the wrong target.</strong> A static file on Pages has no server — it cannot query PubMed on load. The thing you want is better: a daily cron harvests, diffs, snapshots, redeploys. The page renders the freshest snapshot and tells you when it is stale. Papers aren't indexed by the second; daily is the real cadence of the underlying reality.</p>

      <h3>What the first live run actually found</h3>
      <table>
        <thead><tr><th>Finding</th><th>What it means</th></tr></thead>
        <tbody>
          <tr><td>NCT07707284 — "Frequency-Dependent Effects of Transcranial PBM on Cortical Excitability", updated 2026-07-16</td><td>A live registered trial on exactly your question, updated the day before the run. The pipeline earned its keep in one execution.</td></tr>
          <tr><td>BUG 1 — ctgov query returned centenarian cohorts and breast-cancer phenotyping</td><td>Fuzzy matching. Fixed to AREA[InterventionName]: six-for-six real PBM trials.</td></tr>
          <tr><td>BUG 2 — a row dated 2121-10-01</td><td>A century in the future. Typo in the source; caught by the future_dated flag. PubMed's sortpubdate future-dates ahead-of-print routinely.</td></tr>
          <tr><td>BUG 3 — the standards shard returned "a bivariate gamma degradation model"</td><td>Crossref does not index IEC standards. Standards are not an API shard — they change on a decade scale and belong in a quarterly human check.</td></tr>
          <tr><td>textile_light returned 0 rows</td><td>An honest null on the first run. The system reported nothing and did not pad — the design requirement, demonstrated rather than promised.</td></tr>
        </tbody>
      </table>

      <h3>Cadence — set by observed rate of change, not enthusiasm</h3>
      <table>
        <thead><tr><th>Shard</th><th>Every</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td><strong>adverse</strong> (runs first)</td><td>1d</td><td>Harm is mandatory-reportable; nulls are not. If someone got hurt, you want it tomorrow.</td></tr>
          <tr><td>flicker_harm</td><td>1d</td><td>Seizure/vertigo thresholds — the live hazard for anything pulsed.</td></tr>
          <tr><td>dosimetry · human_trials</td><td>1d</td><td>The two things that can change a spec overnight.</td></tr>
          <tr><td>textile_light · gamma_40hz · mechanism</td><td>3d</td><td>Active, not daily-active. Polling faster buys noise.</td></tr>
          <tr><td>biomarkers · regulatory · bnat</td><td>7d</td><td>Regulatory weekly for cause: FDA revised General Wellness 2026-01-06.</td></tr>
          <tr><td>standards</td><td>90d</td><td>ICNIRP 2013 is thirteen years old. Daily polling would be theatre.</td></tr>
        </tbody>
      </table>
      <div class="callout"><strong>Snapshots — immutable, hashed, provable.</strong> <code>data/snapshots/YYYY-MM-DD.json</code>, one per day, content-hashed, never rewritten. A quiet day still commits — proving you looked and found nothing is the entire point of a monitor. A gap in the series means the job broke, not that the field was silent.</div>
      <p class="note">The tower is dark most nights. That is the report. Silence, written down.</p>
    `,
  },

  {
    id: "kill-ledger",
    label: "Kill Ledger",
    html: `
      <h2>The Kill Ledger</h2>
      <p class="lede">What was refused, and why. Prosecution-first cuts both ways — it applies to the brief.</p>
      <h3>Domain kills</h3>
      <table><tbody>
        <tr><td><span class="tag KILL">KILL-01</span></td><td><strong>The 15 Hz rayon shirt</strong> — no mechanism. A textile has no frequency. Hz describes a periodic drive; a passive fiber has a chemistry, a weave, a reflectance. There is no measurement that returns "15 Hz" from a shirt.</td></tr>
        <tr><td><span class="tag KILL">KILL-02</span></td><td><strong>The pre-order overlay</strong> — no mechanism. No print/coating/graphic on a t-shirt produces a biological effect. Ink is ink; nothing in a body reads a printed pattern on cloth.</td></tr>
        <tr><td><span class="tag KILL">KILL-03</span></td><td><strong>"Restart blocked genes that scream high frequencies"</strong> — not a mechanism. Genes have no frequencies. The adjacent real thing is optogenetics — light drives gene expression only in cells engineered with a light-sensitive protein. The switch must be installed first.</td></tr>
        <tr><td><span class="tag KILL">KILL-04</span></td><td><strong>Curing aging · 80% catalyst</strong> — killed twice. Mine: no evidence. Yours, via Gate Ø: no endpoint exists. Encoding a success target into a prompt makes agents manufacture it — that is how a swarm produces 300 fabricated citations.</td></tr>
        <tr><td><span class="tag KILL">KILL-05</span></td><td><strong>"No guardrails"</strong> — self-contradicting; the next sentence asked for a guardrails reviewer. Built the second: Dragnet-Optic, deterministic Rust, terminal veto. On a system driving high-current NIR near skin and eyes, "no guardrails" is not a velocity setting.</td></tr>
        <tr><td><span class="tag KILL">KILL-06</span></td><td><strong>300 fabricated URLs</strong> — your own standing rule. Verified rows are in the ledger; the harvest fills the rest from live APIs with hashes and timestamps. A padded list would have felt like delivery and been sabotage.</td></tr>
      </tbody></table>
      <h3>Prompt cuts — ranked by damage</h3>
      <table><tbody>
        <tr><td><span class="tag KILL">CUT-01</span></td><td><strong>"in favor of a vastly superior paradigm"</strong> — worst line in the prompt. It tells the model a superior paradigm exists before it looks, so the model manufactures one. Your old prompt was structurally incapable of returning "your idea is already the best available answer." The corrected one can.</td></tr>
        <tr><td><span class="tag KILL">CUT-02</span></td><td><strong>The bracket citations [2] [3, 6] [12]</strong> — a fabrication vector. They show the model citation-shaped tokens with no sources and ask for more. Training-by-example for the exact failure you never want. Replaced with evidence tags that resolve to a real URL or are a defect.</td></tr>
        <tr><td><span class="tag KILL">CUT-03</span></td><td><strong>"Why this prompt works so well"</strong> — sales copy inside the prompt. The model reads it as content to satisfy and performs framework-ness rather than doing the work.</td></tr>
        <tr><td><span class="tag KILL">CUT-04</span></td><td><strong>"Ruthlessly eliminate any concepts that fail"</strong> — theatre. Adverbs are not thresholds. Replaced with: kill on any single failure, and name which of the five.</td></tr>
        <tr><td><span class="tag KILL">CUT-05</span></td><td><strong>The orphaned tail</strong> — truncation. Stops mid-clause; the promised prompt never arrives. A model hunts for the missing block and invents it.</td></tr>
      </tbody></table>
      <p class="note"><strong>KEPT, SHARPENED:</strong> MEErP, TRIZ, DOE 5-point, LCA, BNAT — the bones were good. "Do not accept my idea at face value" and "discard my idea entirely" — kept verbatim; permission to kill is the whole point. The correction is not that you asked for too much. It is that the prompt could not tell you no — and a screen that cannot return a negative is not a screen, it is a mirror.</p>
    `,
  },

  {
    id: "thought-process",
    label: "Thought Process",
    html: `
      <h2>Thought Process</h2>
      <p class="lede">The decision record — what was chosen, refused, gotten wrong, and still unsure. Written so a future agent, or you at 2am, can audit the reasoning rather than inherit the conclusions.</p>
      <h3>The first decision — split the brief</h3>
      <p>The opening request contained two populations of claim, tangled. Split before building, not after. An agent fleet is an amplifier — it executes the premise at scale. Had "find the 80% catalyst" been encoded as an objective, the fleet would have found one: 300 plausible citations and a confident protocol for a mechanism that isn't there. Fabrication at scale looks exactly like research. A disclaimer at the top of a system prompt does not survive contact with a sub-agent; only a refusal set inside the prompt, and a deterministic veto outside it, actually holds.</p>
      <div class="callout"><strong>My own error, in the open.</strong> I said 60 sources in prose; the script counted 54, and the file was corrected. I estimated, the instrument disagreed, the instrument won — the whole Gate Ø argument in miniature, committed one message before proposing the rule. Left in the record rather than quietly fixed.</div>
      <h3>Why the Bench is the hero element</h3>
      <p>The template answer is a big number and a gradient. The biphasic curve was chosen because it is the single fact that kills the most naive builds, before they cost money. The curve is schematic — pedagogically honest, predictively worthless. A fitted curve over a substrate where 46% of 44 TMD studies are at high risk of bias would be a lie with error bars.</p>
      <h3>What I am still unsure of</h3>
      <table>
        <thead><tr><th>#</th><th>Open question</th><th>What would close it</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>The open-source gap. Probably real. Possibly my query formulation.</td><td>Prospector re-runs the shard with different phrasing.</td></tr>
          <tr><td>2</td><td>The 50 mW/cm² floor — the number is from a vendor that sells competing panels.</td><td>Resolve to a primary or drop it. Currently SPECULATIVE.</td></tr>
          <tr><td>3</td><td>Whether a harness is the right form factor at all.</td><td>The sharpening question. If you only want a flat surface irradiated, buy a panel.</td></tr>
          <tr><td>4</td><td>The knee OA paper contradicts itself. Flagged, not sided with.</td><td>Someone reads the full text before it enters a spec.</td></tr>
          <tr><td>5</td><td>Regulatory drift. FDA revised General Wellness after cutoff; there may be more I did not think to search for.</td><td>Run the shard on a schedule, not once.</td></tr>
        </tbody>
      </table>
      <div class="blank-box"><strong>BLANK</strong> — what I could not answer: whether the open-source gap is real or my search failing; whether the 50 mW/cm² floor survives a primary; what the knee OA paper actually found.<br><br><strong>Sharpening question</strong> → Conformal joint/limb harness, or torso array? It forks emitter count, thermal budget, whether Photometer needs MCX at all, and whether the DIY case survives contact with a $200 panel.</div>
    `,
  },
];
