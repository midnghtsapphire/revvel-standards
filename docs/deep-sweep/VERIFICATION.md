<!--
Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-->

# Verification of claims in the 2026-11-10 chat pastes

Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.

Checked 2026-11-10 (America/Denver). Brief citations only. AI answers are not treated as sources.

| Claim | Status | Note |
| --- | --- | --- |
| DatDas is run by Dr. Michael Holzapfel | **False** | DatDas is Marco Merlini's databank of Danube / Vinča signs. An open copy of Merlini, "DatDas: The databank of Danube signs" (Chapter 6) is already held in `midnghtsapphire/tartaria-tablets` under `sources/`. The Holzapfel attribution comes from the Venice paste. |
| `https://www.datdas.com/` is the DatDas site / a "primary resource" | **Unverified** as a current or primary source | The live site is not treated as a working databank here. A Wayback capture of datdas.com exists at least on 2013-08-27; contents were still being probed separately and are not established in this pack. The URL is therefore neither a proven primary resource nor shown to have never existed. |
| `datdas.com` never existed | **False** as a historical claim | Same Wayback evidence: at least one 2013-08-27 capture. That does not make the domain a current DatDas download. |
| `archive-explorer-bot` is a real Wayback / Discord tool | **False** (hallucinated, as the DeepSeek 0813 paste already said) | GitHub code search for `archive-explorer-bot` returned 0 hits (2026-11-10). Repository-name search for `archive-explorer-bot` returned 0 hits. |
| `import commoncrawlsh` / a `commoncrawlsh` library | **False** as a usable package | PyPI `https://pypi.org/pypi/commoncrawlsh/json` returned HTTP 404 on 2026-11-10. GitHub code search found one unrelated markdown mention, not a library. Use `cdx_toolkit` instead. |
| RILA-S1 is "garbled" and is really just GORILA or Younger's corpus | **False** | RILA-S1 is a real Linear A corpus supplement: Maurizio Del Freo and Julien Zurbach, *Recueil des inscriptions en linéaire A*, vol. 6, *Supplément 1* (RILA-S1), Études Crétoises XXI.6, Athens: École française d'Athènes, 2024 (ISBN 978-2-86958-642-0). Salgarella reviewed the volume; Salgarella and Petrakis cite it. They are not the authors. Independent description: plasma-ai/kaphtor `docs/corpus-census.md`. |
| GORILA (Godart & Olivier) and Packard's Linear A work are real, and we already hold them | **Verified** (holdings) | GORILA volumes and Packard 1974 material are already in the owner's libraries, including `midnghtsapphire/linear-a` (`src/grammar/lineara.xyz/papers` and the Packard 1974 PDF). Treat print GORILA as reference-only where licence terms require it. |
| `cdx_toolkit` / Common Crawl and Wayback CDX toolkit | **Verified** | PyPI package `cdx-toolkit` 0.9.39. GitHub `commoncrawl/cdx_toolkit` (the older `cocrawler/cdx_toolkit` URL redirects there). |
| `xnl-h4ck3r/waymore`, `tamnd/ccrawl-cli`, `av1d/cdx-tools`, `ikreymer/cdx-index-client` | **Verified** as existing public repos (2026-11-10) | Confirmed via the GitHub repo API. These tools were not run here. |
| OpenRouter model IDs (`cognitivecomputations/dolphin-mistral-24b-venice-edition`, related Dolphin IDs) and refusal-rate figures (e.g. 2.2% vs. ~64–71%) | **Unverified** leads | Not checked against the live OpenRouter model list in this pass. Do not treat the rates as measured facts. |
| DatDas corpus sizes: 818 objects, 953 inscriptions, 4,408 signs (2010); or 971 artifacts, 1,178 inscriptions, 5,421 signs (2009 book / Wikipedia citation) | **Unverified** as figures in this file | The 2010 counts match the description Audrey already supplied for *Journal of Archaeomythology* 6, art. 2, and for Merlini Chapter 6, which we hold. The 2009 book figures were not re-counted here. Record both only as leads until checked against the held text. |
| prehistory.it Winn / Haarmann inventories | **Unverified** in this pass | URLs appear in the pastes (`https://www.prehistory.it/ftp/inventory/index.htm` and related pages). Pages were not fetched for this pack. |
| "Merlini 2025" cross-comparison paper on Academia.edu | **Unverified** | Named in the DeepSeek 0423 paste only. |

## Recovered t9u bodies

The first commit on this pack recorded `schema.sql` and `datdas.sql` as gap notes, because that stretch of t9u was omitted in the handoff. Those bodies, and `probe_datdas_domains.py`, were later recovered verbatim from Audrey's paste and now live in `schema/` and `code/ingest/`. They remain unverified AI-chat output and have not been run. The probe script names candidate domains (`datdas.com`, `datdas.eu`, `datdas.it`, `merlini.it`, `datdas.org`); it has not been executed here.

## What this pack is not

- Not a runnable pipeline and not a new Linear A or DatDas corpus.
- Not permission to scrape paywalled sites, to use pirate libraries, or to run analyses on the Linear A corpus without a preregistered hypothesis.
- Not a claim that every URL, model ID, or statistic in the chats is real. See the table.
