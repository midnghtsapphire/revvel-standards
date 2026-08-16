# Bill of Materials - Secrets & API Keys

This document lists ALL secrets and API keys required for the video production system. Add these to GitHub secrets, Doppler, or your preferred secrets manager.

## Video Generation

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `HEYGEN_API_KEY` | HeyGen | Avatar video generation | heygen.ai API section |
| `HEYGEN_AVATAR_ID` | HeyGen | Default avatar ID | heygen.ai Avatars page |
| `DID_API_KEY` | D-ID | Talking photo videos | d-id.com API section |
| `SYNTHESIA_API_KEY` | Synthesia | AI video platform | synthesia.io API section |

## Voice Cloning & Audio Upload (Donna AI Style)

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `ELEVENLABS_API_KEY` | ElevenLabs | Voice cloning & TTS | elevenlabs.io API section |
| `ELEVENLABS_VOICE_ID` | ElevenLabs | Default voice ID | elevenlabs.io Voices page |
| `RESEMBLE_API_KEY` | Resemble AI | Custom voice cloning | resemble.ai API section |
| `PLAYHT_API_KEY` | Play.ht | Voice generation | play.ht API section |
| `MURF_API_KEY` | Murf AI | Voiceovers, voice clone | murf.ai API section |
| `VOICEBOOKS_API_KEY` | VoiceBooks | Audio processing | voicebooks.ai API section |

## Avatar Generation (High Quality - Glowing, Clean, Healthy)

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `HEYGEN_API_KEY` | HeyGen | Avatar video generation | heygen.ai API section |
| `HEYGEN_AVATAR_ID` | HeyGen | Default avatar ID | heygen.ai Avatars page |
| `DID_API_KEY` | D-ID | Talking photo videos | d-id.com API section |
| `SYNTHESIA_API_KEY` | Synthesia | AI video platform | synthesia.io API section |
| `DOFANIMATION_API_KEY` | Dofaniction | Avatar animation | dofanimation.com |
| `KOALA_API_KEY` | Koala | AI video generation | koala.sh API section |

## Content Generation

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `OPENAI_API_KEY` | OpenAI | Script writing, content | platform.openai.com |
| `ANTHROPIC_API_KEY` | Anthropic | Content refinement | console.anthropic.com |
| `OPENROUTER_API_KEY` | OpenRouter | AI routing | openrouter.ai |

## Video Editing & Production

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `ADOBE_API_KEY` | Adobe | Creative Cloud integration | developer.adobe.com |
| `CANVA_API_KEY` | Canva | Design automation | canva.com/developers |
| `RUNWAY_API_KEY` | Runway | Video generation | runwayml.com/developers |

## Distribution & Upload

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `YOUTUBE_API_KEY` | Google | YouTube upload | console.cloud.google.com |
| `YOUTUBE_CLIENT_ID` | Google | YouTube OAuth | console.cloud.google.com |
| `YOUTUBE_CLIENT_SECRET` | Google | YouTube OAuth | console.cloud.google.com |
| `GOOGLE_DRIVE_API_KEY` | Google | Drive backup | console.cloud.google.com |
| `DROPBOX_API_KEY` | Dropbox | Cloud backup | dropbox.com/developers |
| `VIMEO_ACCESS_TOKEN` | Vimeo | Video hosting | developer.vimeo.com |

## Monetization & Payments

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `STRIPE_API_KEY` | Stripe | Payments, subscriptions | dashboard.stripe.com/apikeys |
| `GUMROAD_API_KEY` | Gumroad | Digital product sales | gumroad.com/settings/advanced |
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy | Product sales | app.lemonsqueezy.com/settings/api |

## Email & Notifications

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `SENDGRID_API_KEY` | SendGrid | Email notifications | app.sendgrid.com/settings/api_keys |
| `RESEND_API_KEY` | Resend | Email delivery | resend.com/api-keys |
| `MAILGUN_API_KEY` | Mailgun | Transactional email | mailgun.com/dashboard |
| `VALIDATION_ALERT_FROM_EMAIL` | SMTP / n8n | From address for agent-manifest validation failure mail | Your mail provider / n8n SMTP credential |
| `VALIDATION_ALERT_TO_EMAIL` | SMTP / n8n | To address for agent-manifest validation failure mail | Operator inbox |

