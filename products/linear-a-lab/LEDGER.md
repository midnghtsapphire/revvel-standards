# LEDGER — Linear A Lab

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-07 — Bootstrap: GORILA-GE + prosecution pipeline (Claude Fable 5)

**Who:** Claude Fable 5 (Claude Code desktop session), for Audrey
(midnghtsapphire). **Branch:** `feat/linear-a-lab`.

**Decisions:**
1. Product incubates at `products/linear-a-lab/` per
   PRODUCT_INCUBATION_STANDARD (no new repo until graduation).
2. GORILA and SigLA are not license-clean for commercial use → built
   GORILA-GE, our own corpus engine, from the public-domain-dedicated
   lineara.xyz data file + uncopyrightable facts. Grade A source check:
   PD dedication read in the file header itself, 2026-11-07.
3. LLMs propose and critique; only deterministic gates decide. Grades A/B/C.
4. Arithmetic gate tolerance ±1 unit, because klasmatogram (fraction sign)
   values are conventional approximations. Exactness still reported.

**Built (files):** `gorila_ge/` (signs, corpus, convert, data: 1,711
inscriptions), `pipeline/` (stats, prosecutor, lmstudio, loop),
`run_decipher.py`, `tests/` (22 tests, all green), BLUEPRINT.md,
BLUEOCEAN.md, README.md, Library/.

**Findings (graded):**
- **[A]** KU-RO arithmetic audit: 22 auditable documents, 8 sum exactly;
  HT 13 entries sum 131 vs declared 130½ (+½), HT 9a −¾ — the audit
  independently reproduces discrepancies known to scholarship. Source:
  `py -3 run_decipher.py audit` on gorila-ge/1 corpus.
- **[A]** KU-RO attested 37× across ≥2 sites, dominantly Haghia Triada;
  "functions as total of contiguous entry block" passes all four
  prosecution gates (see tests/test_loop.py::test_kuro_total_claim_survives).
- **[B]** First live loop (gemma-3-4b via LM Studio, 2 rounds,
  `case_KU-RO.json`): model's toponym guess was prosecuted to fatal, revised
  to "formulaic expression", held at grade B. Demonstrates the fix loop;
  small-model ceiling noted — route hypothesis step to the reasoning lane.

**Environment facts:** LM Studio live at localhost:1234; models
google/gemma-3-4b (works), qwen/qwen3.5-9b (fails to load: "Failed to load
model", likely memory), text-embedding-nomic-embed-text-v1.5. Python 3.14.3
via `py -3`; plain `python` is the Microsoft Store alias stub.

**Superseded — do not use:** (none yet)
