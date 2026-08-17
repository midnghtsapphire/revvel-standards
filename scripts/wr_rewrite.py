#!/usr/bin/env python3
"""WR-4486 Judge-Gated Rewrite Sweep pipeline.

Subcommands:
  select    -> parse lint report + placeholder scan, emit queue.json (WIP-capped)
  run       -> rewrite (lane-0 LM Studio -> lane-0b Ollama -> lane-1 OpenRouter),
               judge (distinct model families), gate (mean>=0.75, min>=0.50,
               lint-clean), retry cap 2, JSONL ledger
  open-prs  -> one branch + PR per passed doc via gh CLI; failed docs flagged

Stdlib only. Env: LMSTUDIO_ENDPOINT (e.g. http://127.0.0.1:1234/v1),
LMSTUDIO_MODEL, OLLAMA_ENDPOINT, OLLAMA_MODEL, OPENROUTER_API_KEY,
REWRITE_MODEL, JUDGE_MODELS (csv), GITHUB_TOKEN (for gh).
Governing standard: standards/WR-4486-judge-gated-rewrite-sweep.md
"""
import argparse
import datetime
import glob
import json
import os
import re
import statistics
import subprocess
import sys
import urllib.request

RUBRIC = [
    "no_placeholders",
    "structure",
    "named_math",
    "claim_hygiene",
    "failure_modes",
    "actionability",
]
PLACEHOLDER_TOKENS = [
    "N/A \u2014 pending",
    "[WR-BLOCKER]",
    "<!-- Detailed scope",
    "<!-- Proposed approach",
    "<!-- Known risks",
]
FAMILY_MAP = [
    ("gpt", "openai"), ("o1", "openai"), ("o3", "openai"),
    ("claude", "anthropic"), ("gemini", "google"), ("gemma", "google"),
    ("kimi", "moonshot"), ("moonshot", "moonshot"), ("llama", "meta"),
    ("qwen", "alibaba"), ("mistral", "mistral"), ("deepseek", "deepseek"),
    ("grok", "xai"), ("command", "cohere"),
]


def model_family(model: str) -> str:
    m = model.lower()
    for needle, fam in FAMILY_MAP:
        if needle in m:
            return fam
    return m.split("/")[0] if "/" in m else m


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def post_json(url: str, payload: dict, headers: dict, timeout: int = 180) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def call_lmstudio(prompt: str) -> tuple[str, str, int]:
    endpoint = os.environ.get("LMSTUDIO_ENDPOINT", "").rstrip("/")
    if not endpoint:
        raise RuntimeError("lane-0 unavailable: LMSTUDIO_ENDPOINT unset")
    model = os.environ.get("LMSTUDIO_MODEL", "local-model")
    out = post_json(f"{endpoint}/chat/completions",
                    {"model": model,
                     "messages": [{"role": "user", "content": prompt}]}, {})
    text = out["choices"][0]["message"]["content"]
    tokens = (out.get("usage") or {}).get("total_tokens", 0)
    return text, model, tokens


def call_ollama(prompt: str, model: str = "") -> tuple[str, str, int]:
    endpoint = os.environ.get("OLLAMA_ENDPOINT", "").rstrip("/")
    if not endpoint:
        raise RuntimeError("lane-0b unavailable: OLLAMA_ENDPOINT unset")
    model = model or os.environ.get("OLLAMA_MODEL", "gemma3")
    out = post_json(f"{endpoint}/api/generate",
                    {"model": model, "prompt": prompt, "stream": False}, {})
    return out.get("response", ""), model, 0


def call_openrouter(prompt: str, model: str) -> tuple[str, str, int]:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    out = post_json("https://openrouter.ai/api/v1/chat/completions",
                    {"model": model,
                     "messages": [{"role": "user", "content": prompt}]},
                    headers)
    text = out["choices"][0]["message"]["content"]
    tokens = (out.get("usage") or {}).get("total_tokens", 0)
    return text, model, tokens


def lint_checks(text: str) -> tuple[bool, list]:
    issues = []
    h1s = [ln for ln in text.splitlines() if re.match(r"^# \S", ln)]
    if len(h1s) != 1:
        issues.append(f"MD025: {len(h1s)} top-level H1s (need exactly 1)")
    in_fence = False
    for i, ln in enumerate(text.splitlines(), 1):
        if re.match(r"^```", ln):
            if not in_fence and re.match(r"^```\s*$", ln):
                issues.append(f"MD040: bare fence at line {i}")
            in_fence = not in_fence
    for tok in PLACEHOLDER_TOKENS:
        if tok in text:
            issues.append(f"placeholder token present: {tok[:30]}")
    return (not issues), issues


def strip_wrapper_fence(text: str) -> str:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
    m = re.match(r"^```(?:markdown|md)?\s*\n(.*)\n```\s*$", text, re.S)
    return m.group(1) if m else text


