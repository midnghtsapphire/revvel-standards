# Amazon Resale Inventory (Reviewed NIB) — GitHub template

This is the canonical copy of a GitHub issue template that mirrors the Notion database **Amazon Resale Inventory (Reviewed NIB)** as it works today.

- This copy: [`amazon-resale-inventory.yml`](amazon-resale-inventory.yml)
- Live form: `.github/ISSUE_TEMPLATE/amazon-resale-inventory.yml` in [reese-reviews](https://github.com/midnghtsapphire/reese-reviews)
- Rules: [Amazon Rules](https://app.notion.com/p/4182aa319908811288d7cc88a4304b8b)
- Enabled: `1` turns a rule on and `0` turns it off.

## What it mirrors

Field names and order match the Notion Default view:

Name, ASIN, Amazon URL, Category, Condition, Current Price, Keepa Lowest Price, Last Updated, Notes, Original Price, Resale Intent, Review Preview, Review Status, Sale Price (20% off), Sheet Row, Status, Vine Tax Value.

Review **Title**, **Review**, and **Image** match the item page layout already used in Notion (“Amazon Review (publishable — edit only if needed),” then copy title and body into the Vine review form, upload the image if it is ready, and submit).

Statuses are unchanged:

- **Review Status:** To Review, Reviewed
- **Status** (resale): To List, Listed, Hold, Sold
- **Resale Intent:** Yes, Keep, Not Sure
- **Category:** Home, Kitchen, Electronics, Beauty, Tools, Other
- **Condition:** New In Box, Open Box, Used

**Sale Price (20% off)** is lowest historical Keepa price × 0.80. The database is hybrid with the Google Sheet for calculations.
