# Replit — Profile

Cloud IDE + AI agent ("Replit Agent" / "Ghostwriter"). Good for full-stack apps
that need a hosted dev env. Less polished than Lovable on UI defaults but
stronger on backend wiring.

## What it's actually good at

- Backend-first apps (Express, FastAPI, Flask) with persistent storage.
- Live preview + collaborative editing.
- Quick database wiring (Replit DB, Postgres).

## What it tends to over-engineer

- Suggests adding their `.replit` config and Nix setup to repos that don't
  need them.
- Suggests Replit Deployments over your existing deploy target.

## What it tends to hallucinate

- File paths inside the Replit container that don't map to your local repo.
- Package names that exist on Replit's mirror but not on npm/pypi cleanly.

## Fingerprints to scrub before shipping

- Footer badge: "Made with Replit" / "Built on Replit" / "Powered by Replit"
- `.replit` and `replit.nix` files when the project is hosted elsewhere.
- `replit.com` URLs in `package.json` repository/bugs/homepage.
- Default favicon containing Replit's mark.

Gate: `scripts/agent-fingerprint-scan.js` (rule id: `replit-attr`).

## Prompt shapes that work

- "Don't add .replit or replit.nix. Don't change the deploy target."
- "Backend in <framework>, no Replit-specific deps."

## Session capture

Replit doesn't expose a session-export API. Workaround: copy/paste agent
threads into `docs/agents/replit/transcripts/<date>-<topic>.md`.
