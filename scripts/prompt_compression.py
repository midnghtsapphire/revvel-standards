"""Optional local LLMLingua-2 adapter; no cloud inference (#18335).

The model is loaded only on explicit opt-in. Install llmlingua and provision
its model locally before enabling this in a worker; otherwise normal prompts
remain uncompressed. See microsoft/LLMLingua's LLMLingua-2 evaluation example.

Manual (no paid calls). Pins: scripts/requirements-llmlingua.txt.
Runbook: docs/prompt-compression.md.

    python3 scripts/prompt_compression.py provision
    python3 scripts/prompt_compression.py measure --root . --provision \\
        --output wr/measurements/llmlingua2-governance-2026-11-11.json
    python3 scripts/prompt_compression.py compress --file AGENTS.md --provision

What to check if it fails: llmlingua is importable, the Hugging Face cache
holds the model id this process selected, and local_files_only is still True
so a missing cache is an error rather than a silent download inside compress.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from functools import lru_cache
from pathlib import Path

CRITICAL_TERMS = ("UPREV", "WR", "MCP")
# 2026-11-10 pin, kept. Select it with REVVEL_LLMLINGUA_MODEL or --model.
# PromptOrchestrator 2026-11-11, WR #18335: it stays available. The default
# below is the smaller official MeetingBank checkpoint, which is the one
# measured on a 16GB CPU host. The large name is not removed.
LARGE_MODEL = "microsoft/llmlingua-2-xlm-roberta-large-meetingbank"
DEFAULT_MODEL = "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank"
DEFAULT_RATE = 0.3
# llmlingua PromptCompressor.init_llmlingua2 default. More names than this
# raise before the model runs, instead of hitting its assert.
MAX_FORCE_TOKENS = 100
MEASUREMENT_PATH = Path("wr/measurements/llmlingua2-governance-2026-11-11.json")


def resolve_force_tokens(extra=None) -> list:
    """UPREV, WR, and MCP, then REVVEL_FORCE_TOKENS, then the caller's list.

    Order is stable and duplicates are dropped. The env value is a comma
    separated list so a worker can extend the set without editing this file.
    An empty piece (a trailing comma) is ignored, not stored as a blank token.
    """
    tokens = list(CRITICAL_TERMS)
    env_extra = os.environ.get("REVVEL_FORCE_TOKENS", "")
    pieces = [part.strip() for part in env_extra.split(",") if part.strip()]
    if extra:
        pieces.extend(str(part).strip() for part in extra if str(part).strip())
    for piece in pieces:
        if piece not in tokens:
            tokens.append(piece)
    if len(tokens) > MAX_FORCE_TOKENS:
        raise ValueError(
            f"At most {MAX_FORCE_TOKENS} force tokens; LLMLingua-2 refuses a longer list"
        )
    return tokens


def validate_rate(rate) -> float:
    """Keep-fraction in (0, 1]. True is rejected: bool is an int subclass."""
    if isinstance(rate, bool) or not isinstance(rate, (int, float)) or not 0 < rate <= 1:
        raise ValueError("Compression rate must be in (0, 1]")
    return float(rate)


def selected_model(model_name=None) -> str:
    """Explicit argument, then REVVEL_LLMLINGUA_MODEL, then DEFAULT_MODEL."""
    chosen = (model_name or os.environ.get("REVVEL_LLMLINGUA_MODEL") or "").strip()
    return chosen or DEFAULT_MODEL


@lru_cache(maxsize=4)
def local_compressor(model_name=None):
    # local_files_only: compress never downloads. provision_model does, and
    # only when the operator runs it. trust_remote_code stays false so a
    # Hub repo cannot execute its own code in this process.
    from llmlingua import PromptCompressor
    # 2026-11-10 call, retained as the shape. The model id is now selected
    # (see selected_model). The original literal was LARGE_MODEL.
    # return PromptCompressor(
    #     model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
    #     use_llmlingua2=True, device_map="cpu",
    #     model_config={"local_files_only": True, "trust_remote_code": False},
    # )
    return PromptCompressor(
        model_name=selected_model(model_name),
        use_llmlingua2=True, device_map="cpu",
        model_config={"local_files_only": True, "trust_remote_code": False},
    )


def compress_context(text: str, rate: float = DEFAULT_RATE, compressor=None,
                     force_tokens=None) -> dict:
    """Compress reference context, verifying critical terms before accepting it.

    The caller keeps instructions and the actual task outside this function.
    Failed term preservation returns the original context, with an explicit
    reason. Counts come from the compressor's tokenizer accounting rather than
    character guesses; they are not necessarily the downstream model's tokens.
    LLMLingua-2's own counts are tiktoken gpt-3.5-turbo (use_oai_tokenizer).

    force_tokens defaults to UPREV, WR, MCP plus REVVEL_FORCE_TOKENS. Pass a
    list to add names for this call. rate is the fraction to keep (0.3 = 30%).
    """
    rate = validate_rate(rate)
    forced = resolve_force_tokens(force_tokens)
    if not text.strip():
        return {"content": text, "compressed": False, "reason": "empty-reference-context",
                "origin_tokens": 0, "compressed_tokens": 0, "rate": rate,
                "force_tokens": forced}
    engine = compressor if compressor is not None else local_compressor()
    result = engine.compress_prompt(text, rate=rate, force_tokens=list(forced))
    compressed = result["compressed_prompt"]
    if not isinstance(compressed, str):
        raise ValueError("Compressor returned non-text output")
    # 2026-11-10 substring check, retained and not used. It treats WRONG as WR.
    # missing = [term for term in CRITICAL_TERMS if term in text and term not in compressed]
    missing = [term for term in forced if term_in_text(term, text) and not term_in_text(term, compressed)]
    counts = {"origin_tokens": result.get("origin_tokens"),
              "compressed_tokens": result.get("compressed_tokens"),
              "rate": rate, "force_tokens": forced}
    if missing:
        # Original text is what the caller receives. The token fields are the
        # model's own counts, so a measurement can tell a rejected compression
        # from a short original. Fallback: send the uncompressed document.
        return {"content": text, "compressed": False, "reason": "critical-term-loss",
                "missing_terms": missing, **counts}
    return {"content": compressed, "compressed": True, **counts}


def reduction_from_counts(origin_tokens, compressed_tokens) -> dict:
    """Ratio is origin/compressed (2.0 means half the tokens). None if either
    count is missing or the compressed side is zero — do not invent a ratio.
    """
    if origin_tokens is None or compressed_tokens is None:
        return {"origin_tokens": origin_tokens, "compressed_tokens": compressed_tokens,
                "ratio": None, "kept_fraction": None}
    origin = int(origin_tokens)
    compressed = int(compressed_tokens)
    if origin < 0 or compressed < 0:
        raise ValueError("Token counts must be non-negative")
    if origin == 0 or compressed == 0:
        return {"origin_tokens": origin, "compressed_tokens": compressed,
                "ratio": None, "kept_fraction": None}
    return {"origin_tokens": origin, "compressed_tokens": compressed,
            "ratio": origin / compressed, "kept_fraction": compressed / origin}


def term_in_text(term: str, text: str) -> bool:
    """Whole-token match, case sensitive.

    A raw substring treats WRONG, WRAPPED, and WRs as the critical term WR.
    The 2026-11-11 measurement rejected recurse-rules.md,
    standards/AGENTS_STAR_OPTIMIZER.md, and standards/SEARCH_AND_SOURCING.md
    for that reason. Word characters are letters, digits, and underscore.
    """
    if not term:
        return False
    return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) is not None


def _guarded_tokens(result) -> int:
    """Tokens the caller actually receives. A rejection keeps the original."""
    origin = int(result.get("origin_tokens") or 0)
    raw = int(result.get("compressed_tokens") or 0)
    return raw if result.get("compressed") else origin


def measure_document(path: str, text: str, rate: float, compressor, force_tokens) -> dict:
    """One real document. The row stores counts, not the compressed prose."""
    result = compress_context(text, rate=rate, compressor=compressor, force_tokens=force_tokens)
    origin = int(result.get("origin_tokens") or 0)
    raw = int(result.get("compressed_tokens") or 0)
    return {
        "path": path,
        "chars": len(text),
        "origin_tokens": origin,
        "compressed_tokens": raw,
        "guarded_tokens": _guarded_tokens(result),
        "compressed": bool(result.get("compressed")),
        "reason": result.get("reason"),
        "missing_terms": list(result.get("missing_terms") or []),
    }


def summarize_rows(rows) -> dict:
    origin = sum(row["origin_tokens"] for row in rows)
    raw = sum(row["compressed_tokens"] for row in rows)
    guarded = sum(row["guarded_tokens"] for row in rows)
    accepted = sum(1 for row in rows if row["compressed"])
    return {
        "files": len(rows),
        "accepted_files": accepted,
        "rejected_files": len(rows) - accepted,
        "chars": sum(row["chars"] for row in rows),
        "raw_model": reduction_from_counts(origin, raw),
        "guarded": reduction_from_counts(origin, guarded),
        "rows": rows,
    }


def governance_index(root) -> tuple:
    """Same documents context_graph indexes: root Markdown plus standards/.

    Mandatory files are the four the coder refuses to compress. They stay in
    the index so a report can show both the production subset and the full set.
    """
    from context_graph import MANDATORY, build_graph
    documents, _edges = build_graph(Path(root))
    return documents, tuple(MANDATORY)


def measure_governance(root, rate: float = DEFAULT_RATE, compressor=None,
                       force_tokens=None, progress=None) -> dict:
    """Compress every indexed governance document once, then split the rows.

    reference_subset is what .github/scripts/openrouter_coder.py compresses
    when REVVEL_PROMPT_COMPRESSION=1 (everything except the four mandatory
    files). full_governance is the whole index, which is the context the WR
    describes agents loading. Pass compressor to avoid loading the model.
    """
    rate = validate_rate(rate)
    forced = resolve_force_tokens(force_tokens)
    documents, mandatory = governance_index(root)
    rows = []
    for name in sorted(documents):
        # stderr so the JSON summary on stdout stays machine-readable.
        if progress:
            progress(name)
        rows.append(measure_document(name, documents[name], rate, compressor, forced))
    reference = [row for row in rows if row["path"] not in mandatory]
    return {
        "rate": rate,
        "force_tokens": forced,
        "mandatory_paths": list(mandatory),
        "reference_subset": summarize_rows(reference),
        "full_governance": summarize_rows(rows),
    }


def provision_model(model_name=None) -> str:
    """Download the checkpoint into the local Hugging Face cache.

    This is the only download path. compress_context keeps local_files_only.
    A failure here is network or a wrong model id — check huggingface.co and
    the id (microsoft/llmlingua-2-*). Nothing in this function calls a paid LLM.
    """
    name = selected_model(model_name)
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    from huggingface_hub import snapshot_download
    return snapshot_download(repo_id=name)


def measurement_payload(root, rate, compressor, force_tokens, model_name, progress=None) -> dict:
    measured = measure_governance(root, rate=rate, compressor=compressor,
                                  force_tokens=force_tokens, progress=progress)
    return {
        "wr": 18335,
        "model": selected_model(model_name),
        "token_counter": (
            "LLMLingua-2 origin_tokens/compressed_tokens, tiktoken "
            "gpt-3.5-turbo via use_oai_tokenizer=True"
        ),
        "paid_calls": False,
        "notes": [
            "Transformers warns when a document exceeds 512 tokens. LLMLingua-2 "
            "chunks before the classifier runs. That warning is expected and is "
            "not a failed compression.",
        ],
        "accuracy_benchmark": {
            "status": "pending-owner-approved-spend",
            "reason": (
                "Same-task accuracy needs a judge model. The deterministic "
                "term and token score is scripts/prompt_compression_accuracy.py. "
                "The paid judge was not executed."
            ),
        },
        **measured,
    }


def write_measurement(payload, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _stderr_progress(name) -> None:
    # stderr so the JSON summary on stdout stays machine-readable.
    print(f"compress {name}", file=sys.stderr, flush=True)


def run_measure(args) -> int:
    if args.provision:
        print(provision_model(args.model))
    payload = measurement_payload(
        args.root, args.rate, local_compressor(args.model), args.force_token, args.model,
        progress=_stderr_progress,
    )
    payload["measured_at"] = args.measured_at
    output = Path(args.output) if args.output else None
    if output:
        write_measurement(payload, output)
    guarded = payload["full_governance"]["guarded"]
    reference = payload["reference_subset"]["guarded"]
    print(json.dumps({
        "model": payload["model"],
        "output": str(output) if output else None,
        "full_governance": guarded,
        "reference_subset": reference,
        "full_files": payload["full_governance"]["files"],
        "reference_files": payload["reference_subset"]["files"],
        "rejected_full": payload["full_governance"]["rejected_files"],
    }, indent=2))
    return 0


def run_compress(args) -> int:
    if args.provision:
        print(provision_model(args.model))
    text = Path(args.file).read_text(encoding="utf-8")
    result = compress_context(
        text, rate=args.rate, compressor=local_compressor(args.model),
        force_tokens=args.force_token,
    )
    preview = result["content"][:400]
    print(json.dumps({
        "compressed": result["compressed"],
        "reason": result.get("reason"),
        "missing_terms": result.get("missing_terms"),
        "origin_tokens": result.get("origin_tokens"),
        "compressed_tokens": result.get("compressed_tokens"),
        "rate": result.get("rate"),
        "force_tokens": result.get("force_tokens"),
        "preview": preview,
    }, indent=2))
    return 0 if result["compressed"] or result.get("reason") == "empty-reference-context" else 2


def run_provision(args) -> int:
    print(provision_model(args.model))
    return 0


def shared_arguments() -> argparse.ArgumentParser:
    """Options every subcommand accepts. parents= is required: argparse does
    not copy a main-parser flag onto subcommands by itself."""
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--model", default=None,
                        help="Hugging Face model id. Default: official bert-base MeetingBank checkpoint.")
    shared.add_argument("--rate", type=float, default=DEFAULT_RATE,
                        help="Fraction of tokens to keep. Default 0.3.")
    shared.add_argument("--force-token", action="append", default=None, dest="force_token",
                        help="Extra force token. Repeatable. UPREV, WR, MCP are always included.")
    shared.add_argument("--provision", action="store_true",
                        help="Download the model into the local cache before compressing.")
    return shared


def build_parser() -> argparse.ArgumentParser:
    shared = shared_arguments()
    parser = argparse.ArgumentParser(
        description="Local LLMLingua-2 compression for governance context (WR #18335). No paid calls.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    provision = sub.add_parser("provision", help="Download the model and exit.", parents=[shared])
    provision.set_defaults(func=run_provision)
    measure = sub.add_parser("measure", help="Compress indexed governance docs and print counts.",
                             parents=[shared])
    measure.add_argument("--root", default=".")
    measure.add_argument("--output", default=str(MEASUREMENT_PATH))
    measure.add_argument("--measured-at", default=None,
                         help="ISO timestamp recorded in the JSON. Default: current UTC.")
    measure.set_defaults(func=_measure_with_clock)
    compress = sub.add_parser("compress", help="Compress one UTF-8 file and print counts.",
                              parents=[shared])
    compress.add_argument("--file", required=True)
    compress.set_defaults(func=run_compress)
    return parser


def _measure_with_clock(args) -> int:
    if not args.measured_at:
        from datetime import datetime, timezone
        args.measured_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return run_measure(args)


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
