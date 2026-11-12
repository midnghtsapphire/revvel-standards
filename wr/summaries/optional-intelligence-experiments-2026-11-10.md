# Optional intelligence experiments — retained work and verification

The canonical product command runner is the existing METAL/HULL runtime in
`midnghtsapphire/oaudrey`, extended through its `SkillRouter` in PR #13. The
modules below were started before the owner's correction to inspect and reuse
that system. They are retained as optional experiments. No production workflow,
scheduler, or HULL path imports the LangGraph or GEPA modules. Nothing here
replaces HULL, starts an agent, or deploys a product automatically.

## Context graph — #18336

`scripts/context_graph.py` uses only Python's standard library. It indexes root
Markdown plus `standards/**/*.md`, builds undirected edges from local Markdown
links, ranks lexical query overlap with a one-hop reference boost, and caches
the snapshot by content hash. It does not implement a semantic ontology or
claim to index every document throughout the repository.

`AGENTS.md`, `START_HERE_CALL_CHAIN.md`, `MASTER.md`, and `VISITING_AGENTS.md`
are always selected whole. Insufficient character budget raises an error rather
than truncating them. Counts are characters, not measured provider tokens.

The legacy coder's `build_prompt` uses this only when
`REVVEL_CONTEXT_GRAPH=1`. No checked-in workflow sets that variable. An optional
`REVVEL_CONTEXT_MAX_CHARS` controls the default 60000-character budget. Failure
is explicit; default coder behavior and its existing local-first spend gate
are unchanged. This selector is not permission to avoid reading owner-required
repository guidance before working.

## LLMLingua-2 adapter — #18335

`scripts/prompt_compression.py` lazily imports the optional `llmlingua` package.
It uses `PromptCompressor(use_llmlingua2=True)`, the Microsoft MeetingBank model
on CPU, `local_files_only=True`, and `trust_remote_code=False`. Provision the
model, tokenizer, and tiktoken vocabulary cache explicitly before offline use.
There is no implicit model download or provider inference in this adapter.
Missing dependencies/model cache cause a visible error when opted in.

The legacy coder additionally requires `REVVEL_PROMPT_COMPRESSION=1` inside the
context-graph opt-in. Only optional reference documents are compressed; the four
mandatory governance documents, task, and system instructions stay outside
compression. `REVVEL_COMPRESSION_RATE` defaults to 0.3. Empty references return
without loading a model. Literal `UPREV`, `WR`, and `MCP` preservation is checked;
term loss falls back to the original references. This is not semantic-fidelity
validation. Reported token counts are the compressor's accounting, which can
differ from the downstream model tokenizer.

The real package/model is not installed or benchmarked on this host. Tests use
an injected compressor to validate adapter behavior. No 2–5x token reduction,
equal accuracy, or production agent performance claim is established.

## LangGraph lifecycle experiment — #18337

`scripts/wr_langgraph.py` is an import-only experiment with caller-supplied
actions. It is not connected to intake, GitHub workflows, GIT-FLEET, or HULL.
Do not turn it into a parallel production execution engine. HULL remains the
command execution extension point.

Install `langgraph==1.2.20` and `langgraph-checkpoint-sqlite==3.1.3` in an
isolated Python environment to reproduce its tests. The exercised graph uses
SQLite checkpoints, bounded test/heal/build loops, a deployment interrupt, and
explicit boolean approval on resume. Thread identity is supplied through
`configurable.thread_id`. Actions must be idempotent because process restart
can replay work around a checkpoint. SQLite is a local experiment store, not
a demonstrated multi-worker production deployment.

Real dependency tests verified a failed first test followed by healing, process
closure/reopening of the checkpoint database, approval/resume, and a bounded
retry stop. No existing WR workflows were migrated; a less-than-5-percent
production failure rate has not been measured.

## DSPy GEPA experiment — #18338

`scripts/optimize_agent_prompts.py` imports optional `dspy` only after validating
the endpoint, output path, and dataset. It invokes the documented `dspy.GEPA`
API with a local student/reflection LM and separate train/validation/test sets.
Endpoint host must be loopback with HTTP. The operator's local inference server
must itself be configured for local inference; this is not a network sandbox
that can prevent a separately configured proxy from forwarding requests.

Each dataset split contains rows with a `request` string and a nonempty
`required_terms` list. Duplicate requests across all splits are rejected to
avoid leakage. Metric feedback measures required-term coverage, not code
correctness or the full agent scorecard. Candidate and evaluation output paths
must be new; existing results are preserved. No candidate is promoted into the
live agent prompts automatically.

```text
python scripts/optimize_agent_prompts.py --help
```

The help output describes the explicit dataset, prompt, loaded-model, endpoint,
and fresh output-file arguments. The real DSPy package/GEPA run was not installed
or exercised on this host, and no optimized prompts or before/after quality
benchmark exist. Use a separately provisioned compatible DSPy environment and
review the dataset before an explicit experiment. No improvement is claimed.

## Reproduce the checked behavior

```text
node scripts/run-python.js -m unittest discover -s tests -p '*_test.py'
node --test tests/openrouter-coder-layer0.test.js
```

Ten Python tests passed, including real installed LangGraph/SQLite restart
tests; compressor tests use injection and GEPA tests cover validation/metric
only. The two existing local-first coder tests pass. Python 3.14 emitted an
upstream Pydantic-v1 compatibility warning during LangGraph imports; use a
supported isolated Python version for further model/framework evaluation.

Outstanding acceptance for #18335–#18338 includes real compression/optimization
runs, historical train/validation/test datasets, task-quality and token
benchmarks, rollback/promotion decisions, and an explicitly approved integration
with the canonical HULL runner. #18339–#18341 healing, standard A2A, and PoT
MCTS/GRPO research acceptance remain unimplemented by these experiments.

Primary API references reviewed:

- [Microsoft LLMLingua compressor implementation](https://github.com/microsoft/LLMLingua/blob/main/llmlingua/prompt_compressor.py)
- [LLMLingua-2 evaluation integration](https://github.com/microsoft/LLMLingua/blob/main/experiments/llmlingua2/evaluation/compress.py)
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [DSPy GEPA optimization](https://dspy.ai/learn/optimization/optimizers/)

## 2026-11-11 — LLMLingua-2 measurement, WR #18335

PromptOrchestrator ran the local MeetingBank bert-base checkpoint on the
indexed governance set. Counts are in
`wr/measurements/llmlingua2-governance-2026-11-11.json`. Full index: 299,593
tokens to 89,978 (3.33x), 0 term-loss rejections. The same-task accuracy
judge is still pending owner-approved spend. The paragraphs above this
heading are the 2026-11-10 record and stay as written.
