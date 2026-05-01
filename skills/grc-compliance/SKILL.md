# GRC Compliance Skill

Expert-level Governance, Risk, and Compliance (GRC) guidance for nine major regulatory frameworks, powered by the Claude Code plugin marketplace at [`midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance) (fork of [`Sushegaad/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/Sushegaad/Claude-Skills-Governance-Risk-and-Compliance)).

## Role & Mission

Operate as an expert GRC advisor with deep knowledge across all nine supported compliance frameworks:

- **ISO 27001:2022** — Information Security Management System (ISMS): gap analysis, Annex A controls, SoA, risk registers, 2013→2022 transition
- **SOC 2** — Trust Services Criteria (AICPA 2017 + 2022 revised): gap analysis, policy drafting, audit evidence, vendor risk, Type 1 / Type 2
- **FedRAMP** — Federal Risk and Authorization Management Program: ATO lifecycle, SSP/POA&M/SAR, NIST 800-53 Rev 5, OSCAL, ConMon
- **GDPR / UK GDPR** — Code audits, Privacy Notices, DPAs, DPIAs, data flow reviews, article-cited Q&A, Schrems II
- **HIPAA** — Privacy Rule, Security Rule, Breach Notification Rule: document generation, ePHI safeguards, breach response
- **NIST CSF 2.0** — Six functions (Govern, Identify, Protect, Detect, Respond, Recover): gap assessments, organisational profiles, implementation tiers, cross-framework mapping
- **PCI DSS v4.0.1** — CDE scoping, SAQ selection, gap assessments, v3.2.1→v4.0.1 migration, QSA audit prep
- **TSA Cybersecurity Directives** — Pipeline, freight rail, transit OT/ICS: CIP/COIP, IRP, ADR, CAP, incident reporting
- **ISO 42001:2023** — AI Management System: AISIA, AI risk assessment, SoA, certification readiness

Benchmarked at **94% ± 10%** accuracy across 18 test cases (2 per framework), each graded against 4–5 verifiable assertions by independent agents (vs. 72% ± 28% baseline).

## How to Invoke the GRC Skills Marketplace

### One-time setup (adds the marketplace in Claude Code)

```shell
/plugin marketplace add midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance
```

### Install individual skills

```shell
/plugin install iso27001@grc-skills
/plugin install soc2@grc-skills
/plugin install fedramp@grc-skills
/plugin install gdpr-compliance@grc-skills
/plugin install hipaa-compliance@grc-skills
/plugin install nist-csf@grc-skills
/plugin install pci-compliance@grc-skills
/plugin install tsa-compliance@grc-skills
/plugin install iso42001@grc-skills
```

### Install all nine at once

```shell
/plugin install iso27001@grc-skills soc2@grc-skills fedramp@grc-skills gdpr-compliance@grc-skills hipaa-compliance@grc-skills nist-csf@grc-skills pci-compliance@grc-skills tsa-compliance@grc-skills iso42001@grc-skills
```

### Team auto-install (commit to `.claude/settings.json`)

```json
{
  "extraKnownMarketplaces": {
    "grc-skills": {
      "source": {
        "source": "github",
        "repo": "midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance"
      }
    }
  },
  "enabledPlugins": {
    "iso27001@grc-skills": true,
    "soc2@grc-skills": true,
    "fedramp@grc-skills": true,
    "gdpr-compliance@grc-skills": true,
    "hipaa-compliance@grc-skills": true,
    "nist-csf@grc-skills": true,
    "pci-compliance@grc-skills": true,
    "tsa-compliance@grc-skills": true,
    "iso42001@grc-skills": true
  }
}
```

## Skill Capabilities by Framework

### 🔐 ISO 27001 (`iso27001@grc-skills`)

- Gap analysis against mandatory clauses 4–10 and all 93 Annex A controls (2022) / 114 controls (2013)
- Complete, audit-ready policy documents with document control blocks
- Step-by-step control implementation guidance for any Annex A control
- Risk registers and risk treatment plans (likelihood × impact)
- Statement of Applicability (SoA) templates

**Trigger phrases:** `ISO 27001`, `ISMS`, `Annex A`, `Statement of Applicability`, `SoA`, `gap analysis`, `risk register`, `certification readiness`, `internal audit`

### ✅ SOC 2 (`soc2@grc-skills`)

- Gap analyses across all 5 TSC: Security (CC1–CC9), Availability (A1), Confidentiality (C1), Processing Integrity (PI1), Privacy (P1–P8)
- All 12 core SOC 2 policies drafted to audit-ready format
- Evidence checklists mapped to each criterion with Type 1/Type 2 sampling guidance
- Vendor risk: tiering, 32-question security questionnaires, CUEC tracking

**Trigger phrases:** `SOC 2`, `Trust Services Criteria`, `TSC`, `AICPA`, `audit readiness`, `control statement`, `Type 1`, `Type 2`

### 🏛️ FedRAMP (`fedramp@grc-skills`)

- Readiness and gap assessments using 75+ item checklist across 14 security domains
- ATO documentation: SSP, POA&M, SAP, SAR, appendices A–Q
- NIST 800-53 Rev 5 control mapping across all 20 families
- Cloud architecture guidance for AWS GovCloud, Azure Government, Google Cloud Government
- ConMon obligations: monthly deliverables, POA&M SLA, OSCAL readiness

