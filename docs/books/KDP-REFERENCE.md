# KDP reference (house + Amazon)

Canonical: revvel-standards; mirrored in amazon-books.

Path in revvel-standards: [`docs/books/KDP-REFERENCE.md`](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/books/KDP-REFERENCE.md). Mirror in amazon-books: [`docs/KDP-REFERENCE.md`](https://github.com/midnghtsapphire/amazon-books/blob/main/docs/KDP-REFERENCE.md).

A reusable checklist for one book at a time. Specs below were checked against [KDP Help](https://kdp.amazon.com/help) on **14 November 2026** (America/Denver). Amazon changes print, cover, and royalty rules periodically — recheck the [official links](#official-kdp-help-links) before publish day.

Work request for a single title: open **New issue → WR: KDP book** in [revvel-standards](https://github.com/midnghtsapphire/revvel-standards/blob/main/.github/ISSUE_TEMPLATE/kdp-book-wr.yml) or the [amazon-books mirror](https://github.com/midnghtsapphire/amazon-books/blob/main/.github/ISSUE_TEMPLATE/kdp-book-wr.yml). Title format: `WR: KDP book — <title>`.

## How a book moves through a WR

1. Audrey uploads the manuscript (the starting file).
2. Proof and correct the text.
3. Build the image list and licenses.
4. Write the cover prompt and generate art (Grok Imagine or Grok Image).
5. Upscale and check the art.
6. Build interiors for each format.
7. Build full-wrap covers from the [KDP cover calculator](https://kdp.amazon.com/cover-calculator).
8. Fill metadata, description, keywords, and “if you like…” nudges.
9. Fill the KDP upload fields (draft only — nothing is sent yet).
10. **Push the button to upload** only after **Proofy: FINAL APPROVED** and **Audrey's yes**.
11. Plan the matching coloring book and puzzle book (separate listings; B&W cheapest paper for coloring books).

Each stage in the WR has a **Proofy: APPROVED** checkbox. Do not start the next stage until the current one is approved. Do not upload or publish anything to KDP until step 10 is fully checked.

This is a manual, one-book process. Do not batch or bulk-automate titles.

## House rules

- **New print books:** paperback **8.5" × 11"** and hardcover **8.25" × 11"**, glossy, full color (premium color). Archaeology and other illustrated nonfiction use glossy color. Every cover looks different.
- **Already-published 6" × 9" books stay 6" × 9".** Do not resize them.
- **Coloring books:** black-and-white interiors on the cheapest paper (groundwood when available; otherwise white). Coloring books are not eligible for Expanded Distribution.
- **Companion titles:** every book gets a matching coloring book and a matching puzzle book (separate KDP listings).
- **Cover art has no words.** No letters, logos, or watermarks in the generated image. Add the title, author, and a friendly audience tag afterward in the wrap or Kindle front.
- **Images:** made on free Grok (grok.com/imagine or Grok Image). The Tartarian tablets book is the exception. Upscale or download the **largest** size before layout. Pick portrait / tallest aspect ratio when the tool offers a choice.
- **Typography and titles** are added after the art is approved. Leave empty sky or space across the top third of the art for the title.
- **Listings:** set up Kindle, paperback, and hardcover as three separate KDP titles. Keep the **title and author identical** so Amazon can link the formats.
- **Keywords:** seven boxes, each **50 characters or fewer** (house cap; KDP shows an on-screen counter but does not publish the exact number in Help).
- **Descriptions:** say what readers get, why the book is worth the price, and what problem it solves. Add honest “If you like [comp], you’ll love this” nudges, plus cross-promo to Audrey’s other books. No mock or fake blurbs.
- **Licensed photos:** PD, CC0, CC BY, or CC BY-SA only, with credit lines. No NC, no ND, and no British Museum’s own images.
- **Author name** (pick one and keep it identical on every format and on Author Central): Audrey Walter-Evans / Audrey Evans.
- **Author bio:** data scientist, AI enterprise architect, full-stack senior developer, and GIS mapping scientist who loves to cook.
- **Weekly KDP limits** (official): up to **2 new titles created per format** and up to **2 first-time submissions per format** each week. The two limits are separate. They apply separately to eBook, paperback, and hardcover. They reset **Sunday 12:00 AM UTC**, which is **Saturday 5:00 PM** America/Denver. Updates to titles already submitted do not count against the submission limit.
- **Do not publish** until Proofy’s final approval and Audrey’s yes are both on the WR.

### AI disclosure (standing answers)

Fill this on the KDP Content tab. Keep it accurate for the book in front of you.

| KDP question | Standing answer |
| --- | --- |
| Does this book contain AI-generated content? | **Yes** |
| Tool used (pick **one**) | **Grok Imagine** or **Grok Image** |
| What that tool was used for | Check what applies: images, captions, docs, text |
| Images (when a few covers or plates were generated) | One or a few AI-generated images, minimal or no editing |
| Translations | **None** |

## 1. Cover art prompts

### Hunger Gallows example (reusable pattern)

Paste into free Grok. Choose portrait or the tallest aspect ratio. When you like a frame, upscale or download the largest size before sending it on.

```
Vertical book cover art, photorealistic, cinematic, no text, no letters, no logos, no watermark. A row of ancient human skulls hangs on rope cords in the foreground; the closest skull is weathered bronze-brown with deep vertical cut marks and hangs from a hangman's noose. Behind them, Göbekli Tepe: massive T-shaped carved limestone pillars in a circular stone enclosure on a hilltop, rising out of low fog. Indigo and violet dusk sky with a thin crescent moon. Dark, moody, luxurious, glossy color. Leave empty sky across the top third for a title.
```

Use this as the pattern for other titles: vertical, photorealistic, cinematic, no text, subject in the foreground, real historical setting behind, mood and palette, empty top third for the title.

### Generic fill-in-the-blanks prompt

```
Vertical book cover art, photorealistic, cinematic, no text, no letters, no logos, no watermark. [Main subject in the foreground, with material, color, and important details]. Behind them, [real place or setting, with the specific architecture or landscape that must be recognizable]. [Sky, light, and weather]. [Mood: e.g. dark, moody, luxurious, glossy color]. Leave empty sky across the top third for a title.
```

After the art is approved, add typography on a separate layer: title, subtitle if any, author name, and a short friendly audience tag (for example, “For curious adult readers”). Title, subtitle, and author on the cover must match the KDP details fields exactly.

Front-panel pixel targets at 300 DPI (trim, before typography):

| Panel | Trim (in) | Pixels at 300 DPI | With bleed / wrap |
| --- | --- | --- | --- |
| Kindle front | — | **1600 × 2560** (W × H), ratio at least 1.6:1 | See [Kindle](#kindle-ebook) |
| Paperback front | 8.5 × 11 | 2550 × 3300 | With 0.125" bleed: **2588 × 3375** (front panel only). Full wrap width comes from the cover calculator. |
| Hardcover front | 8.25 × 11 | 2475 × 3300 | Wrap, hinge, and spine come from the cover calculator. Do not guess the full-file size. |

## 2. Format requirements

### Kindle eBook

| Item | Requirement |
| --- | --- |
| Cover file | JPEG or TIFF, RGB, less than 50 MB |
| Ideal size | **1,600 px wide × 2,560 px high** (height-to-width at least **1.6:1**) |
| Other size notes | Minimum 625 × 1,000; maximum 10,000 on a side. Help also says 2,500 px high is a good HD floor, and to keep compression light. Official page lists 72 dpi and, for best results, a minimum of 300 PPI. |
| Manuscript | Preferred: **EPUB**, **DOCX**, or **KPF** (Kindle Create). Also accepted: HTML, RTF, TXT, and PDF (PDF only in listed languages). Unencrypted. Fixed-layout MOBI is no longer accepted (as of March 2025). |
| ISBN | Optional. Amazon assigns an ASIN. Each print format still needs its own ISBN. |
| DRM | Choose yes or no on the Content tab. DRM-free lets verified purchasers download EPUB and PDF. Royalty is the same either way. |
| Royalty | **35%** or **70%**. Public-domain works are not eligible for 70%. |
| 70% list-price band (effective 7 July 2026) | Amazon.com **$2.99–$12.99**. 70% minus delivery cost (Amazon.com: $0.15/MB). Sales outside 70% territories pay 35%. Brazil, Japan, Mexico, and India also need KDP Select for 70%. |
| 35% list-price band (Amazon.com) | $0.99–$200 if the file is under 3 MB; $1.99–$200 if 3–10 MB; $2.99–$200 if 10 MB or larger. |

Help: [eBook cover](https://kdp.amazon.com/en_US/help/topic/G200645690), [manuscript formats](https://kdp.amazon.com/en_US/help/topic/G200634390), [DRM](https://kdp.amazon.com/en_US/help/topic/GDDXGH9VR22ACM8U), [list prices](https://kdp.amazon.com/en_US/help/topic/G200634560), [pricing](https://kdp.amazon.com/en_US/help/topic/G200641280).

### Paperback — 8.5" × 11", premium color, glossy (new books)

| Item | Requirement |
| --- | --- |
| Trim | **8.5" × 11"** (21.59 × 27.94 cm), a large trim. Already-published 6" × 9" books stay 6" × 9". |
| Ink and paper | **Premium color** on white paper for archaeology and other color interiors. Cover finish: **glossy**. |
| Page count at 8.5" × 11" | Premium color **24–590**; standard color **72–600**; black ink on white **24–590**; cream **24–550**; groundwood **24–578**. |
| Interior bleed | If any image reaches the page edge, the whole interior uses bleed: add **0.125"** to the top, bottom, and outside edges. File page size becomes **8.625" × 11.25"**. |
| Interior margins (minimum) | Outside: 0.25" without bleed, **0.375"** with bleed. Inside (gutter): **0.375"** (24–150 pp), **0.5"** (151–300), **0.625"** (301–500), **0.75"** (501–700), **0.875"** (701–828). |
| Manuscript | Print-ready **PDF** when bleed is used. 300 DPI images. Fonts embedded. No file security. |
| Cover | One **PDF**: back + spine + front. 300 DPI, flattened, fonts embedded. About 40 MB or less preferred; 650 MB will not convert. All covers have **0.125"** bleed on the outside edges. |
| Spine width (premium color) | Page count × **0.002347"** (0.0596 mm). Always confirm with the [cover calculator](https://kdp.amazon.com/cover-calculator). |
| Spine text | Allowed only at **79+** pages (Cover Creator: 80). Keep 0.0625" clearance from the spine edge. |
| Barcode | Leave the lower-right back-cover box clear unless you place your own 300 DPI barcode. |
| ISBN | Required (except some low-content books). Free KDP ISBN or your own. The ISBN on the interior copyright page must match the one entered in KDP. |
| Royalty (Amazon.com) | **60%** of list minus print cost when the list price is **$9.99 or more**; **50%** at **$9.98 or less**. Expanded Distribution is **40%** minus print cost. Maximum list $250 on Amazon.com. |
| Expanded Distribution | Optional for paperbacks. Not available for hardcover. Distributors do not accept coloring books (and some other low-content types). |
| After publication | Ink type (black / standard color / premium color) is locked. |

Help: [print options](https://kdp.amazon.com/en_US/help/topic/G201834180), [trim, bleed, margins](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6), [paperback cover](https://kdp.amazon.com/en_US/help/topic/G201953020), [paperback royalty](https://kdp.amazon.com/en_US/help/topic/G201834330).

### Hardcover — 8.25" × 11", case laminate, glossy, premium color (new books)

| Item | Requirement |
| --- | --- |
| Trim | **8.25" × 11"** (20.96 × 27.94 cm). This is the largest hardcover trim KDP offers. Five hardcover trims exist in total. |
| Binding | **Case laminate** (art printed on the case; no dust jacket). Cover finish: **glossy** or matte; house default is glossy. |
| Ink and paper | **Premium color** on white. Standard color and groundwood are not available on hardcover. |
| Page count | Official Help: **75–550**. The cover calculator may start hardcover at **76** pages — use the calculator for the wrap, and stay inside 75–550. |
| Interior | Same margin and bleed rules as paperback, at the hardcover trim. If the ISBN is printed inside, it must be the hardcover ISBN, not the paperback one. |
| Cover | One **PDF**: back + spine + front + wrap. 300 DPI. Size the file with the [cover calculator](https://kdp.amazon.com/cover-calculator) — do not reuse the paperback wrap. |
| Wrap | Art extends **0.51"** (15 mm) past the front and back edges (this turns in and is glued down). |
| Hinge | **0.4"** (10 mm) between the spine and the front/back safe area. No text or barcode in the hinge. |
| Safe text | Keep text and important images **0.635"** (16 mm) from the edge of the book. |
| Spine / headband | Flat spine. A black-and-white headband is added when the manuscript is more than **120** pages. |
| ISBN | Required and unique to the hardcover. |
| Distribution | Amazon.com, .co.uk, .de, .es, .fr, .it, .nl, .ie, .com.be, .pl, .se. **Not** available on Amazon.co.jp. **No Expanded Distribution.** To appear on .ca and .com.au, make the book available on Amazon.com. |
| Royalty | Same 50% / 60% list-price split as paperback on Amazon.com ($9.98 / $9.99). Formula: (royalty rate × list) − print cost. |

Help: [hardcover](https://kdp.amazon.com/en_US/help/topic/GAVW3FZZAKA2KY3B), [hardcover cover](https://kdp.amazon.com/en_US/help/topic/GDTKFJPNQCBTMRV6), [hardcover print elements](https://kdp.amazon.com/en_US/help/topic/GKZVNAAFYWVKZWL8), [hardcover royalty](https://kdp.amazon.com/en_US/help/topic/G77F3WPD3KQLJTFS).

## 3. KDP upload template (fields in order)

Create each format as its own title: **+ Create → Kindle eBook / Paperback / Hardcover**. Fill this sheet, then wait for Proofy’s final approval and Audrey’s yes before you press publish or upload-and-release.

### Details

| Field | Fill in |
| --- | --- |
| Language | __________________ (usually English) |
| Book title | __________________ (must match the cover; no keyword stuffing) |
| Subtitle (optional) | __________________ (title + subtitle together must be **200 characters or fewer**) |
| Series (optional) | Series name: __________________ / Number (digits only): __________________ |
| Edition number | __________________ |
| Author | __________________ (Audrey Walter-Evans / Audrey Evans — match published books exactly) |
| Contributors (optional) | Role + name: __________________ |
| Description | Up to **4,000 characters**, including any HTML tags. Draft in [§4](#4-description-template). |
| Publishing rights | [ ] I own the copyright and I hold the necessary publishing rights  [ ] This is a public domain work |
| Primary audience — sexually explicit images or title | [ ] Yes  [ ] No |
| Reading age (optional) | Min ____ / Max ____ (needed for children’s or teen categories) |
| Primary marketplace | __________________ (usually Amazon.com) |
| Categories | 1) __________________  2) __________________  3) __________________ (up to three) |
| Keywords (7, each ≤ 50 characters) | 1) ________  2) ________  3) ________  4) ________  5) ________  6) ________  7) ________ |
| Publication date | __________________ (leave blank if this is the first publication; not required for eBooks) |
| Release date | [ ] Release now  [ ] Schedule a release (print only, 5–90 days; detail page appears on the release date)  [ ] Pre-order (eBook only, up to one year; 72-hour lock before release) |

