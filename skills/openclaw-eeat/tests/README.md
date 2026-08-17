# OpenClaw E-E-A-T Skill Tests

This directory contains test cases for the openclaw-eeat skill using PromptFoo.

## Running Tests

```bash
# Install PromptFoo
npm install -g promptfoo

# Run tests
cd skills/openclaw-eeat/tests
promptfoo eval --config promptfoo.yml

# View results
promptfoo view
```

## Test Coverage

### Tier 1 - Platform Content Generation
- [ ] ORCID Works XML generation
- [ ] GitHub profile update generation

### Tier 2 - High-Value Platform Drafts
- [ ] Wikidata entity creation guide
- [ ] ResearchGate profile draft
- [ ] Internet Archive submission package
- [ ] Crunchbase entity draft
- [ ] OpenCorporates claim instructions

### Tier 3 - OSINT Platform Drafts
- [ ] MISP profile JSON
- [ ] Bellingcat community profile
- [ ] IntelligenceX registration
- [ ] Maltego entity definition

### Schema Validation
- [ ] JSON-LD Organization schema
- [ ] JSON-LD Person schema
- [ ] JSON-LD ResearchProject schema
- [ ] ORCID Works XML schema
- [ ] Wikidata claims validation

### Brand Statement Processing
- [ ] Parse YAML brand statement
- [ ] Extract expertise areas
- [ ] Validate required fields
- [ ] Generate platform-specific content

### State Tracking
- [ ] Initialize state.json
- [ ] Update platform status
- [ ] Track last_updated timestamps
- [ ] Prevent duplicate submissions

## Future Tests

Tests will be added in a follow-up PR to validate:
- Template rendering with real data
- URL liveness checking
- Credential availability checking (via vault-agent)
- Output file generation
- Summary report generation