**Trigger phrases:** `FedRAMP`, `ATO`, `SSP`, `POA&M`, `3PAO`, `NIST 800-53`, `ConMon`, `OSCAL`, `impact level`

### 🇪🇺 GDPR (`gdpr-compliance@grc-skills`)

- Code, API, database schema, and architecture audits for GDPR violations (🔴/🟡/🟢 severity)
- Compliance document drafting: Privacy Notices, DPAs, Cookie Banners, DPIAs, Data Subject Rights Procedures
- Every response leads with the governing GDPR article, then exceptions, then practical implications
- Data flow reviews: what, why, where, who, how long, how protected

**Trigger phrases:** `GDPR`, `data protection`, `personal data`, `DPA`, `DPIA`, `lawful basis`, `data subject rights`, `consent`, `RoPA`, `Schrems II`, `ICO`, `EDPB`

### 🏥 HIPAA (`hipaa-compliance@grc-skills`)

- Compliance reviews of documents, systems, and architectures with CFR citations
- Nine document templates: NPP, BAA, Authorization Forms, Workforce Training, Security Incident Reports, Risk Analysis
- Technical safeguards for AWS/Azure/GCP, FHIR APIs, mobile/BYOD, DevOps pipelines
- All 54 Security Rule implementation specifications (Required and Addressable)
- Breach response: 4-factor risk assessment, HHS reporting timelines

**Trigger phrases:** `HIPAA`, `PHI`, `ePHI`, `covered entity`, `business associate`, `BAA`, `NPP`, `breach notification`, `Privacy Rule`, `Security Rule`

### 🛡️ NIST CSF (`nist-csf@grc-skills`)

- Gap assessments across all 6 CSF 2.0 functions, categories, and subcategories
- Organisational Profiles (Current and Target) aligned to business context and risk tolerance
- Implementation Tiers (1–4) assessment and advancement guidance
- Cross-framework mappings: NIST SP 800-53, ISO 27001:2022, CIS Controls v8
- CSF 1.1 → CSF 2.0 migration checklist

**Trigger phrases:** `NIST CSF`, `Cybersecurity Framework`, `CSF 2.0`, `Govern function`, `implementation tiers`, `cybersecurity profile`

### 💳 PCI DSS (`pci-compliance@grc-skills`)

- CDE scoping and network segmentation assessment
- SAQ type selection: A, A-EP, B, B-IP, C, C-VT, P2PE, D
- Gap assessments across all 12 PCI DSS requirements with QSA evidence requirements
- v3.2.1 → v4.0.1 migration: MFA expansion, Req 6.4.3 (payment page scripts), Req 5.4.1, Req 10.4.1.1
- Defined vs Customised Approach, Targeted Risk Analysis (TRA)

**Trigger phrases:** `PCI DSS`, `cardholder data`, `CDE`, `SAQ`, `ROC`, `QSA`, `ASV scan`, `PAN`, `tokenisation`, `P2PE`, `merchant level`

### ✈️ TSA Cybersecurity (`tsa-compliance@grc-skills`)

- Critical infrastructure OT/ICS cybersecurity: pipeline, freight rail, transit sectors
- Cybersecurity Implementation Plan (CIP), Cybersecurity Operations Implementation Plan (COIP)
- Incident Response Plan (IRP), Architecture Design Review (ADR), Cybersecurity Assessment Plan (CAP)
- TSA Security Directive requirements and NPRM guidance

**Trigger phrases:** `TSA cybersecurity`, `pipeline cybersecurity`, `freight rail`, `transit OT/ICS`, `CIP`, `IRP`, `security directive`, `NPRM`

### 🤖 ISO 42001 (`iso42001@grc-skills`)

- AI Management System gap analysis against ISO/IEC 42001:2023
- AI System Impact Assessment (AISIA) and AI risk assessment
- Statement of Applicability and policy generation
- Certification readiness roadmap

**Trigger phrases:** `ISO 42001`, `AI management system`, `AISIA`, `AI governance`, `AI risk`, `AI certification`

## When to Load This Skill

Load `grc-compliance` when any of the following arise:

- A project or client needs to achieve compliance with any of the 9 supported frameworks
- Writing security policies, privacy notices, data protection agreements, or audit documentation
- Conducting gap assessments or risk assessments for regulated environments
- Scoping a compliance program for a new product or service
- Responding to an audit, questionnaire, or regulatory inquiry
- Building or reviewing systems that handle ePHI, PII, cardholder data, or federal data
- Evaluating AI systems against emerging AI governance standards (ISO 42001)

## Integration

- **security** skill: Use alongside for OWASP, secrets management, and technical security controls
- **vault-agent** skill: Use for secrets rotation before hardening compliance scope
- **ada-compliance-agent** skill: Complement for accessibility compliance (ADA/WCAG)
- **tax-legal-agent** skill: Complement for legal questions around HIPAA BAAs, GDPR DPAs, or contractual obligations

## Source Repository

- **Fork:** [`midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance)
- **Upstream:** [`Sushegaad/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/Sushegaad/Claude-Skills-Governance-Risk-and-Compliance)
- **Version:** v0.3.0
- **License:** MIT
