# Marketplace Relister (simple Vercel app)

**One URL. No local npm. No hopping.**

1. Open the deployed site  
2. Upload Amazon order CSV  
3. Click **Generate 3 lifestyle pictures**  
4. **Download** the images to your computer  
5. **Next product**

## Deploy (one-time setup)

1. [Vercel](https://vercel.com) → Add New Project → import `midnghtsapphire/revvel-standards`
2. **Root Directory:** `products/marketplace-relister`
3. Framework: Next.js (auto)
4. Environment variables:
   - `OPENROUTER_API_KEY` = your key  
   - optional: `OPENROUTER_IMAGE_MODEL` = `google/gemini-2.5-flash-image-preview`
5. Deploy → copy the URL (e.g. `https://marketplace-relister.vercel.app`)

That URL is the only one you bookmark.

## Local dev (optional)

```bash
cd products/marketplace-relister
npm install
npm run dev
# http://localhost:3040
```

## Notes

- CSV is parsed **in the browser** (not stored on the server).
- Images are generated on the server, shown in the page, downloaded by you.
- Not the main hub (`revvel-standards.vercel.app`) — this is its **own** Vercel project.
