# Domain Consolidation & Migration Runbook

Goal: one hub (oaudrey.com on Vercel free), Cloudflare free DNS + redirects,
no per-project domains, no DigitalOcean, no Squarespace, no mystery AWS.

## Current DNS audit (2026-11-10)

| domain | registrar | current state | action |
|---|---|---|---|
| oaudrey.com | GoDaddy | parked/forwarding | point NS to Cloudflare -> Vercel (hub) |
| freedomangelcorps.com | **Namecheap** | Namecheap hosting IP | redirect -> /freedom-angel-corps/ |
| freedomangelcorp.org | GoDaddy | **AWS accelerator IPs - find & kill the AWS resource** | redirect -> /freedom-angel-corps/ |
| growlingeyes.com | GoDaddy | parked | KEEP domain, site lives on hub or Vercel |
| growlingeye.com | GoDaddy | parked | redirect -> growlingeyes.com |
| uprisinghope.com | **Afternic NS - verify ownership NOW** | parked/listed? | redirect -> /uprising-hope/ |
| risingaloha.com | Google/Squarespace | **active Squarespace site (~$20/mo)** | export content -> /rising-aloha/, cancel Squarespace |

## Steps

### 1. Cloudflare onboarding (per domain, ~5 min each)
1. dash.cloudflare.com -> Add site -> enter domain -> Free plan
2. Cloudflare gives 2 nameservers
3. At the registrar (GoDaddy / Namecheap / Squarespace): set custom NS to those two
4. Wait for "Active" in Cloudflare (minutes to hours)

### 2. Hub deploy
1. Vercel -> import midnghtsapphire/revvel-standards (free)
2. Vercel -> Domains -> add oaudrey.com
3. In Cloudflare DNS for oaudrey.com: CNAME @ -> cname.vercel-dns.com (proxied)
4. Project pages serve from projects/<slug>/docs/ (see projects/PROJECT_HUB_STANDARD.md)

### 3. Redirects for expiring domains
1. Add each expiring domain to Cloudflare (step 1)
2. Bulk Redirects -> Upload `cloudflare/redirects.csv` (this repo)
3. Redirects work only while you own the domain. Projects keep working on
   oaudrey.com/<slug>/ forever regardless - that is the point of the hub.

### 4. AWS cleanup (do this week)
- freedomangelcorp.org resolves to AWS Global Accelerator IPs.
- AWS console -> Global Accelerator + EC2/ELB + Route53 -> find what those
  IPs belong to -> delete/stop it -> confirm $0 bill.

### 5. Squarespace exit (risingaloha)
- Squarespace -> Settings -> Advanced -> Export
- Convert pages into projects/rising-aloha/docs/ HTML
- Cancel Squarespace after the hub page is live

### 6. Local-machine hosting (optional, free)
For anything you want to run off your own machine instead of Vercel:
```
cloudflared tunnel create oaudrey-local
cloudflared tunnel route dns oaudrey-local local.oaudrey.com
cloudflared tunnel run --url http://localhost:8080 oaudrey-local
```
Free, no port forwarding, TLS handled by Cloudflare.

## Cost after migration
- Domain renewals only (keepers you choose)
- Hosting: $0 (Vercel free + Cloudflare free)
- Cancelled: DigitalOcean, Squarespace, AWS stragglers
