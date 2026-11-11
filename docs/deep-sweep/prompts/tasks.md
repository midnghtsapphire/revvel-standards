<!--
Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-->

# Task prompts (`prompts/tasks.md`)

From the 2026-11-10 chat paste. Not run. AI answers are leads, not sources.

The paste said to send exported data (sign IDs and sequences are data, not copyrighted prose). Sign runs between dividers are sequences, not words. Do not run these on Linear A corpus data without a preregistered hypothesis via CorpusBot / Fleet-Orchestrator.

Frequency & structure: "Here is a sign inventory with counts [paste CSV]. Compute/describe the frequency distribution, entropy, and any signs that appear disproportionately often or only in specific positions (initial/medial/final). Propose testable hypotheses about the structure of the system."

Sequence mining: "Here are sign sequences from multi-sign inscriptions [paste]. Identify recurring bigrams/trigrams, repeated subsequences, and any evidence of fixed ordering vs. free arrangement. Label each finding with confidence and a falsification test."

Cross-script comparison: "Sign inventories: Danube script A = [...], Linear A B = [...], Cretan Hieroglyphic C = [...]. Compute Jaccard overlaps J(A,B), J(A,C), J(B,C), compare positional statistics, and hypothesize about relationships — including unconventional ones — with confidence labels and tests."

Context correlation: "Here is a sign × object-type contingency table [paste]. Which associations are statistically significant (χ2, α=0.05)? Interpret archaeologically and flag confounds (e.g., >85% of Danube inscriptions are single signs on pottery)."

Hypothesis generation: "Given these attested patterns [paste], generate 5–10 decipherment hypotheses connecting Danube script to Linear A and Cretan Hieroglyphic. For each: evidence, confidence, and exactly what data would confirm or refute it."

Practical settings from the paste: `temperature=0.2` for analysis/SQL, `0.5–0.7` for brainstorming; use a long-context model and chunk large corpora (send per-site or per-object batches); add `HTTP-Referer` and `X-Title` headers if you want OpenRouter leaderboard attribution. Iterate: feed the model its own outputs back as "previous hypotheses" and ask it to critique them.
