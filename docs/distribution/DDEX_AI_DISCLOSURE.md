# DDEX AI disclosure — the build requirement

**Status: build requirement, not a policy page.** Any distributor we operate
has to carry these fields end-to-end. Any distributor that carries *our*
catalog has to accept them from us.

Verified 2026-11-04. Vendor and DSP positions move; re-check the dated rows
before acting on them.

---

## The one rule that changes system design

**An omitted disclosure does not read as "no AI." It reads as unknown, and the
platform then guesses with its own detector.**

YouTube states it plainly: leaving the field empty gives YouTube an unknown
status, and an omitted value is unknown unless other signals let it decide
otherwise. Deezer has run its own AI detection since early 2025 and tags what
it finds regardless of what the supplier declared.

So silence is not neutral. On an AI-generated catalog, silence is the worst of
the three states: it forfeits the accurate answer and invites a machine
estimate instead. That is why `schemas/release-metadata.schema.json` makes the
field **required with no default** — see "Why the schema has no default" below.

## The standard

DDEX carries AI disclosure in two places. `ContainsAI` was added in **ERN
4.3.1** and carries into **4.3.2**. **ERN 3.x has no equivalent field at all.**

| Element | Attaches to | Allowed values |
| --- | --- | --- |
| `ContainsAI` | Release, SoundRecording, Image, Text, Video | `None`, `Partly`, `All` |
| `AiContribution` | Contributor | per-contributor AI involvement |
| `GenerativeAI` | Contributor (special contributor role) | names the generative system as a credited contributor |

The allowed value set defines `None` as "no content was created using
generative AI."

Two consequences:

1. Disclosure is **per element, not per release.** AI artwork on a
   human-performed recording is a real and common combination, and the standard
   expects you to say so at the element that is actually affected.
2. **A vendor still on ERN 3.x cannot disclose AI.** Not "has not got round to
   it" — the field does not exist in the version they speak. That is a
   disqualifying answer, not a roadmap item.

## Where each DSP stands

| DSP | Mechanism | Mandatory? | Date |
| --- | --- | --- | --- |
| Spotify | DDEX AI-disclosure standard, surfaced as AI credits (lyrics, vocals, instrumental performance, production) | Optional in beta. Spotify says the credits are optional and the absence of one does not mean AI was not used | Beta launched 2026-04-16 |
| YouTube / YouTube Music | ERN 4.3.2 or later, CSV `contains_ai` (`all` / `partly` / `none`; `unknown` only to reset a wrong value), or the Studio "AI use" attribute for direct uploads | Not required, but absence hands the decision to YouTube's own signals | Player labels dated October 2026 |
| Apple Music | `ai_transparencies` block, spec 5.3.27 — **Apple's own format, not DDEX**. Values at album level (Artwork) and track level (Track, Composition, Music Video) | Listed optional. A reported August 2026 memo (via Music Business Worldwide) says tags become required where AI created a material portion. Apple relies on the supplier declaration rather than its own detection | Memo Aug 2026; listener-facing "Made With AI" label reported for later in 2026 |
| Deezer | None — Deezer detects and tags on its own. Listeners cannot switch the label off | N/A. A correct declaration does not prevent a tag, because tagging follows detection | Labelling from June 2025; on 2026-10-13 Deezer announced a toggle removing fully-AI content from search, due globally before end of 2026 |
| Amazon Music | Not established in the sources checked | Unknown | — |

Two things to take from that table:

- **Apple is a second format.** Carrying DDEX `ContainsAI` is not sufficient;
  Apple needs its own block. A vendor who answers "we support the DDEX AI
  standard" has answered half the question. Ask about 5.3.27 by name.
- **Deezer is not a disclosure problem, it is a detection problem.** You cannot
  comply your way out of a Deezer tag. You can only be accurate and accept it.

## `All` versus `Partly` is a revenue decision

Deezer's announced toggle removes **fully** AI-generated content from search.
Not partly. So the gap between `All` and `Partly` is the gap between being
findable on Deezer and not being findable on Deezer, before the end of 2026.

That creates exactly the wrong incentive, so the rule gets stated now, while
nothing is at stake:

- **`Partly` requires a specific, nameable human contribution to that
  element** — a human-written lyric, a human-performed vocal, a human mix
  decision — recorded in `human_contribution` on the element, in words, per
  release.
- **"I prompted it" is not a human contribution.** Prompt authorship is
  selection, not performance or authorship of the output.
- **If you cannot name the human contribution, the value is `All`.** Losing
  Deezer search placement is a commercial cost. Mis-declaring is fraud, and it
  is the kind of fraud that costs supply-chain status rather than a release —
  see `ENFORCEMENT_SEPARATION.md`.

The schema enforces the first bullet structurally: `Partly` without
`human_contribution` is rejected.

## Why the schema has no default

`contains_ai` is required and has no default value, in every element block.

A default would be a lie with good intentions. Defaulting to `None` ships a
false negative disclosure on an AI catalog. Defaulting to `All` throws away
Deezer placement on releases that genuinely have human performance. Defaulting
to `unknown` is not permitted by the allowed value set and, per YouTube, is
reserved for clearing a previously incorrect value — a correction mechanism,
not a state you declare into.

There is no safe default, so a required field with no default is the only shape
that forces the determination to be made per release by someone who knows the
answer. This is RVS-VERIFY-001 applied to metadata: a disclosure field that can
be satisfied by not thinking about it is decoration.

## What we have to build

| Capability | Where | State |
| --- | --- | --- |
| Per-element `contains_ai` captured at intake, required | `schemas/release-metadata.schema.json` | built |
| `human_contribution` required whenever `Partly` is claimed | same | built |
| Generative systems recorded as credited contributors | `ai_contributors[]`, `GenerativeAI` role | built |
| Rejection of a manifest with no disclosure block | `tests/release-metadata-schema.test.js` | built |
| Apple `ai_transparencies` 5.3.27 mapping | delivery layer | blocked on vendor choice |
| ERN 4.3.2 XML output | delivery layer | blocked on vendor choice |

The two blocked rows are blocked on the white-label decision, not on us. The
schema ships now anyway, because the determination it forces is one the owner
has to make on every release from today, with or without a pipeline.

## Sources

- DDEX knowledge base, "What's new" — sunset dates for ERN 3.x and 4.0:
  <https://kb.ddex.net/about-ddex-standards/whats-new/>
- Metadata Style Guidelines, AI Disclosure Kit — `ContainsAI`,
  `AiContribution`, `GenerativeAI`, allowed values, per-DSP status:
  <https://www.metadatastyleguidelines.com/ai-disclosure>
- Interspace Music — YouTube `contains_ai` values and the empty-field rule:
  <https://interspacemusic.com/blog/youtube-music-ai-disclosure-ddex-csv-unknown/>

The DDEX element names and allowed values above come from the two secondary
sources, not from the DDEX data dictionary itself, which is membership-gated.
**Confirm against the ERN 4.3.2 spec before writing a delivery pipeline against
them.** They are accurate enough to design a schema against and not accurate
enough to ship XML against.
