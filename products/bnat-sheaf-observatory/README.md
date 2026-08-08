# BNAT Sheaf Observatory

Interactive production surface for the BNAT Knowledge Sheaf: cellular sheaf
cohomology (H⁰ / H¹), Laplacian energy E(x), transition patches, and topological
fingerprints over BIOME-style worker stalks.

Port: **3012**

Live deployment: deploy this product to Vercel from `products/bnat-sheaf-observatory`
(see Deploy below). After the first production deploy, replace this line with the
verified public URL.

## What it does

- Renders the WR-16909 **executable proof table** (path / cycle / 2-components /
  constant section) using the same rank-nullity math as
  `scripts/bnatsheaf/cohomology.js`.
- Lets you set BIOME worker statuses (`healthy` / `degraded` / `down`) and see
  live `dim_H0`, `dim_H1`, `rank_delta`, energy, and obstruction edges.
- Stays **credit-free**: pure TypeScript, no Ripser/GUDHI, no API keys.

Companion monorepo paths:

- Core engine: `scripts/bnatsheaf/`
- Proofs: `docs/bnatsheaf/SHEAF_COHOMOLOGY_PROOFS.md`
- PH tools survey: `docs/bnatsheaf/PERSISTENT_HOMOLOGY_TOOLS.md`
- Standard: `standards/BNAT_SHEAF_STANDARD.md`

## Local development

```bash
cd products/bnat-sheaf-observatory
npm install
npm run dev -- -p 3012
```

Open <http://localhost:3012>.

## Validation

```bash
cd products/bnat-sheaf-observatory
npm test
npm run typecheck
npm run build
```

Root monorepo gate (includes bnatsheaf proof tests):

```bash
npm test
npm run workflows:validate
```

## Deploy (Vercel)

1. From the monorepo root or this directory, create a Vercel project whose
   **Root Directory** is `products/bnat-sheaf-observatory`.
2. Framework preset: Next.js. Build command: `npm run build`. Output: default.
3. No environment variables required (credit-free).
4. After deploy, confirm the proof table shows Path dim H⁰=1 / H¹=0 and Cycle
   dim H¹=1, then paste the public URL at the top of this README.

CLI alternative:

```bash
cd products/bnat-sheaf-observatory
npx vercel --prod
```

## Monetization path

SaaS wedge for multi-agent ops: consistency gate + obstruction dashboard for
fleets that already emit per-worker health. Free tier = local/credit-free math;
paid tier = hosted snapshot history, barcode vineyards, and imprint-at-spawn
webhooks (Polar.sh / Stripe). Keywords: sheaf cohomology, multi-agent
consistency, persistent homology, fleet health, topological data analysis,
BIOME grounding gate.
