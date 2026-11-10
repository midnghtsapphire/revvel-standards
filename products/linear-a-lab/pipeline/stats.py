"""Deterministic corpus statistics: the evidence layer.

Everything here is computable, reproducible, and citable. The LLM layer may
argue; this layer measures. Hypotheses live or die by these numbers.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass

from gorila_ge.corpus import Inscription

# Damaged-sign marker used in transliterations (lacuna bracket residue).
_DAMAGE_CHARS = ("\U0001077b", "[", "]", "•")  # 𐝫, brackets, bullet


def is_damaged(word: str) -> bool:
    return any(c in word for c in _DAMAGE_CHARS)


def word_frequencies(corpus: dict[str, Inscription]) -> Counter:
    c: Counter = Counter()
    for insc in corpus.values():
        for w in insc.words():
            c[w] += 1
    return c


def site_distribution(corpus: dict[str, Inscription], word: str) -> dict[str, int]:
    out: dict[str, int] = defaultdict(int)
    for insc in corpus.values():
        if word in insc.words():
            out[insc.site] += 1
    return dict(out)


def contexts(
    corpus: dict[str, Inscription], word: str, max_contexts: int = 25
) -> list[dict]:
    """Occurrences of `word` with line position and what follows it."""
    found: list[dict] = []
    for insc in corpus.values():
        for li, line in enumerate(insc.lines()):
            toks = line.tokens
            for ti, t in enumerate(toks):
                if t["t"] == "word" and t["v"] == word:
                    nxt = toks[ti + 1] if ti + 1 < len(toks) else None
                    found.append(
                        {
                            "inscription": insc.id,
                            "site": insc.site,
                            "line_index": li,
                            "line_count": len(insc.lines()),
                            "token_index": ti,
                            "followed_by": nxt["t"] if nxt else "line-end",
                            "line_words": line.words(),
                            "line_total": line.numeric_total(),
                        }
                    )
                    if len(found) >= max_contexts:
                        return found
    return found


@dataclass
class KuroResult:
    inscription: str
    declared: float          # number written after the totaling word
    computed: float          # sum of entry numerals above it
    entries: int             # how many numeral-bearing entry lines
    damaged: bool            # any damage markers among the entries

    @property
    def discrepancy(self) -> float:
        return round(self.computed - self.declared, 6)

    @property
    def ok(self) -> bool:
        return abs(self.discrepancy) < 1e-9

    @property
    def near(self) -> bool:
        """Within one unit: klasmatogram (fraction-sign) values are
        conventional approximations, so sub-unit drift is a reading
        artifact, not a refutation."""
        return abs(self.discrepancy) <= 1.0


def kuro_checks(
    corpus: dict[str, Inscription], total_word: str = "KU-RO"
) -> list[KuroResult]:
    """Arithmetic audit: does `total_word`'s numeral equal the sum of the
    numerals on the lines above it? This is the strongest deterministic
    evidence in Linear A: it needs no language assumptions at all.
    """
    results: list[KuroResult] = []
    for insc in corpus.values():
        lines = insc.lines()
        for i, line in enumerate(lines):
            if total_word not in line.words():
                continue
            declared = line.numeric_total()
            if declared is None or i == 0:
                continue
            # Sum the contiguous block of numeral-bearing entry lines
            # directly above the total line: tablets are sectioned, and a
            # heading or an earlier total ends the section.
            computed = 0.0
            entries = 0
            damaged = False
            for prev in reversed(lines[:i]):
                if total_word in prev.words() or "PO-TO-KU-RO" in prev.words():
                    break  # previous section's total: stop
                sub = prev.numeric_total()
                if sub is None:
                    break  # heading line: section starts here
                computed += sub
                entries += 1
                if any(is_damaged(w) for w in prev.words()):
                    damaged = True
            if entries >= 2:
                results.append(
                    KuroResult(
                        inscription=insc.id,
                        declared=declared,
                        computed=round(computed, 6),
                        entries=entries,
                        damaged=damaged,
                    )
                )
            break  # audit only the first total per document
    return results


def evidence_pack(corpus: dict[str, Inscription], word: str) -> dict:
    """Everything the prosecutor and the hypothesis model get to see."""
    freq = word_frequencies(corpus)
    ctxs = contexts(corpus, word)
    followed = Counter(c["followed_by"] for c in ctxs)
    line_initial = sum(1 for c in ctxs if c["token_index"] == 0)
    last_third = sum(
        1
        for c in ctxs
        if c["line_count"] > 2 and c["line_index"] >= (2 * c["line_count"]) // 3
    )
    return {
        "word": word,
        "occurrences": freq.get(word, 0),
        "rank": sorted(freq.values(), reverse=True).index(freq[word]) + 1
        if word in freq
        else None,
        "sites": site_distribution(corpus, word),
        "followed_by": dict(followed),
        "line_initial": line_initial,
        "in_final_third_of_document": last_third,
        "contexts_sampled": len(ctxs),
        "sample_contexts": [
            {k: c[k] for k in ("inscription", "line_words", "line_total")}
            for c in ctxs[:8]
        ],
    }
