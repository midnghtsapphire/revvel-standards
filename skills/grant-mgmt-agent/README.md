# Grant Management Agent

**Version:** 1.0.0  
**Status:** Stable  
**Category:** Automation & Finance

Complete end-to-end automation for grant management, from discovery through compliance.

## Quick Links

- **[SKILL.md](./SKILL.md)** — Full skill documentation
- **[grant-mgmt-agent.skill.yml](./grant-mgmt-agent.skill.yml)** — Machine-readable configuration
- **[Templates](./templates/)** — Ready-to-use templates for database schemas, workflows, and prompts
- **[Examples](./examples/)** — Working integration examples

## What This Skill Does

Automates the complete grant lifecycle:

1. **Discovery** — Daily searches across Instrumentl, Grants.gov, SAM.gov
2. **Research** — AI-powered RFP analysis and competitive research
3. **Proposal Writing** — OpenRouter-powered section generation with human review
4. **Document Automation** — PDF form filling via DocSpring/Anvil
5. **Submission** — API-based or packaged submissions
6. **Tracking** — Centralized database (Supabase/Airtable)
7. **Workflow Orchestration** — n8n/Zapier/Make automation
8. **Compliance** — Milestone tracking and automated reporting

## Complete Stack

### Discovery
- **Instrumentl** — Grant opportunity matching
- **Grants.gov** — Federal grant opportunities
- **SAM.gov** — Entity validation and compliance

### AI & Proposal Writing
- **OpenRouter** — Multi-model LLM access
  - Claude Sonnet 4.5 (drafting)
  - Claude Opus 4 (research, complex sections)
  - Claude Haiku 4.5 (summaries, tracking)

### Document Automation
- **DocSpring** — PDF form filling (recommended)
- **Anvil** — Alternative with Document AI
- **doqs.dev** — Free tier option

### Workflow Automation
- **n8n** — Self-hosted workflow builder (recommended)
- **Zapier** — No-code automation
- **Make** — Visual workflow automation

### Database & Tracking
- **Supabase** — PostgreSQL with REST API (recommended)
- **Airtable** — No-code database alternative

## Quick Start

### 1. Set Up Environment

```bash
# Required secrets
export OPENROUTER_API_KEY="sk-or-v1-..."
export SAM_API_KEY="..."
export DATABASE_URL="postgresql://..."
export N8N_WEBHOOK_URL="..."

# Organization info
export ORGANIZATION_UEI="..."
export ORGANIZATION_EIN="..."
```

### 2. Initialize Database

```bash
# Using Supabase
psql $DATABASE_URL < templates/database-schemas/supabase-schema.sql
```

### 3. Run Daily Discovery

```bash
node examples/grants-gov-integration.js
```

### 4. Generate Proposal Section

```bash
node examples/openrouter-proposals.js
```

## Cost Breakdown

### Monthly Costs
- **LLM (OpenRouter):** $3-8 per proposal
- **Workflow Automation:** $10-50/month (n8n hosting or Zapier/Make)
- **Database:** $0-25/month (Supabase/Airtable)
- **Document Automation:** $49/month or pay-per-doc
- **Total:** ~$50-150/month

### ROI
- **Time Saved:** 20-40 hours per month
- **Applications:** 3-5x more proposals submitted
- **Quality:** Consistent, high-quality proposals

## Implementation Timeline

- **Week 1-2:** Foundation (database, APIs, templates)
- **Week 3-4:** Discovery & tracking
- **Week 5-6:** Proposal automation
- **Week 7-8:** Submission & documents
- **Week 9-10:** Compliance & reporting
- **Week 11-12:** Optimization

## Key Features

### Intelligent Discovery
- Daily automated searches
- Fit scoring based on org profile
- Priority ranking
- Team notifications

### AI-Powered Writing
- Section-by-section generation
- Human-in-the-loop review
- Iterative refinement
- Plagiarism checking
- Quality scoring

### Workflow Automation
- End-to-end orchestration
- Approval workflows
- Deadline reminders
- Status tracking
- Team collaboration

### Full Compliance
- SAM.gov validation
- Milestone tracking
- Expense documentation
- Automated reporting
- Complete audit trail

## Documentation Structure

```text
skills/grant-mgmt-agent/
├── SKILL.md                           # Full documentation
├── grant-mgmt-agent.skill.yml         # Machine-readable config
├── README.md                          # This file
├── templates/
│   ├── database-schemas/
│   │   └── supabase-schema.sql       # Complete DB schema
│   ├── n8n-workflows/                # Workflow templates
│   └── proposal-prompts/             # AI prompt templates
└── examples/
    ├── grants-gov-integration.js     # Discovery example
    ├── sam-gov-validation.js         # Entity validation
    ├── openrouter-proposals.js       # AI proposal generation
    └── docspring-forms.js            # Document automation
```

## Integration Examples

### Daily Discovery Cron

```javascript
// Run every day at 8 AM
const { dailyDiscovery } = require('./examples/grants-gov-integration');

const orgProfile = {
  type: 'nonprofit',
  keywords: ['education', 'technology', 'stem'],
  annualBudget: 500000
};

dailyDiscovery(orgProfile)
  .then(opportunities => {
    // Store in database
    // Notify team
  });
```

### Proposal Generation

```javascript
const { generateProposalSection } = require('./examples/openrouter-proposals');

const section = await generateProposalSection({
  section: 'need_statement',
  rfpRequirements: '...',
  organizationData: {...},
  projectDetails: '...',
  wordLimit: 500
});
```

## Related Skills

- **openrouter-swarms** — Multi-agent coordination
- **vault-agent** — Credential management
- **model-router** — LLM cost optimization
- **gbrain** — Store successful patterns
- **wrap-up** — Session completion
- **error-reporting** — Monitoring and alerts

## Success Metrics

### Discovery
- Opportunities discovered per week
- Match quality distribution
- Time to decision

### Applications
- Applications per month
- Completion time
- Quality scores
- Success rate

### Outcomes
- Award rate (%)
- Total funding secured
- Average award size
- Cost per award

### Efficiency
- Hours saved
- Automation uptime
- Error rate
- Team satisfaction

## Support & Resources

- **Skill Documentation:** [SKILL.md](./SKILL.md)
- **Grants.gov API:** <https://developer.grants.gov/>
- **SAM.gov API:** <https://open.gsa.gov/api/sam/>
- **OpenRouter API:** <https://openrouter.ai/docs>
- **n8n Docs:** <https://docs.n8n.io/>

## License

Part of Revvel Standards (SSOT)  
Author: Audrey Evans (MIDNGHTSAPPHIRE)  
Last Updated: 2026-04-30
