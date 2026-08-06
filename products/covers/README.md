# Product covers (SEO)

Branded JPEG covers for Gumroad products.

## Public URLs (required by Gumroad covers API)

jsDelivr (correct `image/jpeg` Content-Type):

```text
https://cdn.jsdelivr.net/gh/midnghtsapphire/revvel-standards@main/products/covers/cover-vault.jpg
```text

Pin to a commit SHA after regeneration for cache safety:

```text
https://cdn.jsdelivr.net/gh/midnghtsapphire/revvel-standards@<sha>/products/covers/cover-vault.jpg
```text

## Generate

```bash
pip install Pillow
python products/generate_covers.py
```text

## Attach to Gumroad

```bash
export GUMROAD_ACCESS_TOKEN=...
python products/gumroad_attach_covers.py --all
```text

Or run the **Gumroad Covers** GitHub Action (`workflow_dispatch`).
Requires repo secret `GUMROAD_ACCESS_TOKEN`.

## Specs

- Portrait 784×1168 (default) or `--landscape` 1280×720
- JPEG, optimized, dark void background + accent bar
- Wired into product-pipeline / REVENUE_GATE commerce sequence
