"""Build the GORILA-GE corpus from an extracted lineara.xyz fact dump.

Usage:
    py -3 -m gorila_ge.convert <corpus_extracted.json> [out.json]

Input format: {"HT13": {"context": "LMIB", "words": [...], "parsed": "..."}}
where "words" is the transliterated token stream with "\n" line breaks.

The output keeps only non-copyrightable facts (ids, typed sign sequences,
numerals, find-place codes, ceramic-phase contexts) in the GORILA-GE schema.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from .corpus import site_of, tokenize


def convert(src: Path, dst: Path) -> dict:
    with open(src, encoding="utf-8") as fh:
        raw = json.load(fh)

    inscriptions = []
    for insc_id, rec in sorted(raw.items()):
        tokens = tokenize(rec.get("words") or [])
        if not tokens:
            continue  # empty or image-only records carry no text facts
        inscriptions.append(
            {
                "id": insc_id,
                "site": site_of(insc_id),
                "period": rec.get("context") or "",
                "tokens": tokens,
            }
        )

    out = {
        "schema": "gorila-ge/1",
        "count": len(inscriptions),
        "inscriptions": inscriptions,
    }
    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    return out


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    src = Path(argv[1])
    dst = (
        Path(argv[2])
        if len(argv) > 2
        else Path(__file__).parent / "data" / "gorila_ge_corpus.json"
    )
    out = convert(src, dst)
    print(f"wrote {dst} with {out['count']} inscriptions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
