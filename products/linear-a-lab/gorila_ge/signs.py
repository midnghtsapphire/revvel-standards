"""Sign and token facts for Linear A.

Everything in this module is uncopyrightable fact: Unicode code points,
standard AB sign numbering, and arithmetic values of Aegean numerals.
"""

from __future__ import annotations

# Aegean word divider (U+10101) used in Linear A as a word separator.
WORD_DIVIDER = "\U00010101"  # 𐄁

# Unicode fraction tokens as they appear in transliterated corpora,
# mapped to arithmetic values. Linear A "klasmatograms" (fraction signs,
# conventionally J, E, F, K ...) carry approximate values; the mainstream
# assignments below follow the widely used J=1/2, E=1/4 convention.
FRACTION_VALUES: dict[str, float] = {
    "¹⁄₂": 0.5,       # ¹⁄₂
    "¹⁄₃": 1 / 3,     # ¹⁄₃
    "²⁄₃": 2 / 3,     # ²⁄₃
    "¹⁄₄": 0.25,      # ¹⁄₄
    "³⁄₄": 0.75,      # ³⁄₄
    "¹⁄₅": 0.2,       # ¹⁄₅
    "¹⁄₆": 1 / 6,     # ¹⁄₆
    "¹⁄₈": 0.125,     # ¹⁄₈
    "¹⁄₁₆": 1 / 16,  # ¹⁄₁₆
    "1/2": 0.5,
    "1/3": 1 / 3,
    "2/3": 2 / 3,
    "1/4": 0.25,
    "3/4": 0.75,
    "1/5": 0.2,
    "1/6": 1 / 6,
    "1/8": 0.125,
    "1/16": 1 / 16,
}

# Commodity/unit logograms that appear in Latin-abbreviation convention in
# transliterated Linear A administrative documents (AB-series conventions).
LOGOGRAMS: frozenset[str] = frozenset(
    {
        "VIN",      # wine
        "VINa",
        "GRA",      # grain
        "OLE",      # olive oil
        "OLIV",     # olives
        "FIC",      # figs
        "VIR",      # people/men
        "MUL",      # women
        "CAP",      # goats
        "OVIS",     # sheep
        "SUS",      # pigs
        "BOS",      # cattle
        "TELA",     # cloth
        "LANA",     # wool
        "AES",      # metal/bronze
        "CYP",      # copper?/cyperus
        "AROM",     # aromatics
        "AURUM",    # gold
        "ARGENTUM",  # silver
    }
)

# Function words whose administrative role is established at the level of
# document structure (not language decipherment): these are structural facts
# of the corpus widely reproduced across the scholarship.
FUNCTION_WORDS: dict[str, str] = {
    "KU-RO": "total (sums the entries above it)",
    "PO-TO-KU-RO": "grand total (sums KU-RO subtotals)",
    "KI-RO": "deficit / owed",
    "TE": "transaction sign (heading particle)",
}


def fraction_value(token: str) -> float | None:
    """Arithmetic value of a fraction token, or None if unknown."""
    return FRACTION_VALUES.get(token)


def is_integer_token(token: str) -> bool:
    return token.isdigit()


def is_fraction_token(token: str) -> bool:
    return token in FRACTION_VALUES or "⁄" in token or "/" in token and any(
        c.isdigit() for c in token
    )


def is_logogram(token: str) -> bool:
    return token in LOGOGRAMS
