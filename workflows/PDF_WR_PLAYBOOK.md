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

## 4. GitHub Actions router (JSON for external tools)

On **`sellable-pdf`** Work Requests, **[`.github/workflows/pdf-work-request-router.yml`](../.github/workflows/pdf-work-request-router.yml)** posts a single idempotent issue comment (marker `pdf-workflow-router:v1`) containing **JSON**: `pdf_pipeline_batch`, `autocreate_count`, and links to this playbook, `PDF_AUTOMATION_GUIDE.md`, and `standards/shapes/PDF.md`.

The same router now triggers **Make.com auto-creation** directly (required for full automation). Configure repository secret **`MAKE_PDF_WR_WEBHOOK_URL`** and ensure your Make scenario accepts:

- `trigger_mode: "auto_create_pdf"`
- `idempotency_key` (for replay safety)
- `openrouter_orchestration.brief` (execution brief from OpenRouter)

The router also sends header `X-Idempotency-Key` (same value as `idempotency_key`) on each retry. Configure Make to dedupe by that key so retry attempts do not create duplicate products.

When Make is triggered, the router posts a second status comment (marker `pdf-workflow-make:v1`) showing webhook HTTP status + response body.

**Runs when:** the issue is **opened** with `sellable-pdf` in the body, the label **`output-type:sellable-pdf`** is applied, the issue is **edited** after that label exists, or you **manually run** the workflow (**Actions** tab → **PDF work request router** → enter issue number).

To **refresh** the JSON after editing the batch dropdown, delete the old router comment on the issue, then re-run the workflow with that issue number.

---

## 5. Why testers care

Regression tests keep **Work Request dropdown options** aligned with **wr-auto-classify** allowed values so paid QA does not chase phantom mismatches. If you add a new output type or PDF batch option, update:

- `.github/ISSUE_TEMPLATE/00-work-request.yml`
- `.github/workflows/wr-auto-classify.yml` (`DROPDOWN_FIELDS` / playbook strings as needed)
- `tests/work-request-form-sync.test.js`
- `scripts/parse-pdf-work-request.js` + `tests/parse-pdf-work-request.test.js` (must stay aligned with the issue form)
