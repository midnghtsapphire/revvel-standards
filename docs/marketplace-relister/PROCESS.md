# Marketplace Relister — Amazon NIB Resale + Review Queue

**Source of truth:** Notion database (inventory + review queue)  
**Goal:** Process only **delivered** Amazon orders → generate Amazon-ready review text + processed images → human edit/approve → submit review → list NIB items locally (OfferUp / Craigslist / Marketplace) at **20% off historical lowest**.

## Current Pipeline

1. **Inbox filter** (Gmail, angelreporters@gmail.com)
   - Only process items with a **Delivered** email/status.
   - Extract order number + category.
   - Product title / ASIN usually missing from email plain text → pull from order page or product link.

2. **Product details**
   - Confirm exact model + color.
   - Pull correct product images from Amazon media URLs.
   - Store ASIN, URL, Keepa lowest, sale price (= Keepa × 0.8).

3. **Image processing**
   - Download exact product image(s).
   - Crop / trim borders.
   - Remove background (white → transparent).
   - Light sharpen / contrast filter so Amazon accepts the image.
   - Attach processed PNG to the Notion page.

4. **Review text**
   - Generate ChatGPT-style headline + body in Amazon review format.
   - Store on the Notion page for human edit.

5. **Human queue (Notion)**
   - Status: To Review → Reviewed
   - Edit text / swap images if needed.
   - Approve → submit review to Amazon.
   - Separate status for listing (To List / Listed).

6. **Resale**
   - NIB items only.
   - Sale price = 20% off lowest price ever (Keepa).
   - Wishlist or Notion view can be used as the source for local marketplace listings.

## Notion Database

- Name / Title
- ASIN
- Amazon URL
- Category
- Condition (New In Box)
- Review Status (To Review / Reviewed)
- Status (To List / Listed)
- Keepa Lowest Price
- Sale Price (20% off)
- Order number + delivery notes
- Processed image + review text in page body

## Example (processed)

- **Item:** Garvee Oversized Heavy Duty Camping Chair (Black Edges + Gray Seat)
- **ASIN:** B0H8SSS7JL
- **Order:** 111-2506933-1332244
- **Delivered:** 18 Oct 2026, Wellington, CO
- Review text + processed image already in Notion.

## Notes

- Vercel project `marketplace-relister` currently deploys from this revvel-standards repo but contains no dedicated image/listing code yet.
- reese-reviews exists but is not the preferred path (too many hands).
- Future: automate Gmail delivered filter → Notion row creation + image pipeline.

---
Last updated: 2026-10-20
