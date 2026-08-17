# Skill: Grant Management Agent

**Skill Name:** `grant-mgmt-agent`
**Version:** 1.0.0
**Date:** April 30, 2026
**Status:** Stable
**Category:** Automation & Finance
**LLM:** Claude Sonnet 4.5 (proposal writing), Claude Opus 4 (research & compliance), Claude Haiku 4.5 (tracking & notifications)
**Type:** Long-running (cron-driven automation with ephemeral sessions per grant)
**Persona:** 🔍 Scout (discovery & research)

---

## Purpose

The **Grant Management Agent** provides end-to-end automation for grant discovery, proposal writing, application submission, tracking, and compliance reporting. It integrates best-in-class tools for each stage of the grant lifecycle, leveraging OpenRouter for AI-powered proposal writing, workflow automation platforms for orchestration, and modern databases for tracking and audit trails.

This skill automates the complete grant management pipeline from discovery through award and compliance, reducing manual work by 80%+ while maintaining high-quality applications and full audit compliance.

---

## What This Skill Does

| Stage | Action | Tools Used |
|---|---|---|
| **Discovery** | Automated daily search for matching grant opportunities | Instrumentl API, Grants.gov API, SAM.gov API |
| **Eligibility** | Validate organization eligibility and compliance status | SAM.gov Entity API, automated compliance checks |
| **Research** | Deep analysis of RFP requirements, funder priorities, competitive landscape | OpenRouter (Claude Opus 4), web research APIs |
| **Proposal Writing** | AI-assisted proposal generation with human-in-loop review | OpenRouter (Claude Sonnet 4.5), structured prompts |
| **Document Automation** | Auto-fill standardized forms and attachments | DocSpring, Anvil, doqs.dev PDF APIs |
| **Submission** | Submit applications via API or generate submission-ready packages | Grants.gov API, platform-specific APIs |
| **Tracking** | Centralized tracking of all applications, deadlines, and requirements | Airtable/Supabase database with automated updates |
| **Workflow Orchestration** | Coordinate all stages with automated notifications and approvals | n8n, Zapier, Make workflows |
| **Compliance & Reporting** | Track milestones, expenses, and generate compliance reports | Automated report generation, expense tracking |
| **Analytics** | Success rate analysis, ROI tracking, continuous improvement | Dashboard with metrics and insights |

---

## Trigger Keywords

```text
grant management, grant automation, grant discovery, grant proposal,
instrumentl, grants.gov, sam.gov, grant tracking, proposal writing,
grant application, grant pipeline, grant workflow, grant compliance,
grant reporting, rfp automation, proposal automation, grant ai
```

---

## Complete Grant Management Stack

### 1. Grant Discovery Layer

**Primary: Instrumentl API**
- Automated daily searches based on organization profile
- Match scoring based on eligibility, award size, and mission fit
- Real-time notifications for new opportunities
- Integration via REST API or webhook automation

**Secondary: Grants.gov API**
- Direct access to federal grant opportunities
- Advanced search with filters (keywords, agency, eligibility)
- Opportunity details extraction and parsing
- API endpoint: `GET /rest/opportunities/search`

**Tertiary: SAM.gov API**
- Organization registration validation
- Compliance status monitoring
- UEI/DUNS verification
- API endpoint: `GET /entity-information/v2/entities`

**Workflow:**
```javascript
// Daily grant discovery automation
1. Query Instrumentl for new matches
2. Cross-reference with Grants.gov for federal opportunities
3. Validate organization eligibility via SAM.gov
4. Score and rank opportunities by fit score
5. Store in grants database with status: "discovered"
6. Notify team of high-priority matches
```

---

### 2. AI-Powered Proposal Writing

**OpenRouter Integration** for multi-model LLM access:

**Model Selection Strategy:**
- **Claude Sonnet 4.5** — Primary proposal drafting (balanced cost/quality)
- **Claude Opus 4** — Complex technical sections, innovation narratives
- **GPT-5.4** — Alternative for specific writing styles
- **Claude Haiku 4.5** — Quick summaries, boilerplate sections

**Proposal Writing Workflow:**

```javascript
// OpenRouter API pattern
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/midnghtsapphire",
    "X-Title": "Revvel Grant Management Agent"
  }
});

async function generateProposalSection({ rfp, section, orgData, model }) {
  const systemPrompt = `You are an expert grant proposal writer with 20+ years 
