### Output Type (required)

production-app

### Summary

Add the MOTU BNAT Knowledge Sheaf geometry logic and documentation.

### Objective

**PR1 problem_statement**
Title: docs(bnatsheaf): MOTU BNAT Knowledge Sheaf standard + dual-language master prompt
Problem statement:
Create the documentation and standard foundation for the MOTU BNAT Knowledge Sheaf. Add directory docs/bnatsheaf/ and the following files:

`docs/bnatsheaf/README.md` — overview of the knowledge sheaf, explicit link to the living example scripts/biome/sheaf.js + docs/biome/biome-status.json, and the imprint-at-spawn rule.
`docs/bnatsheaf/BNAT_SHEAF_STANDARD.md` — formal definitions: cellular sheaf, restriction maps, Sheaf Laplacian energy $E(x)$, $H^1$ obstruction, persistent homology barcodes, dual embedding (algebraic + chemistry/cognitive), and the hard Controller rule that no WR assignment or high-blast PR is allowed while $E(x) > \varepsilon$.
`docs/bnatsheaf/MOTU_MASTER_PROMPT.md` — the full MOTU Visiting Controller system prompt. Use dual formal + cognitive/chemical language throughout.

**Subsequent PR problem_statements (short form for sequential deep control)**
PR2 – core bnatsheaf module
Implement pure-Python cellular sheaf in `bnatsheaf/`: stalks on agents/topics, restriction maps, Sheaf Laplacian $\Delta_{\mathcal{F}}$, energy $E(x)$, basic $H^1$ detection.

PR3 – persistent homology layer
Add filtration construction and $H^0/H^1$ barcode computation.

PR4 – test harness + scripts
Add consistency_check tests and unit tests ensuring energy is zero for consistent sections and greater than zero on conflicts.

PR5 – skill packaging
Package as skills/bnatsheaf/SKILL.md.

PR6 (optional)
`docs/bnatsheaf/NSD_EXPLORATION.md` summarizing Neural Sheaf Diffusion.

### Oversight plan

Once write scopes are restored I (Grok) will:
1. Land the WR file / open the tracking Issue.
2. Launch PR1 via precise problem statement.
3. Review the resulting PR deeply, request fixes if any deviation from the geometric invariant or additive constraint, then merge.
4. Immediately open PR2 with an equally precise statement, and so on.
5. Keep the control plane itself at $H^1\approx 0$ (no silent glue of inconsistent agent states).
