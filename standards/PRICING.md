# Pricing Standards

## Module Pricing Structure

### Base Calculation
```text
Project Cost = (Dev Days × Daily Rate) + Infrastructure + Third-Party + Contingency + Margin
```

### Standard Rates

| Role | Private Rate | Government Rate | Notes |
|------|--------------|-----------------|-------|
| Senior Developer | $1,200/day | $1,800/day | 50% premium for govt |
| Mid Developer | $900/day | $1,350/day | |
| Junior Developer | $600/day | $900/day | |
| Tech Lead | $1,500/day | $2,250/day | |
| Project Manager | $1,000/day | $1,500/day | |
| UI/UX Designer | $900/day | $1,350/day | |
| QA Engineer | $700/day | $1,050/day | |
| DevOps Engineer | $1,100/day | $1,650/day | |

### Your Margin
- **Private**: Add 20-30% margin
- **Government**: Add 25-40% margin (higher due to compliance)

---

## TheAltText Breakdown

### MVP Phase (Months 1-3)

| Component | Days | Private | Government |
|-----------|------|---------|------------|
| **Backend** | | | |
| - API Development | 30 | $36,000 | $54,000 |
| - AI Integration | 15 | $18,000 | $27,000 |
| - Database Design | 10 | $12,000 | $18,000 |
| - Auth System | 8 | $9,600 | $14,400 |
| - Security Hardening | 5 | $6,000 | $9,000 |
| **Frontend** | | | |
| - React App | 25 | $30,000 | $45,000 |
| - Image Upload UI | 8 | $9,600 | $14,400 |
| - Dashboard | 5 | $6,000 | $9,000 |
| - PWA Support | 5 | $6,000 | $9,000 |
| **Infrastructure** | | | |
| - Docker/Deploy | 5 | $6,000 | $9,000 |
| - CI/CD Pipeline | 5 | $6,000 | $9,000 |
| - Monitoring | 3 | $3,600 | $5,400 |
| **Testing & QA** | | | |
| - Unit Tests | 10 | $7,000 | $10,500 |
| - E2E Tests | 8 | $5,600 | $8,400 |
| - Security Audit | 3 | $3,600 | $5,400 |
| **Subtotal** | **145** | **$171,000** | **$256,500** |

### With Your Margin

| Contract Type | Cost | Your Margin | Total |
|---------------|------|-------------|-------|
| Private MVP | $171,000 | +30% ($51,300) | **$222,300** |
| Government MVP | $256,500 | +35% ($89,775) | **$346,275** |

---

## Government Grants Specific

### NSF/SBIR Phases

| Phase | Max Award | Typical Duration |
|-------|-----------|------------------|
| Phase I | $275,000 | 6 months |
| Phase II | $1,000,000 | 2 years |
| Phase III | Varies | Commercialization |

### Budget Categories (Per NSF)

| Category | Phase I % | Phase II % |
|----------|----------|------------|
| Salaries/Wages | 50-60% | 50-60% |
| Consultant Costs | 10% max | 10% max |
| Equipment | 10% max | 10% max |
| Indirect Costs | 40% (F&A) | 40% (F&A) |

### Government Rate Calculation

```python
# Government rates typically higher
base_rate = 1000  # your base daily rate
govt_multiplier = 1.5  # 50% premium

# Add compliance overhead
compliance_days = 5  # security audits, documentation
compliance_cost = compliance_days * base_rate * govt_multiplier

# Add reporting overhead  
reporting_days_per_month = 2  # progress reports, documentation
reporting_cost = reporting_days_per_month * months * base_rate * govt_multiplier
```

### Government Compliance Requirements

| Requirement | Private | Government |
|-------------|---------|------------|
| Security Audit | Optional | **Required** |
| Access Controls | Basic | **RBAC + Audit Log** |
| Data Encryption | Yes | **AES-256 + Key Rotation** |
| HIPAA/FERPA | No | **If applicable** |
| Accessibility (508) | No | **Required** |
| VPN/Zero Trust | No | **Required** |
| Background Checks | No | **May be required** |

---

## Private Enterprise Contracts

### SaaS Pricing Model

| Tier | Price/Month | Features |
|------|-------------|----------|
| Starter | $29 | 100 images |
| Pro | $99 | 1,000 images |
| Enterprise | $299 | Unlimited + SSO |

### Custom Development

| Service | Rate |
|---------|------|
| Custom Integration | $150-200/hour |
| White-label | $10,000-50,000 |
| SLA (99.9% uptime) | +$500/month |

---

## Break-Out Pricing (Government Contract)

If you get a government contract and need to break out:

### Example: $100,000 Contract

| Party | % | Amount |
|-------|---|--------|
| Subcontractor A (Backend) | 35% | $35,000 |
| Subcontractor B (Frontend) | 30% | $30,000 |
| Your Company | 35% | $35,000 |

### Break-Out Structure

```python
# Government Contract Template
contract = {
    "total": 100000,
    "breakout": {
        "subcontractor_backend": {"percentage": 0.35, "amount": 35000},
        "subcontractor_frontend": {"percentage": 0.30, "amount": 30000},
        "your_company": {"percentage": 0.35, "amount": 35000}
    },
    "compliance": ["NIST-800-53", "FISMA", "Section 508"],
    "reporting": "Monthly progress + financial"
}
```

---

## Infrastructure Cost Estimates

| Service | Monthly | Notes |
|---------|---------|-------|
| AWS/GCP Compute | $200-500 | t3.medium instances |
| Database (RDS) | $100-300 | Small production |
| Storage (S3) | $20-50 | Per TB |
| AI API (OpenAI) | $50-500 | Per usage |
| Monitoring (Datadog) | $50-200 | Per host |
| CDN (Cloudflare) | $20-100 | Per traffic |
| SSL Certificates | $0 | Let's Encrypt |
| **Total Monthly** | **$440-1,650** | |

---

## Change Order Pricing

| Change Type | Rate | Notes |
|-------------|------|-------|
| Minor (< 4 hours) | Billed at hourly rate | |
| Medium (4-16 hours) | 1.5× hourly rate | Overhead |
| Major (> 16 hours) | 2× hourly rate | Requires new estimate |
| Scope Change | New SOW | Full re-estimate |

---

## Notes

- All prices in USD
- Government rates include compliance overhead
- Estimates valid for 30 days
- 50% deposit required to start
- Net-30 payment terms
