# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

"""Sequence-pattern counters for multi-sign inscriptions.

One copy only: the 2026-11-10 paste repeated this file several times.
HTML entities in the original paste (>= as &gt;=) are restored to Python.
Sign runs between dividers are sequences, not words.
"""
from collections import Counter
import pandas as pd

rows = pd.read_sql("""
    SELECT inscription_id, sign FROM datdas_signs
    WHERE inscription_id IN (SELECT inscription_id FROM datdas_inscriptions WHERE sign_count >= 2)
    ORDER BY inscription_id, seq""", con)
seqs = rows.groupby("inscription_id")["sign"].apply(list)
pairs = Counter()
for s in seqs:
    pairs.update(tuple(s[i:i+2]) for i in range(len(s) - 1))     # bigrams
trigrams = Counter()
for s in seqs:
    trigrams.update(tuple(s[i:i+3]) for i in range(len(s) - 2))   # trigrams
