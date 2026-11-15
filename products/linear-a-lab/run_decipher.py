"""CLI for the Linear A Lab pipeline.

Examples:
    py -3 run_decipher.py audit                 # KU-RO arithmetic audit
    py -3 run_decipher.py evidence KU-RO        # evidence pack for a word
    py -3 run_decipher.py case KU-RO --rounds 2 # full loop via LM Studio
    py -3 run_decipher.py top 20                # most frequent words
"""

from __future__ import annotations

import argparse
import json
import sys

from gorila_ge.corpus import load_corpus
from pipeline import stats
from pipeline.lmstudio import LMStudioClient
from pipeline.loop import run_case


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("audit")
    p = sub.add_parser("evidence")
    p.add_argument("word")
    p = sub.add_parser("top")
    p.add_argument("n", type=int, nargs="?", default=20)
    p = sub.add_parser("case")
    p.add_argument("word")
    p.add_argument("--rounds", type=int, default=3)
    p.add_argument("--model", default=None)
    p.add_argument("--out", default=None)

    args = ap.parse_args()
    corpus = load_corpus()

    if args.cmd == "audit":
        results = stats.kuro_checks(corpus)
        exact = [r for r in results if r.ok]
        print(f"auditable KU-RO documents: {len(results)}  exact: {len(exact)}")
        for r in sorted(results, key=lambda r: abs(r.discrepancy)):
            flag = "OK " if r.ok else "OFF"
            dmg = " (damaged)" if r.damaged else ""
            print(f"  {flag} {r.inscription:8} declared={r.declared:g} "
                  f"computed={r.computed:g} d={r.discrepancy:+g}{dmg}")
        return 0

    if args.cmd == "evidence":
        print(json.dumps(stats.evidence_pack(corpus, args.word),
                         ensure_ascii=False, indent=2))
        return 0

    if args.cmd == "top":
        freq = stats.word_frequencies(corpus)
        for w, n in freq.most_common(args.n):
            print(f"{n:5}  {w}")
        return 0

    if args.cmd == "case":
        llm = LMStudioClient(model=args.model)
        case = run_case(corpus, args.word, llm, max_rounds=args.rounds)
        out = json.dumps(case.to_dict(), ensure_ascii=False, indent=2)
        if args.out:
            with open(args.out, "w", encoding="utf-8") as fh:
                fh.write(out)
            print(f"wrote {args.out}")
        final = case.final
        print(f"word={case.word} rounds={len(case.rounds)} "
              f"grade={final.verdict['grade']} score={final.verdict['score']}")
        print("claim:", final.hypothesis.get("claim"))
        if not args.out:
            print(out)
        return 0

    return 2


if __name__ == "__main__":
    sys.exit(main())
