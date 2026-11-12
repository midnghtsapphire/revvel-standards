# Prompt Compression Standard (LLMLingua-2)

Closes WR #18335.

## When to compress
- Prompt > 8k tokens AND contains research dumps / context packs / long few-shot.
- Never compress: the WR objective, Voice DNA block, or any `[DO NOT COMPRESS]` region.

## Method
LLMLingua-2 (extractive, token-level classification) at ratio 0.5–0.7.
Reference: `scripts/prompt_compressor.py`.

- If the `llmlingua` package + model are unavailable (offline runner), the script
  falls back to a heuristic compressor (drops low-information lines: boilerplate,
  repeated whitespace, comment-only lines) — shape-compatible, dependency-free.

## Validation
Every compression logs original/compressed token counts + ratio to
`artifacts/compression/log.jsonl`. Ratio < 0.3 or dropped `[DO NOT COMPRESS]`
region = hard fail, prompt goes through uncompressed.
