# Business Audit & Naming System Standard

> **Status:** Active
> **Last Updated:** 2026-04-25
> **Domain:** Business Discovery / Repository Auditing / Naming Standards

---

## Executive Summary

This standard defines the framework for auditing business entities, repositories, and resources. It establishes naming conventions, discovery protocols, and classification systems for multi-entity business portfolios.

---

## Domain Classification

| Category | Value |
|----------|-------|
| **Domain** | Business Intelligence |
| **Sub-domain** | Entity Discovery & Audit |
| **Use Case** | Multi-entity portfolio management |
| **Complexity** | Medium |

---

## Discovery Protocol

### 1. Repository Discovery

For each business entity, discover and document:

```text
┌─────────────────────────────────────────────────────────────┐
│              ENTITY DISCOVERY CHECKLIST                       │
├─────────────────────────────────────────────────────────────┤
│  □ GitHub repositories                                      │
│  □ Business registrations (state/federal)                   │
│  □ Domain registrations                                    │
│  □ Email accounts                                          │
│  □ Bank accounts                                           │
│  □ Merchant accounts                                       │
│  □ API keys and credentials                                 │
│  □ Domain names (DNS)                                      │
│  □ Social media accounts                                   │
│  □ Trademark filings                                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. Naming Convention

| Resource Type | Pattern | Example |
|--------------|---------|---------|
| GitHub Repo | `{business}-{type}-{name}` | `freedoman gel-reviews-frontend` |
| Domain | `{business}.{tld}` | `freedoman gelcorp.com` |
| Email | `{role}@{business}.{tld}` | `admin@freedoman gelcorp.com` |
| AWS Resource | `{business}-{env}-{resource}` | `freedoman gel-prod-ec2` |

### 3. Entity Classification Matrix

| Entity Type | Tax Classification | Risk Level | Compliance |
|-------------|------------------|------------|------------|
| LLC - Partnership | Partnership | Low | Annual report |
| S-Corp | S-Corp | Medium | 1120-S, salary |
| C-Corp | C-Corp | High | 1120, double tax |
| Sole Proprietorship | Schedule C | Low | Simple |

---

## Audit Protocol

### Monthly Audit Checklist

- [ ] Verify all entities in good standing
- [ ] Check domain expirations
- [ ] Review bank account access
- [ ] Update credential rotations
- [ ] Confirm compliance filings
- [ ] Validate insurance coverage

### Annual Audit Requirements

| Audit | Due | Performed |
|-------|-----|-----------|
| Tax returns | Nov 15 | [ ] |
| Secretary of State | March | [ ] |
| Business license | Varies | [ ] |
| Insurance renewal | Policy date | [ ] |
| Medicaid redetermination | Annual | [ ] |

---

## Naming Authority

### Business Name Registry

| Business | Legal Name | DBA | Entity Type | State |
|----------|------------|-----|------------|-------|
| Freedom Angel | Freedom Angel Holdings LLC | - | LLC | CO |
| Reese Reviews | Reese Reviews LLC | - | LLC | CO |
| Overflow | Overflow LLC | - | LLC | CO |
| Rental Co | [TBD] LLC | - | LLC | CO |
| Fidelity Trust | Fidelity Trust Services LLC | - | LLC | CO |

---

## Domain Discovery

### Known Domains

| Domain | Registrar | Expires | DNS |
|--------|-----------|---------|-----|
| freedoman gelcorp.com | | | |
| reesereviews.com | | | |
| fidelitytrust.services | | | |

---

## Credential Inventory

| Credential | Service | Last Rotated | Notes |
|------------|---------|--------------|-------|
| GitHub | midnghtsapphire | - | Primary org |
| AWS | | | |
| Google Workspace | | | |
| Odoo | | | |
| QuickBooks | | | |

---

## Integration Points

| System | Purpose |
|--------|---------|
| GitHub API | Repository discovery |
| WHOIS | Domain research |
| Google DNS | DNS enumeration |
| State SOS API | Entity verification |

---

## Related Standards

- `MULTI_ENTITY_TAX_OPTIMIZATION.md` - Tax structure
- `SECURITY.md` - Credential management
- `MONITORING.md` - Compliance tracking

---

*Standard maintained by revvel-standards*
*Last updated: 2026-04-25*
