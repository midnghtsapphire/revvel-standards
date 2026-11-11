<!--
Status: unverified; AI answers are leads, not sources. Collected 2026-11-10.
No analysis was run. Sign runs are "sequences", not "words".
-->

# DatDas (Databank of the Danube script)

Status: unverified; AI answers are leads, not sources. Collected 2026-11-10.

No analysis has been run on any corpus. Sign runs between dividers are sequences, not words. This folder is a holdings and lead archive. It does not contain the databank records.

## What DatDas is

DatDas is Marco Merlini's Databank of the Danube script (also "Databank of Danube signs, inscriptions, and inscribed artifacts" / "Databank for the Danube Script"). It is a private research databank, not a public corpus dump.

Published size figures differ by source. Both sets below are **reported** figures, not measurements we have made:

| Reported totals | Source (as cited) |
| --- | --- |
| 818 objects, 953 inscriptions, 4,408 signs | Abstract of Merlini, "Key Features of the Danube Script Based on the Databank DatDas," *Journal of Archaeomythology* 6, article 2 (2010), https://www.archaeomythology.org/publications/the-journal-of-archaeomythology/2010-volume-6/2010-volume-6-article-2/ (abstract only; full PDF behind login). The same three numbers appear in the abstract of the 2009 "Some Key Features…" paper (CiteSeerX record). Joan Marler's public 2010 volume introduction also quotes them. |
| 971 inscribed objects / artefacts, 1,178 inscriptions (two or more signs), 5,421 signs | Merlini 2009, Chapter 6 (Bibliotheca Brukenthal XXXIII), as quoted in our findings note; and Merlini 2025, *Acta Terrae Septemcastrensis* XXIV, p. 43 (doi:10.2478/actatr-2025-0002), which also reports about 194,000 statistically significant entries and an inventory of 292 sign types. |

The 971 / 1,178 / 5,421 totals are already in the 2009 chapter we hold; they are not only later citations. Why the 2009/2010 abstracts and the 2009 chapter disagree has not been settled here.

## Access status

The databank itself is **not publicly online**. No public query interface, data dump, API, or archived web application of the records has been found.

The 2025 *Acta Terrae Septemcastrensis* article held in `tartaria-tablets` says DatDas has "limited public access," which "restricts collaborative verification," and that an open-access platform would be needed for peer checking (ATS XXIV, 2025, pp. 7–73).

`datdas.com` is not the databank. Its only Wayback capture (`http://web.archive.org/web/20130827121406/http://www.datdas.com/`, 27 August 2013) is unrelated bridal-gown spam. Other `datdas.*` endings had no archive snapshots in the 2026-11-10 probe. See [`probe/`](probe/).

Merlini's site [prehistory.it](https://www.prehistory.it/ftp/inventory/) hosts the Winn and Haarmann typological inventories, not the DatDas fiches. The site marks the material "All rights reserved" (Global Prehistory Consortium at EURO INNOVANET).

## Where our holdings live

See [`holdings.md`](holdings.md) for the table. Do not copy PDFs into this folder. In short:

- `midnghtsapphire/tartaria-tablets` `sources/Merlini-2009-Ch6-DatDas-FINDINGS.md` — our notes on Chapter 6.
- `midnghtsapphire/tartaria-tablets` `imports/2026-11-05-llm/07-academia-small/Chapter_6_DatDas.zip` — Academia.edu zip of Chapter 6 (sha256 `1ab02361…`; the chapter, not the database).
- `midnghtsapphire/tartaria-tablets` `sources/Merlini-2025-ActaTS-XXIV.txt` and `Merlini-2025-ActaTS-XXIV-FINDINGS.md` — 2025 article text and notes, including the "limited public access" passage.

The sign-by-sign DatDas records are **not held**.

## Open sources (not a substitute for the databank)

- Chapter 6: https://www.academia.edu/10002149
- Chapter 7: https://www.academia.edu/10156526
- Winn / Haarmann inventories: https://www.prehistory.it/ftp/inventory/

## Layout

```text
docs/datdas/
├── README.md              # this file
├── holdings.md            # what we hold, and where (paths only)
├── schema/datdas.sql      # proposed objects / inscriptions / signs schema (not populated)
├── probe/                 # 2026-11-10 Wayback / Arquivo.pt probe (small text)
└── llm-chats/             # dated unverified AI-chat sessions; later sessions can be added
```

The proposed schema is also archived at [`docs/deep-sweep/schema/datdas.sql`](../deep-sweep/schema/datdas.sql). Method code and earlier Gemma / Venice / DeepSeek pastes stay under [`docs/deep-sweep/`](../deep-sweep/README.md).

## Next step

Ask Merlini for access to the databank. **That email has not been sent.** A draft was offered earlier; it is not in this folder.

— LinearA-Untried
