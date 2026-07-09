# Family Order Packs (private Vercel app)

**This is the real family tool** — not a demo, not PowerShell.

## What you and your daughter do (every day)

1. Open the **bookmark** (one link)
2. Enter the **family password** (once in a while)
3. **Upload** Amazon order CSV
4. Press **Process next 10** (or 25 / all)
5. Wait — progress bar runs through products
6. **Download** pictures for each finished pack

No npm. No GitHub. No “one product manually forever.”

---

## One-time deploy (you or a helper — not your daughter)

In [vercel.com](https://vercel.com):

1. **Add New Project** → import `midnghtsapphire/revvel-standards`
2. **Root Directory** → `products/marketplace-relister`  
   (click Edit next to Root Directory)
3. **Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `OPENROUTER_API_KEY` | your OpenRouter key |
| `FAMILY_APP_PASSWORD` | shared family password (pick one) |
| `OPENROUTER_IMAGE_MODEL` | optional — default image model if unset |

4. **Deploy**
5. Copy the URL → bookmark → text to your daughter with the password

That’s the only hard step. After that, only the bookmark.

---

## Env notes

- Without `OPENROUTER_API_KEY`, Generate fails with a clear message.
- Without `FAMILY_APP_PASSWORD`, the app is open (set a password for family privacy).

## Local (optional, developers only)

```bash
cd products/marketplace-relister
npm install
npm run dev
```
