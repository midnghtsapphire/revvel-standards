# Graph prompting context selection (WR 18336)

Deterministic context graph over the standards documents, plus a query
router that returns one subgraph. No model call is made by `build`,
`measure`, or `route`.

The generator is `scripts/context_graph.py`. It extends the 2026-11-10
selector in that same file. It does not import `scripts/prompt_compression.py`
(WR 18335). The two compose at the text boundary described below.

## What a node is

- Every `*.md` file at the repository root
- Every `*.md`, `*.yml`, and `*.yaml` file under `standards/`
- `.github/ISSUE_TEMPLATE/work_request.yml`

Symlinks and paths that leave the repository are skipped. Document text is
not copied into the artifact. The artifact stores ids, byte sizes, roles,
and edges.

## How an edge is chosen

References are markdown links plus path tokens such as `` `standards/FOO.md` ``.
External URLs are ignored. Each resolved reference becomes one or two edges:

| Type | Meaning |
| --- | --- |
| `referenced_by` | `from` is the document that was named. `to` is the document that named it. |
| `governs` | `from` is a file under `standards/` or one of `AGENTS.md`, `START_HERE_CALL_CHAIN.md`, `MASTER.md`, `VISITING_AGENTS.md`, `CLAUDE.md`, `UPREV_METHOD.md`. `to` is the document it governs. |
| `populates` | `from` is a `.yml`, `.yaml`, or `.json` file that a document points at. `to` is that document. |

A data file that merely cites a governance document does not populate it.
The governance document governs the data file instead.

## Routing

`route_query` always keeps `AGENTS.md`, `START_HERE_CALL_CHAIN.md`,
`MASTER.md`, and `VISITING_AGENTS.md` whole. It then adds the top in-scope
lexical matches and one hop of their standards neighbors, inside a 180000
character budget. The result is cached in process under the corpus
fingerprint. Editing any indexed file changes the fingerprint and the next
call rebuilds the selection.

`reference_text` is the selected text with those four mandatory documents
removed.

## Composition with LLMLingua-2

WR 18335 compresses optional reference text in
`scripts/prompt_compression.py`. Pass `route_query(...)["reference_text"]`
to `compress_context`. Do not pass the mandatory documents.
`.github/scripts/openrouter_coder.py` already does that when both
`REVVEL_CONTEXT_GRAPH=1` and `REVVEL_PROMPT_COMPRESSION=1`. This work does
not edit that caller. The caller still passes `REVVEL_CONTEXT_MAX_CHARS`
with a default of 60000. That budget is about the size of the four
mandatory documents alone, so the opt-in coder path can still drop the
standard the query needs. The library default and the measurement use
180000.

## Measured token reduction

Tokenizer: `revvel-local-4byte` in `scripts/context_graph.py`. It is local,
deterministic, and not a provider tokenizer. The baseline is every node in
the graph, rendered with the same header as the subgraph. Ten fixed queries
live in `sample-queries.json`.

Committed result in `token-measurements.json`:

- Full context: 419920 tokens, 143 documents
- Mean reduction: 86.35 percent
- Minimum reduction: 84.94 percent
- Every sample query included its expected document
- The 60 percent bar is met on this tokenizer and this query set

Regenerate after the standards change, review the diff, and commit it.
A drift against the committed file fails the check.

## Accuracy harness

The 25 percent accuracy claim needs model answers on the full context and
on the subgraph. That run was not executed. The record is
`accuracy-benchmark.json` with status `pending-owner-approved-spend`.

The manual command refuses unless `REVVEL_GRAPH_ACCURACY_APPROVED=1`.
When it runs, every completion uses `allow_cloud=False`, so this file
cannot open the paid lane. If no local model is running, the call fails
and no provider is billed.

## Manual commands

Run these from the repository root:

```bash
npm run graph-prompting:test
npm run graph-prompting:check
node scripts/run-python.js scripts/context_graph.py route --query "LEDGER handoff actor"
```

`graph-prompting:check` rebuilds the graph and the token numbers in memory
and exits non-zero if they differ from the committed JSON. CircleCI runs
the same two npm scripts from `.circleci/scripts/graph-prompting.sh`.
