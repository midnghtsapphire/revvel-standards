# Family Order Packs (private Vercel app)

**Location in repo:** `docs/marketplace-relister`  
**This is the real family tool** — batch CSV → lifestyle pics → download.

## Vercel Root Directory (copy this)

```text
docs/marketplace-relister
```

---

## What you and your daughter do (every day)

1. Open the **bookmark** (one link from Vercel)
2. Enter the **family password**
3. **Upload** Amazon order CSV
4. Press **Process next 10** (or 25 / all)
5. Wait — progress bar runs
6. **Download** pictures

No npm. No PowerShell for daily use.

---

## One-time deploy on Vercel

1. [vercel.com](https://vercel.com) → **Add New…** → **Project**
2. Import **`midnghtsapphire/revvel-standards`**
3. **Root Directory** → **Edit** → set:

   **`docs/marketplace-relister`**

4. **Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `OPENROUTER_API_KEY` | your OpenRouter key |
| `FAMILY_APP_PASSWORD` | shared family password |
| `OPENROUTER_IMAGE_MODEL` | optional — defaults to `google/gemini-2.5-flash-image` |

1. **Deploy** → copy URL → bookmark → send daughter the link + password

---

## Env notes

- Without `OPENROUTER_API_KEY`, image generation fails with a clear message.
- Always set `FAMILY_APP_PASSWORD` so the app stays private.

## Local (developers only)

```bash
cd docs/marketplace-relister
npm install
npm run dev
```