of experience securing funding from federal agencies, foundations, and corporate 
funders. You write compelling, evidence-based narratives that align with funder 
priorities while showcasing the applicant organization's unique strengths.`;

  const userPrompt = `
RFP Section: ${section}
Requirements: ${rfp.requirements[section]}
Evaluation Criteria: ${rfp.criteria[section]}
Organization Background: ${orgData.background}
Previous Successes: ${orgData.track_record}

Write a ${section} section that:
1. Directly addresses all stated requirements
2. Demonstrates deep understanding of the problem
3. Showcases our unique qualifications and approach
4. Provides concrete, measurable outcomes
5. Aligns with funder's mission and priorities

Length: ${rfp.limits[section]} words
Tone: ${rfp.tone || 'professional, confident, evidence-based'}
`;

  const response = await openrouter.chat.completions.create({
    model: model || "anthropic/claude-sonnet-4.5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 4000
  });

  return response.choices[0].message.content;
}
```

**Prompt Engineering Best Practices:**

1. **Structured Input Templates:**
   - Parse RFP requirements into structured fields
   - Provide clear context on funder priorities
   - Include organization's track record and data
   - Specify exact formatting requirements

2. **Section-by-Section Generation:**
   - Executive Summary
   - Problem Statement / Need
   - Goals & Objectives
   - Methodology / Approach
   - Evaluation Plan
   - Organizational Capacity
   - Budget Narrative
   - Sustainability Plan

3. **Human-in-the-Loop Review:**
   - AI drafts, human reviews and edits
   - Iterative refinement with feedback loops
   - Final approval by domain expert
   - Plagiarism check on all AI-generated content

4. **Quality Assurance:**
   - Requirement compliance checklist
   - Word count validation
   - Citation and reference verification
   - Consistency across all sections
   - Tone and style alignment

---

### 3. Document Automation & Form Filling

**PDF Form Automation Options:**

**Recommended: DocSpring API**
- Visual template editor for mapping fields
- JSON-based data input
- Fast rendering (seconds per document)
- Webhook support for async processing

```javascript
// DocSpring integration example
const docspring = require('docspring');

const client = new docspring.Client(process.env.DOCSPRING_API_TOKEN);

async function fillGrantForm(templateId, applicationData) {
  const submission = await client.generatePDF(templateId, {
    data: {
      organization_name: applicationData.org.name,
      ein: applicationData.org.ein,
      contact_name: applicationData.contact.name,
      contact_email: applicationData.contact.email,
      project_title: applicationData.project.title,
      amount_requested: applicationData.budget.total,
      // ... map all form fields
    }
  });

  return submission.download_url;
}
```

**Alternatives:**
- **Anvil** — Best for rapid template setup with Document AI
- **doqs.dev** — Free tier, simple API
- **Instafill.ai** — AI-powered bulk form filling
- **Open Source:** Apache PDFBox (Java) or pdf-lib (Node.js)

---

### 4. Workflow Automation

**Recommended: n8n (Self-Hosted)**

Benefits:
- Open source, self-hosted (data privacy)
- Visual workflow builder
- 350+ integrations
- Custom code nodes for complex logic
- Webhook triggers and actions

**n8n Grant Management Workflow:**

```yaml
# Grant Application Pipeline Workflow
name: Grant Application Automation
trigger:
  type: webhook
  path: /grant/new-opportunity
  
nodes:
  - name: Parse Opportunity Data
    type: Code
    code: |
      const opportunity = $input.item.json;
      return {
        grant_id: opportunity.id,
        funder: opportunity.funder,
        deadline: opportunity.deadline,
        amount: opportunity.amount,
        eligibility: opportunity.eligibility
      };
  
  - name: Check Eligibility
    type: HTTP Request
    url: https://api.sam.gov/entity-information/v2/entities
    params:
      uei: ${process.env.ORGANIZATION_UEI}
  
  - name: Store in Database
    type: Supabase
    operation: insert
    table: grant_opportunities
  
  - name: Notify Team
    type: Slack
    message: |
      🎯 New Grant Opportunity
      Funder: {{$node.Parse.funder}}
      Amount: ${{$node.Parse.amount}}
      Deadline: {{$node.Parse.deadline}}
      
      Review in dashboard: {{$node.Store.dashboard_url}}
  
  - name: Auto-Generate Brief
    type: HTTP Request
    url: https://openrouter.ai/api/v1/chat/completions
    body: |
      {
        "model": "anthropic/claude-haiku-4.5",
        "messages": [...]
      }
