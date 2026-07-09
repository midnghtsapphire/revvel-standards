# Amazon Orders → Listing Pack (live upload page)

**This is the page that accepts your CSV upload.**

## Live URL (after deploy)

https://revvel-standards.vercel.app/docs/vine-orders/

## What it is

- Browser-only tool (your CSV stays on your machine)
- Parses Amazon order history CSV
- Builds `https://www.amazon.com/dp/{ASIN}` from product IDs
- One-at-a-time listing pack for Marketplace copy-paste
- **You do not upload personal product photos**

## What it is not

- Not the main hub homepage (folders / oAudrey / artifacts)
- Not the full Node `reesereviews/vine-marketplace` server (email + FB API)

## Local open

Open `index.html` in a browser, or after `bash scripts/build-static.sh` visit `/docs/vine-orders/`.
