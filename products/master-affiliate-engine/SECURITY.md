# Security Policy — Master Affiliate Engine

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | ✅ Yes |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email: `security@masteraffiliateengine.com`

We aim to acknowledge reports within **48 hours** and resolve critical issues within **7 days**.

## Security Practices

### Authentication

- User sessions are managed via NextAuth.js with signed JWT tokens.
- Passwords are never stored in plaintext. Use bcrypt or a managed provider (Supabase, Auth0).
- Admin routes (`/admin`) must be protected with server-side session checks.
- Rate-limit authentication endpoints to prevent brute-force.

### Stripe Integration

- `STRIPE_SECRET_KEY` is never exposed to the client. All Stripe server calls run in API routes.
- Webhook payloads are verified using `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`.
- Never log full card data or Stripe session objects.

### Environment Variables

- All secrets are stored in `.env.local` (not committed to Git — see `.gitignore`).
- Use Vercel Environment Variables for production secrets.
- Rotate `NEXTAUTH_SECRET` and `STRIPE_SECRET_KEY` immediately on suspected exposure.

### API Security

- All API routes validate input and return typed responses.
- CRM webhook URLs are server-side only and never exposed in client bundles.
- CORS is restricted to the deployed domain.

### Dependency Management

- Run `npm audit` before every release.
- Keep Next.js, React, and Stripe dependencies at latest patch versions.
- Enable Dependabot alerts on the repository.

### Content Security

- Affiliate link URLs are sanitized before storage. Only `https://` URLs are accepted.
- All user-provided content is escaped before rendering.
- `rel="sponsored noopener noreferrer"` is applied to all outbound affiliate links.

## Known Limitations

- The `/admin` route currently has no server-side auth guard in the scaffold — add NextAuth session check before production deployment.
- Stripe Elements are stubbed — complete the `/api/checkout-session` route before accepting real payments.
