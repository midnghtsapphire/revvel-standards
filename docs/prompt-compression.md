# LLMLingua-2 governance compression (WR #18335)

Local prompt compression for agent governance context. The model is
Microsoft's MIT-licensed LLMLingua-2 MeetingBank checkpoint. Compression does
not call a paid LLM. A missing model is an error: `compress` does not download
by itself.

The coder path is unchanged in shape. `.github/scripts/openrouter_coder.py`
compresses optional reference documents only when both
`REVVEL_CONTEXT_GRAPH=1` and `REVVEL_PROMPT_COMPRESSION=1` are set. Mandatory
files (`AGENTS.md`, `START_HERE_CALL_CHAIN.md`, `MASTER.md`,
`VISITING_AGENTS.md`) stay whole. The default keep-rate is `0.3`.
`REVVEL_COMPRESSION_RATE` overrides it. `REVVEL_FORCE_TOKENS` adds names on
top of `UPREV`, `WR`, and `MCP`. `REVVEL_LLMLINGUA_MODEL` selects the
checkpoint. The default is
`microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank`. The 2026-11-10
large checkpoint remains selectable:
`microsoft/llmlingua-2-xlm-roberta-large-meetingbank`.

## Install

Pins are in `scripts/requirements-llmlingua.txt`. Torch is the CPU wheel and
is not on the default PyPI index, so it is installed first.

```bash
python3 -m venv .venv-llmlingua
.venv-llmlingua/bin/python -m pip install --upgrade pip
.venv-llmlingua/bin/python -m pip install torch==2.15.0+cpu \
  --index-url https://download.pytorch.org/whl/cpu
.venv-llmlingua/bin/python -m pip install -r scripts/requirements-llmlingua.txt
```

## Run

From the repository root, with that virtualenv's Python:

```bash
python3 scripts/prompt_compression.py provision
python3 scripts/prompt_compression.py measure --root .
python3 scripts/prompt_compression.py compress --file AGENTS.md
python3 scripts/prompt_compression_accuracy.py \
  --measurement wr/measurements/llmlingua2-governance-2026-11-11.json
python3 -m unittest discover -s tests -p prompt_compression_test.py -v
```

`measure` with no `--output` prints the summary and writes no file. `--output`
is refused when that path already exists, so the 2026-11-11 record stays.
A new run uses a new dated path. Exit 2 means at least one document dropped a
force token and was kept whole. Exit 0 means every document was accepted.

`measure` walks the same Markdown set as `scripts/context_graph.py`: root
`*.md` plus `standards/**/*.md`. The JSON records two guarded totals.
`reference_subset` is what the coder compresses. `full_governance` includes
the four mandatory files. Token counts are LLMLingua-2's tiktoken
gpt-3.5-turbo counts (`use_oai_tokenizer`). If a force token present in the
source is absent after compression, that file is sent uncompressed and its
full token count stays in the guarded total.

## Tests

CircleCI job `prompt-compression` runs the unittest module. It does not
download the model and it does not call a paid API. The job checks rate
forwarding, force-token configuration, reduction math on the real governance
paths (injected compressor), and the committed measurement file.

## Measured 2026-11-11

Local CPU run, no paid calls. Model
`microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank`, rate 0.3,
force tokens `UPREV`, `WR`, `MCP`. Token counts are the compressor's tiktoken
gpt-3.5-turbo counts. The indexed set is root Markdown plus `standards/**/*.md`
(141 files, 1,179,598 characters). That is the governance context this repo
actually indexes. It is larger than the 683K-character figure in the work
request.

| Set | Files | Origin tokens | Compressed tokens | Ratio | Term loss |
| --- | --- | --- | --- | --- | --- |
| Full governance index | 141 | 299,593 | 89,978 | 3.33x | 0 |
| Reference subset (coder path) | 137 | 285,009 | 85,707 | 3.33x | 0 |

Both ratios are inside the 2x–5x band. The kept fraction is 0.300. The four
mandatory files are inside the full index and outside the reference subset.
`scripts/prompt_compression_accuracy.py` reports term preservation 1.0 on
both sets. The same-task accuracy judge was not run.

## Accuracy

`--measurement` and `compress --file` must be relative paths inside `--root`
(the working directory by default). An absolute path or a `..` escape is refused.

`scripts/prompt_compression_accuracy.py` prints the token ratio and the
term-preservation rate. The same-task judge is
`pending-owner-approved-spend`. `--execute-paid-judge` exits 3 and does not
contact a provider.

## If it fails

1. `ModuleNotFoundError: llmlingua` — the virtualenv above is not the
   interpreter you ran.
2. A Hugging Face "offline" or "local files only" error — run `provision`
   once on a machine that can reach huggingface.co, then rerun `measure`.
3. Guarded ratio near 1.0 with `rejected_files` above zero — a force token
   was dropped. The original document was kept on purpose. Read
   `missing_terms` on those rows.
4. Do not set `REVVEL_LLM_ALLOW_CLOUD` to make this pass. This path has no
   paid call to unlock.
