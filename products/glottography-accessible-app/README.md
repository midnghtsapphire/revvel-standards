# Glottography Explorer

A small, accessible dashboard for browsing the public repositories in the Glottography GitHub organization.

## What it does

- Loads public GitHub metadata from the GitHub API when available
- Shows repository counts, stars, language diversity, and recent update activity
- Supports search and language filtering in an accessible UI
- Falls back to a built-in dataset if the live API is slow or unavailable

## Run locally

From this directory:

```bash
python -m http.server 8000
```

Then open: http://localhost:8000

## Files

- `index.html` — page structure and accessible layout
- `styles.css` — responsive, high-contrast styling
- `app.js` — data fetching, filtering, and rendering logic

## Notes

This project intentionally keeps the app lightweight and easy to run without a build step. That makes it suitable for quick review, local use, and static hosting.
