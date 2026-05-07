# PDF Work Request Playbook

**Purpose:** When someone files a [Work Request](https://github.com/midnghtsapphire/revvel-standards/blob/main/.github/ISSUE_TEMPLATE/00-work-request.yml) with **Output Type = sellable-pdf**, this document is the **single routing spine** for humans and automations.

**Source of truth:** The issue body sections **`### Output Type`** and **`### PDF pipeline batch`** — not ad-hoc GitHub labels. The `output-type:sellable-pdf` label exists only as a **mirror** for older integrations.

---

## 1. Read the batch count from the issue

| `### PDF pipeline batch` value | Meaning for automations |
|-------------------------------|-------------------------|
| Not applicable | One primary concept / outline (default PDF WR). |
| Autocreate 3 | Generate **3** candidate titles+outlines (or products-of-record) before picking one to ship. |
| Autocreate 20 | Generate **20** candidates before narrowing. |

Importer workflows (Make.com, n8n, Zapier, Gumloop) should parse the issue description or use GitHub Actions/API to read these lines — do **not** require an operator to duplicate the count into a label.

---

## 2. Run the six-step PDF automation

Follow **[PDF_AUTOMATION_GUIDE.md](./PDF_AUTOMATION_GUIDE.md)** end-to-end:

1. Profitable niche / emotional problem  
2. Title + subtitle  
3. Full manuscript draft  
4. Layout / export (Canva or Markdown→PDF stack per **[standards/shapes/PDF.md](../standards/shapes/PDF.md)**)  
5. Store listing  
6. Influencer / distribution prep  

Quick installer:

```bash
./workflows/setup-pdf-automation.sh [n8n|make|zapier|gumloop]
```

Loop or branch inside that automation so the **autocreate N** step matches **PDF pipeline batch** (3 or 20).

---

## 3. Obey product shape + pipeline standards

- **[standards/shapes/PDF.md](../standards/shapes/PDF.md)** — research gates, `build/pdf/` tree, optional tooling (Pandoc, WeasyPrint, Figma, etc.).  
- **[standards/AUTOMATED_PRODUCT_PIPELINE.md](../standards/AUTOMATED_PRODUCT_PIPELINE.md)** — where PDF fits in Listen → Ship.

---

## 4. Why testers care

Regression tests keep **Work Request dropdown options** aligned with **wr-auto-classify** allowed values so paid QA does not chase phantom mismatches. If you add a new output type or PDF batch option, update:

- `.github/ISSUE_TEMPLATE/00-work-request.yml`
- `.github/workflows/wr-auto-classify.yml` (`DROPDOWN_FIELDS` / playbook strings as needed)
- `tests/work-request-form-sync.test.js`
