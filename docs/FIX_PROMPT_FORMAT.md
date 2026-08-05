# Fix Prompt Format (canonical)

This is the exact shape every fix prompt in the Revvel pipeline should land
in — whether it comes from Octopus, Devin, Copilot review, an Antigravity
finding, a CI failure, or a human note. The Coder/Fixer persona is trained
to consume this shape; anything off-format degrades to guess-and-edit.

## Why this exact shape

A fix prompt is actionable iff a coder can apply it without re-reading the
whole file. The shape below carries every piece of context needed:

- **The file path** — coder opens exactly one file
- **The line range** — coder edits exactly that span
- **The severity + category tag** — sets the bar (lint vs blocker vs security)
- **The problem statement** — what's wrong, in past-tense diagnosis style
- **Two acceptance options** — apply the real fix OR explicitly mark it
  as tracked, never silent

The "two acceptance options" pattern closes the highest-frequency failure
mode in this repo: WRs that document a fix without applying it (see
`scripts/fix-wr-gate.mjs`). Either you do the thing, or you label it
explicitly tracking-only — never something in between.

## Template

```text
Fix the following <Severity> (<Category>) issue in `<path>` at lines <start>-<end>:

Problem: <one-paragraph diagnosis. State what the file currently does, why
that's wrong against a named standard or contract, and what the surprise
will be at review/runtime if shipped as-is. Cite the standard if applicable
(e.g. "Per the Research Mandate quoted in this same file...").>

<Acceptance — one paragraph stating exactly two options:>
Either <apply the real fix — describe the minimal correct edit>,
or mark the WR explicitly as `<status-emoji + label>` so reviewers know
not to treat it as <whatever the false-completion signal would be>.
```

## Canonical example

```text
Fix the following Medium (Style) issue in
`wr/issues/issue-14024-add-source-citations-for-seo-keyword-volume-and-cpc.md`
at lines 161-175:

Problem: This WR was opened specifically to enforce that SEO keyword volumes
and CPC figures be cited with sources. However, the file itself is a raw
template dump: every table cell, BOM entry, keyword row, and recommendation
is a literal `[placeholder]`. None of the REQUIRED sections (SEO & Keyword
Research, BOM, Community Chatter, Domain Strategy, Marketing Best Practices)
are populated. Per the Research Mandate quoted in this same file (≥90%
citation coverage, zero unsupported factual claims), this WR would fail its
own Review Fleet gate.

Either fill in the research before merge, or mark the WR explicitly as
`🟡 In Progress — template scaffold only` so reviewers know not to treat it
as completed research.
```

## What this format catches

The example above is the textbook case of every fix-WR gate violation in
one prompt:

| Signal | What it tells the coder |
| --- | --- |
| `Medium (Style)` | Don't escalate; don't add scope |
| File path + line range | Touch one file, one span — no refactor |
| "raw template dump" + "every table cell ... `[placeholder]`" | Concrete evidence, not opinion |
| "Per the Research Mandate quoted in this same file" | The standard being violated, cited inline |
| "Either ... or mark the WR explicitly as `🟡 In Progress`" | Two acceptance options, no silent passes |

## Where this format is enforced

- **Coder persona** (`scripts/openrouter-personas.js` → `coder.instructions`)
  is instructed to honor this exact shape; if the inbound issue body doesn't
  carry it, Coder reformats the diagnosis into this shape before acting.
- **Fix-WR gate** (`scripts/fix-wr-gate.mjs`) catches PRs that "document the
  fix" without applying it — the second acceptance option in this format
  exists precisely to keep that gate from false-positiving on intentional
  tracking-only WRs.
- **Routing personas** that emit fix prompts (Octopus relay, Devin relay)
  should produce this shape directly; any prompt that doesn't is a regression.