```

**Alternative: Zapier** (Faster setup, no self-hosting)
- Pre-built templates for common workflows
- Easier for non-technical users
- Higher cost at scale

**Alternative: Make (Integromat)** (Visual + Advanced)
- Advanced data transformation
- Good for complex multi-step workflows
- Fair pricing

---

### 5. Tracking & Database

**Recommended: Supabase (PostgreSQL)**

**Database Schema:**

```sql
-- Core tables for grant management

-- Organizations table (if managing multiple)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ein TEXT UNIQUE,
  uei TEXT UNIQUE,
  sam_status TEXT,
  sam_expiration DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funding sources
CREATE TABLE funding_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT, -- federal, foundation, corporate
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant opportunities
CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE, -- ID from Instrumentl/Grants.gov
  funding_source_id UUID REFERENCES funding_sources(id),
  title TEXT NOT NULL,
  description TEXT,
  amount_min DECIMAL,
  amount_max DECIMAL,
  deadline DATE NOT NULL,
  eligibility TEXT[],
  priority_areas TEXT[],
  requirements JSONB,
  discovered_date DATE DEFAULT CURRENT_DATE,
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  status TEXT DEFAULT 'discovered', -- discovered, reviewing, applying, submitted, awarded, declined
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES grant_opportunities(id),
  organization_id UUID REFERENCES organizations(id),
  amount_requested DECIMAL NOT NULL,
  amount_awarded DECIMAL,
  submission_date DATE,
  decision_date DATE,
  status TEXT DEFAULT 'drafting', -- drafting, in_review, submitted, under_review, awarded, declined
  proposal_version INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposal sections (for version control)
CREATE TABLE proposal_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id),
  section_name TEXT NOT NULL,
  content TEXT,
  word_count INTEGER,
  generated_by TEXT, -- 'ai', 'human', 'hybrid'
  model_used TEXT, -- e.g., 'claude-sonnet-4.5'
  version INTEGER DEFAULT 1,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones & deliverables (for awarded grants)
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id),
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, overdue
  deliverable_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses (for budget tracking)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL, -- personnel, supplies, travel, etc.
  description TEXT,
  amount DECIMAL NOT NULL,
  receipt_url TEXT,
  approved BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance reports
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id),
  report_type TEXT NOT NULL, -- interim, final, financial
  due_date DATE NOT NULL,
  submission_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, submitted, approved
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- insert, update, delete
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_opportunities_deadline ON grant_opportunities(deadline);
CREATE INDEX idx_opportunities_status ON grant_opportunities(status);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Row-level security
ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
-- Add RLS policies based on organization

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to key tables
CREATE TRIGGER applications_audit
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Alternative: Airtable** (No-code option)

Benefits:
- No SQL knowledge required
- Built-in forms and views
- Native automation features
- Mobile app access

Schema similar to above but using Airtable's linked records instead of foreign keys.

---

### 6. API Integration Examples

**Grants.gov API Integration:**