def rewrite_prompt(doc: str, critiques: list) -> str:
    extra = ""
    if critiques:
        extra = "\nPrior judge critiques to fix:\n- " + "\n- ".join(critiques)
    return (
        "Rewrite the following WR (work register) markdown document to standard.\n"
        "Requirements: exactly one H1; register header (Band/Rev/Status/Depends); "
        "no placeholder or deferral text anywhere - replace with real content or "
        "'N/A - <concrete reason>'; every quantitative claim carries a formula and "
        "named source or an explicit confidence label; methods list failure modes, "
        "not just happy path; acceptance criteria checkable; all code fences carry "
        "a language tag; keep all factual content, never invent facts." + extra +
        "\nReturn ONLY the full rewritten markdown, no commentary.\n\n---\n" + doc)


def judge_prompt(doc: str) -> str:
    return (
        "Score this WR markdown document 0.0-1.0 on each criterion: "
        + ", ".join(RUBRIC) + ". "
        "no_placeholders: no deferral/placeholder tokens. structure: single H1, "
        "complete register header, language-tagged fences. named_math: quantitative "
        "claims have formula+source or confidence label. claim_hygiene: no fabricated "
        "precision. failure_modes: methods list breakage conditions. actionability: "
        "acceptance criteria checkable. "
        'Return ONLY JSON: {"scores": {<criterion>: <float>}, "critique": "<one line>"}'
        "\n\n---\n" + doc)


def parse_judge(text: str) -> tuple[dict, str]:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("judge returned no JSON")
    data = json.loads(m.group(0))
    scores = {k: float(data["scores"].get(k, 0.0)) for k in RUBRIC}
    return scores, str(data.get("critique", ""))[:300]


