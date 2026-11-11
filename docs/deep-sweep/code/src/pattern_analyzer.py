# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

#!/usr/bin/env python3
"""
Pattern analysis for ancient script sign inventories.
Computes frequency distributions, co-occurrence, n-grams.

Sign runs between dividers are sequences, not words.
The source paste ended in the __main__ block; nothing has been added.
"""
import json
from pathlib import Path
from collections import Counter
from itertools import combinations
import pandas as pd


class SignCorpus:
    """Represents a corpus of sign inscriptions for pattern analysis."""

    def __init__(self, name: str):
        self.name = name
        self.inscriptions: list[list[str]] = []  # Each inscription = list of sign IDs
        self.sign_metadata: dict = {}  # sign_id → {category, description, find_site, date}

    def add_inscription(self, sign_ids: list[str], metadata: dict = None):
        self.inscriptions.append(sign_ids)

    def sign_frequencies(self) -> Counter:
        """Count how often each sign appears across all inscriptions."""
        counter = Counter()
        for ins in self.inscriptions:
            counter.update(ins)
        return counter

    def bigram_frequencies(self) -> Counter:
        """Count adjacent sign pairs."""
        counter = Counter()
        for ins in self.inscriptions:
            for i in range(len(ins) - 1):
                counter[(ins[i], ins[i+1])] += 1
        return counter

    def co_occurrence_matrix(self, top_n: int = 50) -> pd.DataFrame:
        """
        Build a co-occurrence matrix for top-N signs.
        Two signs co-occur if they appear in the same inscription.
        """
        freq = self.sign_frequencies()
        top_signs = [s for s, _ in freq.most_common(top_n)]

        matrix = pd.DataFrame(0, index=top_signs, columns=top_signs)

        for ins in self.inscriptions:
            unique_signs = set(ins) & set(top_signs)
            for a, b in combinations(unique_signs, 2):
                matrix.loc[a, b] += 1
                matrix.loc[b, a] += 1

        return matrix

    def positional_bias(self, sign_id: str) -> dict:
        """
        Check if a sign appears disproportionately at start/end of inscriptions.
        Returns ratio of observed/expected for start, middle, end positions.
        """
        start_count = sum(1 for ins in self.inscriptions if ins and ins[0] == sign_id)
        end_count = sum(1 for ins in self.inscriptions if ins and ins[-1] == sign_id)
        middle_count = sum(
            1 for ins in self.inscriptions
            if sign_id in ins[1:-1]
        )
        total = start_count + end_count + middle_count or 1
        positions_total = len(self.inscriptions)

        return {
            "sign": sign_id,
            "start_ratio": start_count / total,
            "end_ratio": end_count / total,
            "middle_ratio": middle_count / total,
            "total_occurrences": total,
        }

    def summary_stats(self) -> dict:
        """Generate summary statistics for the corpus."""
        freq = self.sign_frequencies()
        inscription_lengths = [len(ins) for ins in self.inscriptions]

        return {
            "corpus_name": self.name,
            "total_inscriptions": len(self.inscriptions),
            "total_sign_tokens": sum(inscription_lengths),
            "unique_sign_types": len(freq),
            "mean_inscription_length": sum(inscription_lengths) / max(len(self.inscriptions), 1),
            "max_inscription_length": max(inscription_lengths, default=0),
            "top_10_signs": freq.most_common(10),
            "hapax_legomena": len([s for s, c in freq.items() if c == 1]),
        }


def compare_corpora(corpus_a: SignCorpus, corpus_b: SignCorpus) -> pd.DataFrame:
    """
    Compare sign frequencies between two corpora.
    Useful for Danube vs. Linear A comparison.
    """
    freq_a = corpus_a.sign_frequencies()
    freq_b = corpus_b.sign_frequencies()

    all_signs = set(freq_a.keys()) | set(freq_b.keys())

    rows = []
    for sign in all_signs:
        rows.append({
            "sign": sign,
            f"{corpus_a.name}_freq": freq_a.get(sign, 0),
            f"{corpus_b.name}_freq": freq_b.get(sign, 0),
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    # Example: build a Danube corpus from scraped data
    danube = SignCorpus("Danube_Winn")

    # Load scraped data
    data_path = Path("data/corpora/danube_winn.json")
    if data_path.exists():
        with open(data_path) as f:
            inventory = json.load(f)

        print(f"Loaded Danube Script inventory: {len(inventory.get('categories', []))} categories")
        print(f"Summary: {danube.summary_stats()}")
# The 2026-11-10 source paste ended here.
