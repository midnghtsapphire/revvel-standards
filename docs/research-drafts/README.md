# Research Drafts — incubator

A staging area for **raw, in-progress research** compiled from many sources
(web digs, notebooks, LLM/Grok sessions, data exports, screenshots) **before**
it becomes a formal Work Request, product, or standard.

The point: stop research from living in a sandbox or a chat window where it
evaporates. Anything worth keeping lands here, in Git, with its sources noted —
so a future project can be built from real, traceable material instead of
"trust me, I had it somewhere."

## What goes here

- Compiled notes and findings on a topic you may build later.
- Exports and dumps: `.ipynb` notebooks, `.csv`, JSON, PDFs, screenshots.
- Links and citations for every claim (so nothing is a fabricated reference).
- Rough outlines, options, and "maybe" ideas that aren't ready for a WR yet.

## What does NOT go here

- Anything load-bearing. Drafts here are **not standards** and nothing in the
  fleet should depend on them.
- Secrets, tokens, or credentials of any kind.
- Final deliverables — once a draft is real, **promote it** (see lifecycle).

## Works with NotebookLM (the ≤300-source workflow)

This folder is built for the NotebookLM pattern: gather up to ~300 sources on a
topic, then generate a grounded output (blog, PDF, app) that uses **only** those
sources. The GitHub side of that workflow lives here:

- Log every source you feed NotebookLM in `sources.md` (one row each — it scales
  to 300). That gives the generation a traceable, versioned source list.
- Drop NotebookLM exports / generated drafts into `data/` and link them from
  `NOTEBOOK.md`.
- When an output is ready to ship, **promote** it (see lifecycle) so the
  finished blog/PDF/app lands in its real home, with this folder as its
  receipt of where the material came from.

## Structure — one folder per topic

```text
docs/research-drafts/
  README.md          ← you are here
  _TEMPLATE/         ← copy this to start a new topic
    README.md        ← what this topic is, the intended project, current status
    NOTEBOOK.md      ← the running, append-only research log / compilation
    sources.md       ← provenance: where each piece of data came from
    data/            ← raw files: .ipynb, .csv, exports, images
  vspr/              ← example seeded topic
```

Start a topic by copying the template:

```bash
cp -r docs/research-drafts/_TEMPLATE docs/research-drafts/<topic>
```

## Conventions

- **`NOTEBOOK.md` is append-only.** Add dated sections; don't rewrite history.
  Mirrors the repo's `learnings.md` discipline.
- **Cite everything in `sources.md`.** Every figure, quote, or claim gets a
  link or a file path. If a source is an LLM session, say so and note it's
  unverified until checked against a primary source.
- **Mark confidence.** Tag findings as `verified`, `plausible`, or
  `unverified` so a later reader knows what still needs checking.
- **No fabricated references.** A missing source is fine ("source: TODO"); an
  invented one is not.

## Lifecycle — draft → real

1. **Drop** research into a topic folder as you gather it.
2. **Compile** it in `NOTEBOOK.md`; keep `sources.md` in step.
3. **Decide.** When a topic is project-ready, open a Work Request
   (`WR_TEMPLATE_BASIC.md` → `wr/`) that links back to this folder.
4. **Promote** the durable parts to their real home — a `docs/*_STANDARD.md`,
   a product under `products/`, or a workflow — and leave a short note here
   pointing to where it went. The draft folder can then be trimmed.

## CI note

This folder is listed in `.markdownlintignore`, so raw research dumps won't be
gated by the changed-Markdown lint. The docs-freshness check does not pair
anything here (no workflow / agent / routing-label / standard is being added).
