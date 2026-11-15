#!/usr/bin/env python3
"""prompt_compressor.py — LLMLingua-2 prompt compression w/ offline fallback. WR #18335."""
import argparse, json, os, re, datetime

PROTECT = re.compile(r"\[DO NOT COMPRESS\].*?(?=\[|\Z)", re.S)

def heuristic_compress(text, ratio):
    keep, drop = [], []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith(("<!--", "# FIXME", "# TODO")): drop.append(line); continue
        if PROTECT.search(line): keep.append(line); continue
        # score: prefer lines with entities/numbers/imperatives
        score = len(re.findall(r"[A-Z][a-z]+|[0-9]+", s)) + (1 if re.match(r"^[-*0-9#]", s) else 0)
        (keep if score >= 1 else drop).append(line)
    target = int(len(text) * ratio)
    out = "\n".join(keep)
    while len(out) > target and drop:
        keep.append(drop.pop(0))  # add back highest-priority dropped
        out = "\n".join(keep)
        break
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("--ratio", type=float, default=0.6)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    text = open(a.input).read()
    protected = PROTECT.findall(text)
    try:
        from llmlingua import PromptCompressor
        llm = PromptCompressor()
        body = PROTECT.sub("", text)
        comp = llm.compress_prompt(body, rate=a.ratio)["compressed_prompt"]
        result = "\n".join(protected) + "\n" + comp
        method = "llmlingua-2"
    except ImportError:
        result = heuristic_compress(text, a.ratio); method = "heuristic"
    if a.ratio < 0.3: raise SystemExit("ratio < 0.3 refused (hard fail)")
    out = a.out or a.input + ".compressed.md"
    open(out, "w").write(result)
    os.makedirs("artifacts/compression", exist_ok=True)
    with open("artifacts/compression/log.jsonl", "a") as f:
        f.write(json.dumps({"in": a.input, "method": method, "ratio": a.ratio,
                            "orig_chars": len(text), "comp_chars": len(result),
                            "ts": datetime.datetime.utcnow().isoformat() + "Z"}) + "\n")
    print(f"✔ {method}: {len(text)} → {len(result)} chars → {out}")

if __name__ == "__main__": main()