```javascript
// Grants.gov opportunity search
async function searchGrantsGov(criteria) {
  const response = await fetch(
    `https://www.grants.gov/rest/opportunities/search?` +
    new URLSearchParams({
      keyword: criteria.keywords,
      fundingAgency: criteria.agency,
      eligibility: criteria.eligibility,
      limit: 100
    }),
    {
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.opportunities.map(opp => ({
    id: opp.id,
    title: opp.title,
    agency: opp.agency,
    amount: opp.awardFloor + '-' + opp.awardCeiling,
    deadline: opp.closeDate,
    url: opp.url
  }));
}
```

**SAM.gov Entity Validation:**

```javascript
// Validate organization in SAM.gov
async function validateSAMEntity(uei) {
  const response = await fetch(
    `https://api.sam.gov/entity-information/v2/entities?uei=${uei}`,
    {
      headers: {
        'X-Api-Key': process.env.SAM_API_KEY
      }
    }
  );

  const data = await response.json();
  const entity = data.entityData[0];

  return {
    registered: entity.registrationStatus === 'Active',
    expirationDate: entity.registrationExpirationDate,
    legalName: entity.legalBusinessName,
    physicalAddress: entity.physicalAddress,
    entityType: entity.entityTypes,
    delinquentFederalDebt: entity.hasDelinquentFederalDebt === 'Y'
  };
}
```

**Instrumentl Integration (Conceptual - API availability varies):**

```javascript
// Instrumentl grant matching
async function searchInstrumentl(profile) {
  // Note: Instrumentl API may require enterprise plan
  const response = await fetch(
    'https://api.instrumentl.com/v1/grants/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.INSTRUMENTL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationType: profile.type,
        focusAreas: profile.focusAreas,
        location: profile.location,
        budgetRange: profile.budgetRange
      })
    }
  );

  return await response.json();
}
```

---

## Workflow Orchestration Patterns

### Daily Discovery Automation

```text
Schedule: Every day at 8 AM
1. Run Instrumentl search
2. Run Grants.gov search
3. Merge and deduplicate results
4. Score each opportunity
5. Store new opportunities in database
6. Send digest to team
```

### Application Pipeline

```text
Trigger: New opportunity marked "apply"
1. Fetch RFP requirements
2. Validate eligibility with SAM.gov
3. Create application record
4. Generate initial brief (AI)
5. Notify team for review
6. Human approves brief
7. Generate proposal sections (AI)
8. Human reviews and edits
9. Generate PDF forms
10. Package submission
11. Submit via API or manual upload
12. Update status to "submitted"
13. Set follow-up reminders
```

### Compliance Tracking

```text
Schedule: Weekly
1. Check all active grants
2. Identify upcoming milestones
3. Check overdue deliverables
4. Send reminders
5. Generate compliance report draft
6. Notify grant manager
```

---

## Environment Configuration

**Required Environment Variables:**

```bash
# OpenRouter (AI proposal writing)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Grants.gov (federal opportunities)
GRANTS_GOV_API_URL=https://www.grants.gov/rest

# SAM.gov (entity validation)
SAM_API_KEY=...
SAM_API_URL=https://api.sam.gov

# Instrumentl (grant discovery)
INSTRUMENTL_API_KEY=...

# Document automation
DOCSPRING_API_TOKEN=...
# OR
ANVIL_API_KEY=...

# Database
DATABASE_URL=postgresql://...
# OR
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=...

# Workflow automation
N8N_WEBHOOK_URL=...
# OR
ZAPIER_WEBHOOK_URL=...

# Notifications
SLACK_WEBHOOK_URL=...
EMAIL_SMTP_HOST=...
EMAIL_SMTP_USER=...
EMAIL_SMTP_PASSWORD=...

# Organization info
ORGANIZATION_NAME=...
ORGANIZATION_UEI=...
ORGANIZATION_EIN=...
```

**Vault Configuration:**

```bash
# Store in HashiCorp Vault or use vault-agent skill
vault kv put revvel/shared/grant-mgmt \
  openrouter_api_key="sk-or-v1-..." \
  sam_api_key="..." \
  instrumentl_api_key="..." \
  docspring_api_token="..." \
  database_url="postgresql://..."
```

---

## Security & Compliance

### Data Protection

1. **Sensitive Information Handling:**
   - Never send PII/EIN/financial data to public LLM APIs
   - Use RLS in Supabase to isolate organization data
   - Encrypt sensitive fields at rest
   - Audit all access to sensitive tables

2. **API Key Security:**
   - Store all keys in vault
   - Rotate keys quarterly
   - Use minimal permissions per key
   - Monitor API usage for anomalies

3. **Document Security:**
   - Encrypt PDFs before storage
   - Use signed URLs with expiration
   - Audit document access
   - Automatic retention policy compliance

### Audit Trail

- All database changes logged in `audit_log` table
- Workflow execution logs retained for 2 years
- AI generation metadata tracked (model, timestamp, prompts)
- Human review sign-offs recorded

### Compliance Requirements

- **Federal grants:** SAM.gov registration must be active
- **Privacy:** GDPR/CCPA compliance for applicant data
- **Financial:** Accurate expense tracking and reporting
- **Reporting:** Automated compliance report generation

---

## Cost Optimization

### LLM Model Selection

```javascript
// Use appropriate model for each task
const modelStrategy = {
  quickSummary: "anthropic/claude-haiku-4.5",      // $0.25/$1.25 per MTok
  proposalDraft: "anthropic/claude-sonnet-4.5",   // $3/$15 per MTok
  complexSection: "anthropic/claude-opus-4",      // $15/$75 per MTok
  fallback: "openai/gpt-4.1"                      // $2.50/$10 per MTok
};

