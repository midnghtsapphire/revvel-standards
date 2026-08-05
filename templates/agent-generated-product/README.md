# Agent-Generated Product Template

This is the canonical folder layout for any product spawned by the
[Automated Product Pipeline](../../standards/AUTOMATED_PRODUCT_PIPELINE.md).
Use `scripts/init-product.sh <slug> [--shape pdf|app|extension|skill|api|cli|mcp|booklet|full-app|excel|token]`
to scaffold a new product into `projects/agent-generated/<slug>/`.

```text
<slug>/
  state.json        # current pipeline step + flags (bom_ready, certified, …)
  BOM.md            # bill of materials for this product
  research/         # complaints, competitors, reviews, SEO gap → brief.md
  decision/         # ROI gate inputs/outputs, approval log → roi.json
  build/            # source for the chosen shape (per-shape scaffold)
  certify/          # cert reports (code, security, a11y, store, legal)
  monetize/         # stripe products + price + payment links → links.json
  deploy/           # per-store publish manifests + receipts
  market/           # ad accounts, creatives, SEM keyword sets, UTM map
  sales/            # daily snapshots of measure-step metrics
```

Every folder under this template ships with a `.gitkeep` so the layout is
preserved when copied. Do not delete those — `scripts/init-product.sh` relies on
them, and the pipeline writes step outputs into the predictable subpaths.
