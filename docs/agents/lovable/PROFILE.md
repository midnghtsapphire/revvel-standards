# Lovable — Profile

Web-based AI builder that ships React + Vite + Tailwind apps with Supabase
behind. Strong at "I want a working app today." Weak at staying out of your
brand and removing its own watermarks.

## What it's actually good at

- One-shot scaffolding of a working React + Vite + Supabase app.
- Wiring auth and DB in a single pass.
- Decent visual default theme out of the box.

## What it tends to over-engineer

- Extra "About" / "Pricing" / "Features" placeholder pages that aren't
  in your prompt.
- Long generated Tailwind class strings instead of component reuse.

## What it tends to hallucinate

- Supabase RLS policies that don't match the actual schema.
- Routes that point to pages it didn't actually create.

## Fingerprints to scrub before shipping

- Footer link / badge: "Made with Lovable" / "Built on Lovable" / "Powered by Lovable"
- `lovable.dev` URLs in metadata, OG tags, sitemaps, README.
- Default favicon containing Lovable's mark.
- `<!-- Created with Lovable -->` SVG comments.
- The default starter README block from Lovable.

Gate: `scripts/agent-fingerprint-scan.js` (rule ids: `lovable-attr`, asset
comment rule).

## Prompt shapes that work

- "Use the brand: <name>, primary color <hex>, NO 'Made with' footer." —
  explicit brand + no-watermark instruction in the prompt.
- "Remove the default placeholder pages — only the ones I asked for." — to
  prevent the About/Features/Pricing auto-generation.

## Session capture

Lovable doesn't expose a session-export API publicly. Workaround: paste the
Lovable chat history into `docs/agents/lovable/transcripts/<date>-<topic>.md`
when you finish a build.