// Estimated costs per proposal
const estimatedCost = {
  briefGeneration: "$0.10",    // Haiku
  proposalSections: "$2-5",    // Sonnet (8-10 sections × ~2K tokens)
  reviewIterations: "$1-2",    // Additional refinements
  totalPerProposal: "$3-8"     // Full automation
};
```

### Workflow Automation

- **n8n (self-hosted):** $0/month + hosting (~$10-20/month)
- **Zapier:** $20-50/month (Starter-Professional plan)
- **Make:** $9-29/month (Core-Pro plan)

### Database

- **Supabase Free:** Up to 500MB database, 2GB bandwidth
- **Supabase Pro:** $25/month (8GB database, 50GB bandwidth)
- **Airtable Free:** 1,200 records per base
- **Airtable Plus:** $10/user/month (5,000 records per base)

### Document Automation

- **DocSpring:** $49/month (500 documents)
- **Anvil:** Pay per document (~$0.10-0.50 each)
- **doqs.dev:** Free tier + $0.02 per document

**Total Estimated Monthly Cost:** $50-150/month (excluding staff time)
**ROI:** Saves 20-40 hours/month of manual work

---

## Success Metrics

Track these KPIs in your analytics dashboard:

### Discovery Metrics
- Opportunities discovered per week
- Match quality score distribution
- Time from discovery to decision

### Application Metrics
- Applications submitted per month
- Average time to complete application
- Proposal quality scores
- Submission success rate

### Success Metrics
- Award rate (%)
- Total funding secured
- Average award size
- Cost per successful application

### Efficiency Metrics
- Hours saved vs. manual process
- AI-generated content vs. human-written
- Automation uptime %
- Error rate in submissions

### Compliance Metrics
- On-time deliverable rate
- Budget compliance %
- Report submission timeliness
- Audit findings (zero goal)

---

## Implementation Roadmap

> **📝 NOTE:** This roadmap describes multiple *future implementation phases* that would be executed as separate tasks/PRs. This is **planning documentation**, not instruction to implement incrementally. Per AGENTS.md, when an agent is assigned one of these phases as a task, it must deliver that phase completely—not propose sub-phases within it.

### Phase 1: Foundation (Week 1-2)
- [ ] Set up database (Supabase or Airtable)
- [ ] Configure OpenRouter API access
- [ ] Connect to Grants.gov API
- [ ] Set up basic workflow automation
- [ ] Create initial proposal templates

### Phase 2: Discovery & Tracking (Week 3-4)
- [ ] Implement daily grant discovery
- [ ] Build opportunity scoring algorithm
- [ ] Create team notification system
- [ ] Develop tracking dashboard
- [ ] Test discovery-to-tracking pipeline

### Phase 3: Proposal Automation (Week 5-6)
- [ ] Build AI proposal generation system
- [ ] Create section-by-section templates
- [ ] Implement human review workflow
- [ ] Add plagiarism detection
- [ ] Test with sample RFPs

### Phase 4: Submission & Docs (Week 7-8)
- [ ] Integrate document automation API
- [ ] Build form mapping templates
- [ ] Create submission package generator
- [ ] Test with actual grant applications
- [ ] Refine based on feedback

### Phase 5: Compliance & Reporting (Week 9-10)
- [ ] Build milestone tracking
- [ ] Create expense tracking workflow
- [ ] Automate compliance report generation
- [ ] Set up automated reminders
- [ ] Test full lifecycle with pilot grant

### Phase 6: Optimization (Week 11-12)
- [ ] Analyze success metrics
- [ ] Optimize AI prompts based on results
- [ ] Refine scoring algorithms
- [ ] Add advanced features (ML scoring, etc.)
- [ ] Document best practices

---

## Related Skills

- **`openrouter-swarms`** — Multi-agent LLM coordination for complex proposals
- **`vault-agent`** — Secure API key and credential management
- **`model-router`** — Intelligent LLM model selection for cost optimization
- **`gbrain`** — Store successful proposal patterns for future use
- **`wrap-up`** — Session completion and artifact publishing
- **`error-reporting`** — Monitoring and alerting for automation failures
- **`system-state`** — Track grant pipeline state across sessions

---

## Troubleshooting

### Common Issues

**Discovery not finding matches:**
- Verify API credentials are current
- Check organization profile completeness
- Review search criteria (may be too narrow)
- Confirm SAM.gov registration is active

**AI proposals low quality:**
- Provide more organizational context
- Use higher-quality model (Opus vs Sonnet)
- Increase temperature for creativity
- Add more examples to prompts
- Ensure RFP parsing is accurate

**Document automation errors:**
- Verify template field mappings
- Check for missing required data
- Validate data types and formats
- Test with sample data first

**Workflow failures:**
- Check webhook URLs are reachable
- Verify API rate limits not exceeded
- Review error logs in automation platform
- Test each step individually

**Database performance:**
- Add indexes on frequently queried columns
- Archive old opportunities quarterly
- Optimize query patterns
- Consider upgrading tier

---

## Best Practices

### Proposal Writing

1. **Always start with RFP analysis:**
   - Parse requirements into structured checklist
   - Identify evaluation criteria and weights
   - Research funder's priorities and past awards
   - Review successful proposals (if available)

2. **Provide rich context to AI:**
   - Organization mission and track record
   - Previous project outcomes with metrics
   - Team bios and qualifications
   - Specific project details and methodology

3. **Iterate with human feedback:**
   - First draft from AI
   - Expert review and edits
   - Regenerate problem areas
   - Final human polish and approval

4. **Maintain brand voice:**
   - Create organization-specific style guide
   - Include voice examples in prompts
   - Review for consistency across sections

### Automation Hygiene

1. **Monitor daily:**
   - Check discovery results for relevance
   - Review any failed workflows
   - Verify critical deadlines are tracked
   - Ensure notifications are delivered

2. **Regular maintenance:**
   - Update templates quarterly
   - Review and refine AI prompts
   - Archive completed grants
   - Audit compliance on active grants

3. **Continuous improvement:**
   - Track success rates by opportunity type
   - Analyze winning vs. losing proposals
   - Refine scoring algorithms with data
   - Document lessons learned

4. **Security posture:**
   - Rotate API keys quarterly
   - Review access logs monthly
   - Test backup/restore procedures
   - Update dependencies regularly

---

## Example Usage

### Quick Start Commands

```bash
# Initialize grant management system
grant-mgmt init --org "MyNonprofit" --uei "ABC123456"