Title, subtitle, author, series, and ISBN in the files must match these fields. After publication you cannot change title or primary author; that takes a new edition.

Keywords may not name other authors or other people’s books, claim “bestseller,” or stuff promotions. Comps belong in the description and A+ content, not in the keyword boxes.

### Content

| Field | Fill in |
| --- | --- |
| Manuscript | File: __________________ |
| Cover | File: __________________ (Kindle: JPEG/TIFF front. Print: one full-wrap PDF from the calculator.) |
| Print options (print only) | Ink/paper: __________________ Trim: __________________ Finish: glossy / matte Bleed: yes / no |
| ISBN (print; optional for eBook) | [ ] Free KDP ISBN  [ ] My ISBN: __________________ Imprint: __________________ |
| AI disclosure | See [standing answers](#ai-disclosure-standing-answers). Tool used: [ ] Grok Imagine  [ ] Grok Image. Used for: [ ] images  [ ] captions  [ ] docs  [ ] text. Translations: None. |
| DRM (Kindle only) | [ ] Yes, apply DRM  [ ] No, do not apply DRM |
| Previewer | [ ] Print / Kindle previewer checked; no leftover template text, no low-res images, no missing pages |

### Rights & Pricing

| Field | Fill in |
| --- | --- |
| Territories | [ ] All territories  [ ] Individual territories: __________________ |
| Royalty (Kindle) | [ ] 35%  [ ] 70% |
| List prices | Amazon.com: ____ .ca: ____ .co.uk: ____ .de / EU: ____ .com.au: ____ other: ____ |
| KDP Select (Kindle only, optional) | [ ] Enroll (90-day Kindle Store exclusivity)  [ ] Do not enroll |
| Expanded Distribution (paperback only) | [ ] Yes  [ ] No (not available for hardcover; coloring books are not accepted) |

Then **Save as Draft**. Do **not** click Publish or otherwise send the book live until the WR’s **Proofy: FINAL APPROVED** and **Audrey's yes** boxes are both checked.

## 4. Description template

Stay inside 4,000 characters (HTML tags count). No fake reviews, no mock blurbs, no URLs, no “bestseller” claims, no time-limited promo language.

```
[Opening — what the reader gets in this book, in plain language.]

[Why it’s worth the price: what is inside that they cannot get in a thin summary — plates, maps, transcriptions, step-by-step explanations, the research problem it solves.]

[Who it’s for. Keep this aligned with the friendly audience tag on the cover.]

If you like [comp author or book], you’ll love this.

If you enjoyed [one of Audrey’s related titles], you’ll also want [this book / the next title].
Examples of in-house cross-promo: Tartarian tablets → Linear A, Scribes of the Palace, Clues in Clay.

[Optional short about the author:] Audrey Walter-Evans is a data scientist, AI enterprise architect, full-stack senior developer, and GIS mapping scientist who loves to cook.
```

Use trending but accurate words in the title, subtitle, and keywords. Do not promise a subject the book does not cover.

## 5. Suggestions and pre-upload checklist

Proof the text and correct the book **before** redesigning covers.

- [ ] Spelling, captions, figure numbers, and page references checked.
- [ ] Interior ISBN matches the KDP ISBN for that format.
- [ ] Title, subtitle, and author on the cover match the Details tab.
- [ ] Image licenses are PD, CC0, CC BY, or CC BY-SA, with credit lines; no NC, no ND, no British Museum own images.
- [ ] Cover art has no baked-in words; typography and audience tag added afterward; every cover looks different from the last.
- [ ] Kindle, paperback, and hardcover files meet the tables in [§2](#2-format-requirements).
- [ ] Wrap sized from the KDP cover calculator at the **final** page count (a late page-count change means a new wrap).
- [ ] Metadata, description nudges, and seven keywords (≤ 50 characters, accurate) are ready.
- [ ] AI disclosure completed with the single tool actually used.
- [ ] Weekly creation/submission limits have a free slot for this format.
- [ ] Proof copy (optional but recommended): “Not for Resale,” no ISBN, ordered from the Content tab before publication. Author copies are available at print cost after the book is live.
- [ ] A+ Content (after the listing exists): Marketing → Manage A+ Content; up to several modules; about eight business days for approval; build each marketplace separately. Cross-promo and comps can go here too. No fake blurbs.
- [ ] Author Central: after the book is live, link it to the author page and add the standard bio ([author.amazon.com](https://author.amazon.com)).
- [ ] Matching coloring book and puzzle book are queued as their own listings / WRs.
- [ ] **Proofy: FINAL APPROVED** and **Audrey's yes** are both on the WR before anyone presses upload or Publish.

### Official KDP Help links

- [Create a book](https://kdp.amazon.com/en_US/help/topic/G202172740) (includes weekly limits)
- [Cover calculator](https://kdp.amazon.com/cover-calculator)
- [Print options](https://kdp.amazon.com/en_US/help/topic/G201834180)
- [Trim, bleed, and margins](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6)
- [Paperback cover](https://kdp.amazon.com/en_US/help/topic/G201953020)
- [Hardcover](https://kdp.amazon.com/en_US/help/topic/GAVW3FZZAKA2KY3B) · [Hardcover cover](https://kdp.amazon.com/en_US/help/topic/GDTKFJPNQCBTMRV6)
- [eBook cover](https://kdp.amazon.com/en_US/help/topic/G200645690) · [eBook formats](https://kdp.amazon.com/en_US/help/topic/G200634390)
- [eBook list prices](https://kdp.amazon.com/en_US/help/topic/G200634560) · [Paperback royalty](https://kdp.amazon.com/en_US/help/topic/G201834330) · [Hardcover royalty](https://kdp.amazon.com/en_US/help/topic/G77F3WPD3KQLJTFS)
- [ISBN](https://kdp.amazon.com/en_US/help/topic/G201834170) · [Metadata](https://kdp.amazon.com/en_US/help/topic/G201097560) · [Keywords](https://kdp.amazon.com/en_US/help/topic/G201298500)
- [Description](https://kdp.amazon.com/en_US/help/topic/G201189630) · [Titles and editions](https://kdp.amazon.com/en_US/help/topic/GW7J4WEKBVU25YEC)
- [Primary audience](https://kdp.amazon.com/en_US/help/topic/G201506310) · [Content guidelines (includes AI)](https://kdp.amazon.com/en_US/help/topic/G200672390)
- [Release dates](https://kdp.amazon.com/en_US/help/topic/GZUV7SNV728WT4QE) · [KDP Select](https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7)
- [Expanded Distribution](https://kdp.amazon.com/en_US/help/topic/GQTT4W3T5AYK7L45) · [Proof and author copies](https://kdp.amazon.com/en_US/help/topic/G7BBN68RYX5UMDZF)
- [A+ Content](https://kdp.amazon.com/en_US/help/topic/G8EP5W6H9CY7T8GS)

### Notes on what Help does not spell out

- The **50-character** keyword cap is a house rule that matches the usual KDP box limit. Official Help only says to watch the character limit in the field.
- Hardcover **minimum page count** is 75 in Help and may appear as 76 in the cover calculator.