def ledger_write(path: str, entry: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def cmd_select(args) -> int:
    queue, seen = [], set()
    if os.path.exists(args.lint_report):
        for ln in open(args.lint_report, encoding="utf-8", errors="ignore"):
            m = re.match(r"^(\S+\.md):\d+", ln.strip())
            if m and m.group(1) not in seen:
                seen.add(m.group(1))
                queue.append({"path": m.group(1), "reasons": ["lint"]})
    for pattern in args.include:
        for fp in glob.glob(pattern, recursive=True):
            if fp in seen or not fp.endswith(".md"):
                continue
            try:
                text = open(fp, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            ok, issues = lint_checks(text)
            if not ok:
                seen.add(fp)
                queue.append({"path": fp, "reasons": issues[:4]})
    queue = queue[: args.max_docs]
    json.dump(queue, open(args.out, "w", encoding="utf-8"), indent=2)
    print(f"selected {len(queue)} doc(s) -> {args.out}")
    return 0


def rewrite_via_lanes(prompt: str) -> tuple[str, str, str, int]:
    try:
        text, model, tokens = call_lmstudio(prompt)
        return text, model, "lane-0-lmstudio", tokens
    except Exception as exc:  # noqa: BLE001 - lane failover by design (WR-4481)
        print(f"  lane-0 lmstudio unavailable ({exc}); trying ollama")
    try:
        text, model, tokens = call_ollama(prompt)
        return text, model, "lane-0b-ollama", tokens
    except Exception as exc:  # noqa: BLE001
        print(f"  lane-0b ollama unavailable ({exc}); failing over to OpenRouter")
    model = os.environ.get("REWRITE_MODEL", "moonshotai/kimi-k2")
    text, model, tokens = call_openrouter(prompt, model)
    return text, model, "lane-1-openrouter", tokens


def cmd_run(args) -> int:
    queue = json.load(open(args.queue, encoding="utf-8"))
    judge_models = [m.strip() for m in os.environ.get(
        "JUDGE_MODELS",
        "openai/gpt-5-mini,google/gemini-2.5-flash,anthropic/claude-haiku-4.5",
    ).split(",") if m.strip()]
    exit_code = 0
    for item in queue:
        path = item["path"]
        print(f"== {path}")
        try:
            original = open(path, encoding="utf-8").read()
        except OSError as exc:
            print(f"  skip: {exc}")
            continue
        critiques: list = []
        entry = {"ts": now_iso(), "path": path, "reasons": item.get("reasons", []),
                 "attempts": [], "outcome": "fail", "tokens": 0}
        for attempt in range(1, args.retry_cap + 1):
            text, rw_model, lane, tokens = rewrite_via_lanes(
                rewrite_prompt(original, critiques))
            text = strip_wrapper_fence(text)
            entry["tokens"] += tokens
            rw_family = model_family(rw_model)
            judges = [m for m in judge_models if model_family(m) != rw_family][:3]
            if len(judges) < 2:
                judges = judge_models[:3]  # degraded: log, don't silently pass
            per_judge, crits = [], []
            for jm in judges:
                try:
                    jtext, _, jtok = call_openrouter(judge_prompt(text), jm)
                    entry["tokens"] += jtok
                    scores, crit = parse_judge(jtext)
                    per_judge.append(scores)
                    crits.append(crit)
                except Exception as exc:  # noqa: BLE001
                    print(f"  judge {jm} failed: {exc}")
            if not per_judge:
                critiques = ["all judges failed; retry"]
                entry["attempts"].append({"n": attempt, "lane": lane,
                                          "rewriter": rw_model,
                                          "error": "no judges"})
                continue
            crit_means = {c: statistics.mean(s[c] for s in per_judge)
                          for c in RUBRIC}
            crit_cv = {}
            for c in RUBRIC:
                vals = [s[c] for s in per_judge]
                mu = statistics.mean(vals)
                sd = statistics.pstdev(vals) if len(vals) > 1 else 0.0
                crit_cv[c] = round(sd / mu, 3) if mu else 0.0
            mean_all = statistics.mean(crit_means.values())
            min_all = min(min(s.values()) for s in per_judge)
            lint_ok, lint_issues = lint_checks(text)
            attempt_rec = {"n": attempt, "lane": lane, "rewriter": rw_model,
                           "judges": judges, "mean": round(mean_all, 3),
                           "min": round(min_all, 3),
                           "criterion_means": {k: round(v, 3) for k, v in crit_means.items()},
                           "criterion_cv": crit_cv, "lint_ok": lint_ok,
                           "lint_issues": lint_issues[:5]}
            entry["attempts"].append(attempt_rec)
            if mean_all >= 0.75 and min_all >= 0.50 and lint_ok:
                open(path, "w", encoding="utf-8").write(text)
                entry["outcome"] = "pass"
                print(f"  PASS mean={mean_all:.2f} min={min_all:.2f} lane={lane}")
                break
            critiques = crits + lint_issues
            print(f"  attempt {attempt} fail mean={mean_all:.2f} "
                  f"min={min_all:.2f} lint_ok={lint_ok}")
        if entry["outcome"] != "pass":
            exit_code = 1
            print("  FAIL after retry cap -> needs-human")
        ledger_write(args.ledger, entry)
    return exit_code


def sh(*cmd: str) -> None:
    subprocess.run(cmd, check=True)


def cmd_open_prs(args) -> int:
    entries = [json.loads(ln) for ln in open(args.ledger, encoding="utf-8")]
    latest: dict = {}
    for e in entries:
        latest[e["path"]] = e
    ts = datetime.datetime.now().strftime("%Y%m%d%H%M")
    for path, e in latest.items():
        if e["outcome"] != "pass":
            print(f"needs-human: {path}")
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", os.path.basename(path).lower())[:40]
        branch = f"wr-rewrite/{slug}-{ts}"
        last = e["attempts"][-1]
        body = (f"WR-4486 judge-gated rewrite of `{path}`.\n\n"
                f"Rewriter: {last['rewriter']} ({last['lane']})  \n"
                f"Judges: {', '.join(last['judges'])}  \n"
                f"Scores: mean {last['mean']}, min {last['min']}  \n"
                f"Criterion means: {json.dumps(last['criterion_means'])}  \n"
                f"Dispersion (CV): {json.dumps(last['criterion_cv'])}  \n"
                f"Tokens: {e['tokens']}  \nAttempts: {len(e['attempts'])}\n\n"
                "Born green per WR-4486: judged BEFORE this PR was opened.")
        sh("git", "checkout", "-B", branch)
        sh("git", "add", path)
        sh("git", "commit", "-m", f"docs(wr): judge-gated rewrite of {path} (WR-4486)")
        sh("git", "push", "-u", "origin", branch, "--force")
        sh("gh", "pr", "create", "--base", "main", "--head", branch,
           "--title", f"WR-4486 rewrite: {os.path.basename(path)}",
           "--body", body, "--label", args.label)
        sh("git", "checkout", "-")
        print(f"PR opened for {path}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("select")
    s.add_argument("--lint-report", default="lint.txt")
    s.add_argument("--include", nargs="+", default=["wr/issues/**", "standards/**"])
    s.add_argument("--max-docs", type=int, default=5)
    s.add_argument("--out", default="queue.json")
    r = sub.add_parser("run")
    r.add_argument("--queue", default="queue.json")
    r.add_argument("--rubric", default="standards/WR-4486-judge-gated-rewrite-sweep.md")
    r.add_argument("--ledger", default="ledger/wr-rewrite.jsonl")
    r.add_argument("--retry-cap", type=int, default=2)
    p = sub.add_parser("open-prs")
    p.add_argument("--ledger", default="ledger/wr-rewrite.jsonl")
    p.add_argument("--label", default="wr-rewrite")
    p.add_argument("--human-flag-label", default="needs-human")
    args = ap.parse_args()
    return {"select": cmd_select, "run": cmd_run, "open-prs": cmd_open_prs}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
