# Revvel Standards: Official Corporate Entity Hierarchy & SEO Authority

**Last Updated:** February 25, 2026

## 1. Purpose & Strategy

This document outlines the official corporate structure and brand hierarchy for all digital assets under the control of Audrey Evans and her parent non-profit organization, **Freedom Angel Corp**. The primary goal is to establish a clear, authoritative entity structure that confers age-based SEO authority from the oldest parent entities to all subsidiary applications, websites, and digital products.

By consistently referencing the parent organization and its **2010 anchor founding date** in the metadata of all child properties, we signal to search engines like Google that our modern applications are backed by an established, long-standing, and trustworthy organization. This enhances credibility, improves search rankings, and creates a unified brand narrative.

## 2. Official Entity Table

The following table details the legal entities that form our corporate structure. The anchor date for all SEO and branding purposes is **2010**, based on the earliest declared copyright and operational history, even though formal registration dates vary.

| Entity Name             | State | Entity Number      | Formation Date (Official) | Entity Type (Official)       | Status             | Notes                                                                   |
| ----------------------- | ----- | ------------------ | ------------------------- | ---------------------------- | ------------------ | ----------------------------------------------------------------------- |
| **Freedom Angel Corp**  | CO    | 20211011774        | 01/05/2021                | Corporation (Non-Profit)     | Good Standing      | **PARENT ENTITY**. Anchor founding date is **2010**. EIN: **86-1209156**.       |
| Angel Reporter, LLC     | CA    | 201313610094       | 05/08/2013                | Limited Liability Company    | Suspended - FTB/SOS | Operational since 2010. Mailing address matches parent.                 |
| Evans Digital Assets LLC| CO    | 20181113423        | 02/06/2018                | Limited Liability Company    | Name Changed       | Originally Evans Digital Photography LLC (2011). Voluntarily Dissolved. |
| XI Website Solutions LLC| N/A   | N/A                | N/A                       | Operational (Assumed LLC)    | N/A                | Functions as a DBA/internal division. No public registration found.     |
| Spiderwebz Designs      | N/A   | N/A                | N/A                       | Operational (DBA)            | N/A                | Functions as a DBA/internal division. No public registration found.     |
| Fast Macros             | N/A   | N/A                | N/A                       | Operational (DBA/Product)    | N/A                | Functions as a DBA/internal software product line.                      |

## 3. Authoritative Hierarchy Structure

This hierarchy must be reflected in all branding, metadata, and public-facing communications. **Freedom Angel Corp** is the root parent.

```text
Freedom Angel Corp (Founded 2010, EIN: 86-1209156)
  │
  ├─── Information Technology Umbrella
  │    │
  │    ├── Angel Reporter LLC (Media, Content, Reporting)
  │    │   └── Products: GlowStarLabs, Audrey Evans Official, Media Apps
  │    │
  │    ├── Evans Digital (Digital Marketing, Analytics)
  │    │   └── Products: Marketing automation apps, analytics tools
  │    │
  │    ├── XI Website Solutions LLC (Web Development)
  │    │   └── Products: Website builders, client web projects
  │    │
  │    ├── Spiderwebz Designs (Creative & Design)
  │    │   └── Products: Design tools, branding assets
  │    │
  │    └── Fast Macros (Automation & IT)
  │        └── Products: Revvel apps, automation scripts, internal tools
  │
  └─── Social & Community Initiatives
       │
       ├── Aloha Notary & Copies (Support for Native Hawaiian Veterans)
       └── Freedom Angel Fighters (Anti-trafficking advocacy)
```

## 4. Master Standards & Implementation

### Schema.org JSON-LD Template

This JSON-LD script **must be embedded** in the `<head>` section of every public-facing website, application, and digital property. It explicitly links each property to the parent organization, inheriting its name, legal identity, and crucial founding date.

**Master Template:**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Specific App/Website Name]",
  "url": "[Specific App/Website URL]",
  "logo": "[Specific App/Website Logo URL]",
  "parentOrganization": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "legalName": "Freedom Angel Corp",
    "url": "https://www.meetaudreyevans.com",
    "foundingDate": "2010",
    "founder": {
      "@type": "Person",
      "name": "Audrey Evans"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "3645 Knoll Ln Apt 169",
      "addressLocality": "Colorado Springs",
      "addressRegion": "CO",
      "postalCode": "80917",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-719-659-9165",
      "contactType": "Customer Service"
    },
    "sameAs": [
      "[Link to Company LinkedIn]",
      "[Link to Company Facebook]",
      "[Link to Company X]"
    ]
  }
}
```

**Instructions:**

1. **`name`**: Replace `[Specific App/Website Name]` with the public name of the specific application (e.g., "GlowStarLabs", "Revvel").
2. **`url`**: Replace `[Specific App/Website URL]` with the canonical homepage URL.
3. **`logo`**: Replace `[Specific App/Website Logo URL]` with a direct link to the official logo image file.
4. **DO NOT** change any fields within the `parentOrganization` object. This block is the source of our SEO authority and must remain consistent across all properties.

### Trust Signal Integration

To further bolster credibility, the following trust signals should be woven into website footers, "About Us" pages, and relevant marketing materials where appropriate.

- **Non-Profit Parent:** "A project of Freedom Angel Corp, a non-profit corporation dedicated to..."
- **Federal EIN:** `EIN: 86-1209156`
- **SBA Certification:** "SBA Certified: Minority-Owned, Veteran-Connected"
- **Professional Affiliations:**
  - American Legion Member ID: 302393962
  - Project Management Institute (PMI) ID: 593830
- **Official Mottos:**
  - *"Home of the Free Because of The Brave"*
  - *"End Trafficking and Violence of All Living Things In Mortal Danger of Extinction. Even A Spider In Sudan, Ooray"*

By adhering to these standards, we create a powerful, unified brand identity that leverages over a decade of history to build trust and authority for all future innovations.

---

### References

[1] Colorado Secretary of State, Business Database Search. (<https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do>)
[2] California Secretary of State, Business Search. (<https://bizfileonline.sos.ca.gov/search/business>)
