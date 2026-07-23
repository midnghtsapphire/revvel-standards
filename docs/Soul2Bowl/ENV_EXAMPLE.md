# Soul2Bowl — Environment Variables Reference
## Copy to .env and fill in all values before running locally
## DO NOT commit .env — only .env.example is committed

## =============================================================================
## CLERK AUTHENTICATION
## =============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

## =============================================================================
## STRIPE PAYMENTS
## =============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=
STRIPE_SECRET_KEY_TEST=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET=
## Stripe Product/Price IDs (set after creating products in Stripe dashboard)
STRIPE_PRICE_ID_MEAL_PREP_7_WEEKLY=

## =============================================================================
## DATABASE (PostgreSQL via DigitalOcean Managed)
## =============================================================================
DATABASE_URL=postgresql://username:password@host:5432/soul2bowl_prod

## =============================================================================
## RESEND (Transactional Email)
## =============================================================================
RESEND_API_KEY=
RESEND_FROM_EMAIL=<orders@soul2bowl.com>
RESEND_FROM_NAME=Soul2Bowl

## =============================================================================
## DIGITALOCEAN SPACES (Media CDN)
## =============================================================================
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=soul2bowl-media
DO_SPACES_CDN_URL=<https://soul2bowl-media.nyc3.cdn.digitaloceanspaces.com>

## =============================================================================
## APP CONFIG
## =============================================================================
NEXT_PUBLIC_APP_URL=<https://soul2bowl.com>
NODE_ENV=development
## Admin email — auto-elevated to admin role on first login
ADMIN_EMAIL=<angelreporters@gmail.com>

## =============================================================================
## ANALYTICS & MONITORING
## =============================================================================
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=soul2bowl.com
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

## =============================================================================
## GOOGLE (Maps embed, OAuth via Clerk)
## =============================================================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
## Note: Google OAuth credentials are configured directly in Clerk dashboard

## =============================================================================
## OPENROUTER (AI features — alt text generation, etc.)
## =============================================================================
OPENROUTER_API_KEY=
