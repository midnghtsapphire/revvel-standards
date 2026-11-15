"""Optional local LLMLingua-2 adapter; no cloud inference (#18335).

The model is loaded only on explicit opt-in. Install llmlingua and provision
its model locally before enabling this in a worker; otherwise normal prompts
remain uncompressed. See microsoft/LLMLingua's LLMLingua-2 evaluation example.
"""
from __future__ import annotations
from functools import lru_cache

CRITICAL_TERMS = ("UPREV", "WR", "MCP")


@lru_cache(maxsize=1)
def local_compressor():
    from llmlingua import PromptCompressor
    return PromptCompressor(
        model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
        use_llmlingua2=True, device_map="cpu",
        model_config={"local_files_only": True, "trust_remote_code": False},
    )


def compress_context(text: str, rate: float = 0.3, compressor=None) -> dict:
    """Compress reference context, verifying critical terms before accepting it.

    The caller keeps instructions and the actual task outside this function.
    Failed term preservation returns the original context, with an explicit
    reason. Counts come from the compressor's tokenizer accounting rather than
    character guesses; they are not necessarily the downstream model's tokens.
    """
    if not 0 < rate <= 1:
        raise ValueError("Compression rate must be in (0, 1]")
    if not text.strip():
        return {"content": text, "compressed": False, "reason": "empty-reference-context",
                "origin_tokens": 0, "compressed_tokens": 0}
    engine = compressor if compressor is not None else local_compressor()
    result = engine.compress_prompt(text, rate=rate, force_tokens=list(CRITICAL_TERMS))
    compressed = result["compressed_prompt"]
    if not isinstance(compressed, str):
        raise ValueError("Compressor returned non-text output")
    missing = [term for term in CRITICAL_TERMS if term in text and term not in compressed]
    if missing:
        return {"content": text, "compressed": False, "reason": "critical-term-loss",
                "missing_terms": missing}
    return {"content": compressed, "compressed": True,
            "origin_tokens": result.get("origin_tokens"),
            "compressed_tokens": result.get("compressed_tokens")}