## Agent Manifest Validation Alerts (n8n)

Used by `workflows/n8n/defensive-validation-guardrail-alerting.json` and documented in `products/agent-manifest-validator/README.md`.

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `SLACK_LOG_CHANNEL_ID` | Slack | Channel ID for CRITICAL validation circuit-breaker alerts | Slack channel details (starts with `C`) |
| `DISCORD_INCIDENT_WEBHOOK_URL` | Discord | Incoming webhook for validation failure posts | Discord channel → Integrations → Webhooks |

## Storage

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `AWS_ACCESS_KEY_ID` | AWS | S3 storage, CDN | console.aws.amazon.com |
| `AWS_SECRET_ACCESS_KEY` | AWS | S3 storage | console.aws.amazon.com |
| `CLOUDFLARE_API_KEY` | Cloudflare | CDN, R2 storage | dash.cloudflare.com/profile/api-tokens |
| `DIGITALOCEAN_API_TOKEN` | DigitalOcean | Droplets, Spaces | cloud.digitalocean.com/account/api |

## Social Media

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `LINKEDIN_API_KEY` | LinkedIn | Publishing, analytics | linkedin.com/developers |
| `FACEBOOK_API_KEY` | Meta | Publishing, insights | developers.facebook.com |
| `TIKTOK_API_KEY` | TikTok | Content posting | developers.tiktok.com |
| `TWITTER_API_KEY` | Twitter/X | Social posting | developer.twitter.com |

## Merchandise

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `PRINTFUL_API_KEY` | Printful | Print-on-demand | printful.com/dashboard/api |
| `REDBAubble_API_KEY` | Redbubble | Merchandise | redbubble.com/developers |
| `TEESPRING_API_KEY` | Teespring | Merchandise | teespring.com/internal/api |

## Chrome Extension

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `CHROME_EXTENSION_ID` | Chrome Web Store | Extension publishing | chrome.google.com/webstore |

## Website & Hosting

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `VERCEL_API_TOKEN` | Vercel | Deployment | vercel.com/account/tokens |
| `NETLIFY_API_KEY` | Netlify | Static hosting | netlify.com/account/applications |
| `CLOUDFLARE_ZONE_ID` | Cloudflare | DNS, CDN | dash.cloudflare.com |

## CLE & Legal

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `COLORADO_BAR_API_KEY` | Colorado Bar | CLE reporting | cobar.org/developers |
| `CLE_PROVIDER_ID` | CLE Provider | Accreditation | Your CLE provider |

## Admin & Infrastructure

| Secret Name | Provider | Purpose | Where to Get |
|-------------|----------|---------|--------------|
| `ADMIN_GITHUB_TOKEN` | GitHub | PR automation | GitHub Settings > Developer |
| `DOPPLER_TOKEN` | Doppler | Secrets management | doppler.com/workplace |
| `AZURE_COMPUTER_VISION_KEY` | Azure | Optional alt-text suggestions for markdown-image-alt-text-checker (WR #16270) | portal.azure.com Computer Vision resource |
| `AZURE_COMPUTER_VISION_ENDPOINT` | Azure | Computer Vision endpoint URL (e.g. `https://NAME.cognitiveservices.azure.com`) | portal.azure.com Computer Vision resource |

---

## Setup Instructions

### 1. GitHub Secrets (Recommended)
```bash
gh secret set HEYGEN_API_KEY --body "your-key-here"
gh secret set ELEVENLABS_API_KEY --body "your-key-here"
# ... add all secrets
```

### 2. Doppler (Optional)
Sync secrets from Doppler to GitHub:
```bash
doppler setup --project revvel-standards
doppler secrets --github
```

### 3. Environment File (.env)
For local development:
```bash
cp .env.example .env
# Edit .env with your keys
```

---

## Priority Secrets (Start Here)

If you need to prioritize, get these first:

1. **HEYGEN_API_KEY** - Core video generation
2. **ELEVENLABS_API_KEY** - Voice cloning
3. **OPENAI_API_KEY** - Content generation
4. **GOOGLE_DRIVE_API_KEY** - Backup storage
5. **SENDGRID_API_KEY** - Email notifications
6. **STRIPE_API_KEY** - Payments
