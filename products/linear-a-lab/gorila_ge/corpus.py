"""GORILA-GE corpus schema, tokenizer, and loader.

Schema (one JSON object per inscription):

    {
      "id": "HT13",
      "site": "HT",            # prefix of the id: find-place code
      "period": "LMIB",        # ceramic-phase context, "" if unknown
      "tokens": [              # typed token stream, line structure kept
        {"t": "word", "v": "KA-U-DE-TA"},
        {"t": "logo", "v": "VIN"},
        {"t": "div"},
        {"t": "word", "v": "TE"},
        {"t": "nl"},
        {"t": "num", "v": 5},
        {"t": "frac", "v": 0.5, "raw": "1/2"},
        ...
      ]
    }

Token types: word, logo (commodity logogram), num (integer), frac
(fraction, arithmetic value or null), div (word divider), nl (line break).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from . import signs

DATA_PATH = Path(__file__).parent / "data" / "gorila_ge_corpus.json"

_SITE_RE = re.compile(r"^[A-Z]+")


@dataclass
class Line:
    """One physical line of an inscription as typed tokens."""

    tokens: list[dict] = field(default_factory=list)

    def words(self) -> list[str]:
        return [t["v"] for t in self.tokens if t["t"] == "word"]

    def numeric_total(self) -> float | None:
        """Sum of all numerals on this line, None if no numeral present."""
        total = 0.0
        seen = False
        for t in self.tokens:
            if t["t"] == "num":
                total += t["v"]
                seen = True
            elif t["t"] == "frac" and t["v"] is not None:
                total += t["v"]
                seen = True
        return total if seen else None


@dataclass
class Inscription:
    id: str
    site: str
    period: str
    tokens: list[dict]

    def lines(self) -> list[Line]:
        out: list[Line] = [Line()]
        for t in self.tokens:
            if t["t"] == "nl":
                out.append(Line())
            else:
                out[-1].tokens.append(t)
        return [ln for ln in out if ln.tokens]

    def words(self) -> list[str]:
        return [t["v"] for t in self.tokens if t["t"] == "word"]


def classify_token(raw: str) -> dict | None:
    """Map one raw transliterated token to a typed token, None to drop it."""
    if "\n" in raw:
        return {"t": "nl"}
    tok = raw.strip()
    if not tok:
        return None
    if tok == signs.WORD_DIVIDER or tok == "·":
        return {"t": "div"}
    if signs.is_integer_token(tok):
        return {"t": "num", "v": int(tok)}
    if signs.is_fraction_token(tok):
        return {"t": "frac", "v": signs.fraction_value(tok), "raw": tok}
    if signs.is_logogram(tok):
        return {"t": "logo", "v": tok}
    return {"t": "word", "v": tok}


def tokenize(raw_tokens: list[str]) -> list[dict]:
    out = []
    for raw in raw_tokens:
        t = classify_token(raw)
        if t is not None:
            out.append(t)
    return out


def site_of(inscription_id: str) -> str:
    m = _SITE_RE.match(inscription_id)
    return m.group(0) if m else ""


def load_corpus(path: Path | None = None) -> dict[str, Inscription]:
    """Load the GORILA-GE corpus into Inscription objects keyed by id."""
    p = path or DATA_PATH
    with open(p, encoding="utf-8") as fh:
        data = json.load(fh)
    out: dict[str, Inscription] = {}
    for rec in data["inscriptions"]:
        out[rec["id"]] = Inscription(
            id=rec["id"],
            site=rec["site"],
            period=rec.get("period", ""),
            tokens=rec["tokens"],
        )
    return out
