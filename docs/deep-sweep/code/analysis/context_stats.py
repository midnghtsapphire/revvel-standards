# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

"""Sign vs object-type contingency, from the 2026-11-10 chat paste."""
# chi-square = sum ((O - E)^2 / E)
import pandas as pd
from scipy.stats import chi2_contingency

df = pd.read_sql("""
    SELECT s.sign, o.object_type FROM datdas_signs s
    JOIN datdas_inscriptions i ON s.inscription_id = i.inscription_id
    JOIN datdas_objects o ON i.object_id = o.object_id""", con)
ct = pd.crosstab(df["sign"], df["object_type"])
chi2, p, dof, expected = chi2_contingency(ct)
print(f"chi2={chi2:.1f}, dof={dof}, p={p:.4g}")   # p<0.05 -> sign-context association
