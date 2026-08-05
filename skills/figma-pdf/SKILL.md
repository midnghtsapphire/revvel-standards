# Figma to PDF Pipeline

Export Figma designs directly to sellable PDFs.

## When to use this skill

Use this when you need to:
- Convert Figma designs to PDF for client delivery
- Generate sellable PDF documents from Figma mockups
- Export Figma prototypes as PDF presentations
- Create invoice/quote PDFs from Figma templates
- Convert Figma designs to printable documents

## Prerequisites

```text
Required secrets:
- FIGMA_API_KEY (get from Figma Settings → Personal Access Tokens)
- OPENROUTER_API_KEY (optional, for AI-generated descriptions)

 Required env (in repo or Actions):
- FIGMA_FILE_KEY (the file ID from Figma URL)
- FIGMA_NODE_ID (optional: specific frame/page to export)
```

## How it works

### 1. Get Figma file or frame

```python
# Via Figma API
import requests

FIGMA_API_KEY = os.environ["FIGMA_API_KEY"]
FILE_KEY = os.environ.get("FIGMA_FILE_KEY", "abc123")

# Get file metadata
resp = requests.get(
    f"https://api.figma.com/v1/files/{FILE_KEY}",
    headers={"X-Figma-Token": FIGMA_API_KEY}
)
pages = resp.json()["document"]["children"]  # pages

# Get specific node
NODE_ID = os.environ.get("FIGMA_NODE_ID", "1:2")
resp = f"https://api.figma.com/v1/files/{FILE_KEY}/nodes?ids={NODE_ID}"
```

### 2. Export to image/PDF

```python
# Use Figma's built-in export
export_settings = [{"format": "png", "scale": 2}]
resp = requests.post(
    f"https://api.figma.com/v1/files/{FILE_KEY}/export",
    headers={"X-Figma-Token": FIGMA_API_KEY},
    json={"urls": [figma_url], "format": "pdf", "scale": 2}
)

# Or use figma-exporter tool
subprocess.run([
    "npx", "figma-export-cli",
    "--file", FILE_KEY,
    "--format", "pdf",
    "--output", "exports/"
])
```

### 3. Alternative: Figma REST API + pdfkit

```python
# Get image URLs first, then wrap in PDF
import imgkit
import pdfkit

# Save each frame as image, combine to PDF
for frame in frames:
    imgkit.from_url(frame["url"], f"{frame['name']}.png")

# Combine images to PDF
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

c = canvas.Canvas("output.pdf", pagesize=letter)
for img in images:
    c.drawImage(ImageReader(img), 0, 0, width=letter[0], height=letter[1])
    c.showPage()
c.save()
```

## Integration

### As WR Output Type

Use `sellable-pdf` output type in WR:

```yaml
Output Type: sellable-pdf
Figma File: https://figma.com/file/ABC123/design-name
Pages to Export: ["Page 1", "Page 3"]
Include: ["descriptions", "specs", "assets"]
```

### GitHub Action Template

```yaml
# .github/workflows/figma-to-pdf.yml
name: Figma to PDF

on:
  workflow_dispatch:
    inputs:
      figma_file:
        type: string
        required: true
        description: "Figma file URL or key"
      pages:
        type: string
        description: "Comma-separated page names"
        required: false

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Figma export
        run: npm install -g @figma/figma-cli
      
      - name: Export PDF
        env:
          FIGMA_API_KEY: ${{ secrets.FIGMA_API_KEY }}
        run: |
          figma export pdf ${{ github.event.inputs.figma_file }} \
            --output ./exports/ \
            --scale 2
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: figma-pdfs
          path: exports/
```

## Use Cases

| Use Case | Description | Required |
|---------|-------------|----------|
| Client deliverables | Export approved designs as PDF | Figma API key |
| Design specs | Generate spec sheets from frames | Figma API + OpenRouter |
| Invoices/quotes | Template-based PDF generation | Figma template + data |
| Portfolio | Export case study designs | Figma API key |
| Presentations | Figma prototypes to slide PDFs | Export each frame |

## Pricing

- Figma API: Free (up to 2000 API calls/month)
- Figma Pro: $15/user/month (higher limits)
- Export tools: Free (npm packages)

## Examples

### Generate from Figma file
```text
Input: https://figma.com/file/abc123/Project-Designs
Output: exports/project-designs.pdf
```

### Multi-page export
```text
Input: Pages: ["Cover", "Screens", "Specs"]
Output: exports/cover.pdf, exports/screens.pdf, exports/specs.pdf
```

## Notes

- Use `--scale 2` for retina-quality exports
- Figma PDF export requires Pro plan for some formats
- Alternative: use Figma's built-in "File → Export as PDF" manually
- For bulk exports, use Figma's REST API with node IDs
