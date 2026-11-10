# Learnings — distribution diligence

Append-only. One finding per entry, with the date it was verified and what it
changes.

---

## 2026-11-04 — ERN 3.8.2 is withdrawn, and that flipped a rubric question

**Finding.** DDEX announced in Feb 2023 that older standards would sunset.
Support for all ERN 3.x versions and ERN 4.0 ended **1 March 2025**, and those
standards were **removed from DDEX websites on 1 March 2026**. Separately,
`ContainsAI` — the AI-disclosure field — was added in **ERN 4.3.1** and carries
into 4.3.2. ERN 3.x has no equivalent.

**What it changes.** The WR for this work told us to ask vendors which ERN
versions they speak, "4.3 and 3.8.2 per DSP." That was right in 2024. In late
2026 a vendor who answers "yes, 3.8.2" is telling you they run an unsupported,
withdrawn standard that is structurally incapable of AI disclosure. The
question is still worth asking; the scoring inverted.

**Pattern worth carrying.** A diligence question written against a moving
standard decays into a question that rewards the wrong answer. Date every
rubric question and re-verify the correct answer before the call, not the
question text.

## 2026-11-04 — an omitted AI disclosure is not a declaration of none

**Finding.** YouTube: leaving `contains_ai` empty gives an unknown status, and
an omitted value is unknown unless other signals let it decide otherwise.
Deezer has run its own AI detection since early 2025 and tags what it finds
regardless of what the supplier declared. Spotify's AI credits (beta
2026-04-16) are optional and Spotify says absence of a credit does not mean AI
was not used.

**What it changes.** Silence is not the safe option; it forfeits the accurate
answer and invites a machine estimate. So `contains_ai` in
`schemas/release-metadata.schema.json` is required with **no default**, in
every element block. There is no safe default to pick: `None` is a false
negative on our catalog, `All` throws away Deezer placement on releases with
real human performance, and `unknown` is a reset mechanism rather than a state.

**Pattern worth carrying.** When absence of a value is interpreted downstream,
a default is a lie with good intentions. Require the field.

## 2026-11-04 — Deezer's search toggle makes All-vs-Partly a revenue decision

**Finding.** On 2026-10-13 Deezer announced a toggle that removes **fully**
AI-generated content from search, due globally before the end of 2026. Partly
is not covered.

**What it changes.** The gap between declaring `All` and declaring `Partly` is
now the gap between being findable on Deezer and not. That is a direct
incentive to inflate `Partly`, so the rule was written before any money was at
stake: `Partly` requires a specific nameable human contribution to that
element, recorded in words; "I prompted it" does not count; absent one, the
value is `All`. The schema rejects `Partly` with no `human_contribution` and
rejects `All` that claims one.

## 2026-11-04 — Apple is a second format, not a DDEX consumer

**Finding.** Apple Music uses its own `ai_transparencies` block (spec 5.3.27),
not a DDEX element. Listed optional; a reported Aug 2026 memo (via Music
Business Worldwide) says tags become required where AI created a material
portion. Apple relies on the supplier's declaration rather than its own
detection.

**What it changes.** "We support the DDEX AI standard" is half an answer from a
vendor. `WHITE_LABEL_DILIGENCE.md` question 2 asks about 5.3.27 by name.

## 2026-11-04 — the DDEX element names here are from secondary sources

**Finding.** The DDEX data dictionary is membership-gated. `ContainsAI`,
`AiContribution`, `GenerativeAI` and the `None`/`Partly`/`All` value set come
from Metadata Style Guidelines and Interspace Music, not from the spec.

**What it changes.** Good enough to design a schema against, not good enough to
emit XML against. Both `DDEX_AI_DISCLOSURE.md` and this entry say so, so that
nobody writes a delivery pipeline on this grounding without confirming first.

**Pattern worth carrying.** Record the provenance grade of a fact next to the
fact, not just the fact. The cost of being wrong is different at the schema
layer and the wire layer.

## 2026-11-04 — a squash-merge silently dropped six of seven commits

**Finding.** PR #17913 merged carrying only its first commit. `artifacts.py`,
`mastering.py`, 56 tests, the name matrix, and two decision records were on the
branch, reviewed, and absent from main for weeks. Nothing failed; the PR said
merged and the branch said merged.

**What it changes.** Recovered in this PR. The general lesson is a
VERIFY_THE_POSTCONDITION case (RVS-VERIFY-001): "PR merged" is a marker, and
nothing was checking that the files the PR added exist on main afterwards.
Worth a guard — a post-merge check that every path added by a merged PR resolves
on the default branch — but that is its own PR, not this one.

## 2026-11-04 — this repo's CI automation commits over an open worktree

**Finding.** While this work was in progress, an automation committed
`chore(ci): probe-only coder build (throwaway)` on top of the checked-out
branch, sweeping staged files into it and gutting
`.github/workflows/openrouter-coder.yml` by 133 lines. It also left the
worktree on `main` at one point, discarding staged changes.

**What it changes.** Commit early and often when working in this checkout;
do not leave work staged. Verify the commit's file list before pushing — the
recovery commit here had to explicitly restore `openrouter-coder.yml` from main
to avoid shipping the probe's deletion.
