# SaaS Products Standards

## Philosophy: Single-Purpose Apps

**"Unless you're a contractor, you don't need it over and over again."**

This standard defines how to build and sell single-purpose SaaS products that solve one problem well.

---

## Single-Purpose App Principles

1. **One core feature** - Solve ONE problem extremely well
2. **Quick setup** - Users can start in < 5 minutes
3. **No training needed** - Self-explanatory UI
4. **Pay once, own it** OR **Subscription for updates**
5. **Target niche** - Specific audience, specific use case

---

## Product Categories

### Category 1: PDF Generators (One-time)

| Product | Use Case | Price | Delivery |
|---------|----------|-------|----------|
| **FieldworkPDF** | Field workers submit reports | $29-99 | Standalone web app |
| **InvoicePDF** | Generate professional invoices | $19-49 | Web app |
| **ContractPDF** | Legal contracts from templates | $49-149 | Web app |
| **ReportPDF** | Auto-generate reports | $39-99 | Web app |

### Category 2: One-Trick Apps

| Product | Use Case | Price | Delivery |
|---------|----------|-------|----------|
| **AltTextPro** | Generate alt text for images | $29/mo | Web app + API |
| **ImageCompress** | Compress images instantly | $9/mo | Web app |
| **QRGenerator** | Create QR codes | $5/mo | Web app |
| **ScreenshotEdit** | Annotate screenshots | $9/mo | Web app |

### Category 3: Local Business Tools

| Product | Use Case | Price | Delivery |
|---------|----------|-------|----------|
| **HVACCalc** | HVAC load calculations | $199 | Desktop/web |
| **FestivalPoster** | Festival event posters | $49 | Web app |
| **LocalLeads** | Find local business leads | $99/mo | Web app |

---

## Pricing Model

### One-Time Payment (PDFs, Tools)

```python
pricing_tiers = {
    "starter": {"price": 29, "features": ["Basic use", "5 exports/mo"]},
    "pro": {"price": 79, "features": ["Unlimited exports", "Custom branding"]},
    "enterprise": {"price": 199, "features": ["White-label", "API access"]}
}
```

### Subscription (SaaS)

```python
subscription_tiers = {
    "starter": {"price": 9, "monthly": 9, "annual": 90, "features": ["100 uses/mo"]},
    "pro": {"price": 29, "monthly": 29, "annual": 290, "features": ["Unlimited"]},
    "team": {"price": 99, "monthly": 99, "annual": 990, "features": ["5 seats", "API"]}
}
```

### Hybrid Model

```python
# Pay once for lifetime access, optional subscription for updates
hybrid = {
    "lifetime": {"price": 199, "includes": "Lifetime access"},
    "updates": {"price": 29, "per": "year", "includes": "Updates + support"}
}
```

---

## Local Business Sales Strategy

### Problem: "They do festivals/holidays and don't advertise

**Solution:** Automated outreach tool

```python
local_business_outreach = {
    "problem": "Local festivals, restaurants, shops don't advertise",
    "solution": "Automated analysis + proposal generator",
    "workflow": [
        {
            "step": 1,
            "action": "Scrape local business directories",
            "tool": "Custom crawler"
        },
        {
            "step": 2,
            "action": "Analyze their current website",
            "tool": "Site analyzer"
        },
        {
            "step": 3,
            "action": "Generate improvement report",
            "tool": "AI report generator"
        },
        {
            "step": 4,
            "action": "Create personalized proposal",
            "tool": "Template engine"
        },
        {
            "step": 5,
            "action": "Send via email/mail",
            "tool": "Email integration"
        }
    ],
    "pricing": {
        "per_lead": 5,      # Generate 100 leads = $500
        "full_campaign": 500  # Leads + proposals + outreach
    }
}
```

---

## LocalLeads Product Spec

### Core Features

1. **Business Discovery**
   - Search by zip code, city, business type
   - Filter by: has website, no website, stale website
   - Pull data from Google Maps, Yelp, directories

2. **Website Analysis**
   - Check if website exists
   - Analyze for: alt text, mobile-friendly, SEO score
   - Identify quick wins (missing contact, outdated info)

3. **Proposal Generator**
   - Auto-generate PDF proposal with:
     - Current state analysis
     - Recommended improvements
     - Pricing
     - ROI projection

4. **Outreach Integration**
   - Email templates
   - Mail merge
   - Track opens/clicks

### Pricing

| Tier | Price | Features |
|------|-------|----------|
| Solo | $49/mo | 50 leads, basic analysis |
| Pro | $99/mo | 200 leads, full analysis, proposals |
| Agency | $299/mo | Unlimited, white-label, API |

---

## AltTextPro Product Spec

### Core Features

1. **Image Upload**
   - Drag & drop
   - Bulk upload (up to 50)
   - API access

2. **AI Generation**
   - Context-aware alt text
   - Multiple styles (technical, marketing, SEO)
   - Batch generation

3. **Export**
   - CSV with image names + alt text
   - Copy to clipboard
   - Export to CMS format (WordPress, Shopify)

4. **Integrations**
   - Browser extension
   - Zapier
   - API

### Pricing

| Tier | Price/mo | Credits |
|------|----------|---------|
| Free | $0 | 10/month |
| Starter | $9 | 100/month |
| Pro | $29 | 500/month |
| Business | $99 | Unlimited |

---

## FieldworkPDF (Your Existing Product)

### Core Features

1. **Form Builder**
   - Create custom fields
   - Photo capture
   - Signature capture
   - GPS location

2. **PDF Generation**
   - Branded templates
   - Auto-fill from form data
   - Multiple formats

3. **Delivery**
   - Email to client
   - Download
   - API webhook

### Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Single | $49 | 1 template, unlimited forms |
| Pro | $149 | 5 templates, API access |
| Agency | $399 | Unlimited, white-label |

---

## Technical Requirements

### For All SaaS Products

```python
requirements = {
    "auth": ["OAuth2", "Magic link", "Social login"],
    "security": ["HTTPS", "Data encryption", "GDPR compliance"],
    "hosting": ["Vercel/Railway", "PostgreSQL", "Redis cache"],
    "monitoring": ["Sentry", "Uptime monitoring", "Analytics"],
    "payments": ["Stripe", "LemonSqueezy", "Gumroad"]
}
```

### Minimum Viable Launch

```markdown
## MVP Checklist

- [ ] Core feature works (no polish needed)
- [ ] Simple landing page (1 page)
- [ ] Pricing page
- [ ] Stripe checkout
- [ ] Email capture (optional)
- [ ] Basic support (email)
- [ ] Privacy policy
- [ ] Terms of service
```

---

## Launch Checklist

### Pre-Launch
- [ ] Domain purchased
- [ ] Hosting configured
- [ ] Payment gateway connected
- [ ] Privacy policy written
- [ ] Terms of service written

### Launch Day
- [ ] Announce on social
- [ ] Post on ProductHunt (if applicable)
- [ ] Email existing contacts
- [ ] Submit to directories

### Post-Launch
- [ ] Monitor errors
- [ ] Collect feedback
- [ ] Iterate weekly
- [ ] Add testimonials

---

## Revenue Targets

| Product | Target | Timeline | Notes |
|---------|--------|----------|-------|
| AltTextPro | $1,000 MRR | 6 months | B2C focus |
| LocalLeads | $500 MRR | 6 months | Local B2B |
| FieldworkPDF | $300 MRR | 3 months | Niche B2B |

---

## Notes

- Start with ONE product
- Validate before building (Landing page → Stripe → THEN build)
- Focus on conversion, not features
- Build once, sell multiple times
- Automate everything possible
