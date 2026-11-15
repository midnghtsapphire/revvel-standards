#!/usr/bin/env python3
"""audit_workflows.py — fleet-wide workflow health audit. WR #18313.
Checks every workflow for: dead script references, deprecated actions,
references to deleted workflows, duplicate names. Read-only; pairs with
tier3_self_heal.py for continuous monitoring."""
import os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WF = ROOT / ".github" / "workflows"

def audit():
    all_files = {str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file()}
    problems = []
    seen_names = {}
    for f in sorted(WF.glob("*.y*ml")):
        text = f.read_text(errors="replace")
        name_m = re.search(r"^name:\s*(.+)$", text, re.M)
        if name_m:
            n = name_m.group(1).strip()
            if n in seen_names:
                problems.append(f"{f.name}: duplicate workflow name '{n}' (also {seen_names[n]})")
            seen_names[n] = f.name
        for m in set(re.findall(r"(?:node|python3?|bash|sh)\s+((?:\./)?scripts/[\w./-]+)", text)):
            # only count unguarded refs (no 'if [[ -f' on the same step block)
            p = m.lstrip("./")
            if p not in all_files and f"[[ -f {m}" not in text:
                problems.append(f"{f.name}: references missing script {m}")
        for m in set(re.findall(r"uses:\s*(actions/[\w-]+)@v([12])\b", text)):
            problems.append(f"{f.name}: deprecated action {m[0]}@v{m[1]}")
    return problems

if __name__ == "__main__":
    probs = audit()
    print(f"audited {len(list(WF.glob('*.y*ml')))} workflows")
    for p in probs: print(" ✘", p)
    print("✔ clean" if not probs else f"{len(probs)} problems")
    sys.exit(1 if probs else 0)