# Run daily discovery
grant-mgmt discover --keywords "education,stem,youth"

# Start new application
grant-mgmt apply --opportunity-id "GRANTS-GOV-12345"

# Generate proposal section
grant-mgmt generate --application-id "app-001" --section "need-statement"

# Check compliance
grant-mgmt compliance --status

# Generate report
grant-mgmt report --type "quarterly" --output "reports/Q1-2026.pdf"
```

### API Usage

```javascript
const grantMgmt = require('@revvel/grant-mgmt-agent');

// Discover opportunities
const opportunities = await grantMgmt.discover({
  keywords: ['technology', 'education'],
  amountMin: 50000,
  deadline: '2026-12-31'
});

// Create application
const app = await grantMgmt.createApplication({
  opportunityId: opportunities[0].id,
  amountRequested: 100000
});

// Generate proposal
const proposal = await grantMgmt.generateProposal({
  applicationId: app.id,
  sections: ['need', 'approach', 'evaluation'],
  model: 'anthropic/claude-sonnet-4.5'
});

// Submit application
const submission = await grantMgmt.submit({
  applicationId: app.id,
  method: 'api' // or 'manual'
});
```

---

## Resources

### Official Documentation

- [Grants.gov API Docs](https://developer.grants.gov/)
- [SAM.gov API Docs](https://open.gsa.gov/api/sam/)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [DocSpring API Docs](https://docspring.com/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [Supabase Documentation](https://supabase.com/docs)

### Learning Resources

- [Federal Grant Writing Guide](https://www.grants.gov/learn-grants/grant-writing)
- [Foundation Grant Writing](https://candid.org/learn/knowledge-base/resources/grantwriting)
- [AI-Assisted Writing Best Practices](https://www.anthropic.com/index/prompting-long-form-content)

### Community

- [Grants.gov Community](https://www.grants.gov/community)
- [n8n Community Forum](https://community.n8n.io/)
- [OpenRouter Discord](https://discord.gg/openrouter)

---

## Changelog

### v1.0.0 (2026-04-30)
- Initial release
- Complete grant management automation stack
- Integration with Instrumentl, Grants.gov, SAM.gov
- OpenRouter-powered proposal writing
- n8n/Zapier/Make workflow templates
- Supabase/Airtable database schemas
- DocSpring document automation
- Comprehensive tracking and compliance

---

**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Maintainer:** @midnghtsapphire
**License:** Revvel Standards (SSOT)
**Last Updated:** 2026-04-30
