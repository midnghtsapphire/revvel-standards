# Wikidata Entity Creation Guide

**Entity Type:** Person (Q5)  
**Name:** {{PERSON_NAME}}  
**Date:** {{DATE}}

---

## Step-by-Step Instructions

### 1. Create New Item

1. Go to <https://www.wikidata.org/>
2. Click "Create a new item" (requires Wikidata account)
3. Set label: `{{PERSON_NAME}}`
4. Set description: `{{SHORT_DESCRIPTION}}`
5. Set alias (if applicable): `{{ALIAS}}`

### 2. Core Statements (Required)

#### Instance of (P31)
- **Value:** human (Q5)

#### Occupation (P106)
{{#each OCCUPATIONS}}
- **Value:** {{qcode}} — {{label}}
{{/each}}

**Suggested occupations for {{PERSON_NAME}}:**
- Q1650915 — researcher
- Q5482740 — software developer
- Q15839264 — OSINT analyst
- Q5482740 — computer scientist
- Q18939491 — search and rescue volunteer

#### Sex or gender (P21)
- **Value:** {{GENDER_QCODE}} (e.g., Q6581097 for male, Q6581072 for female)

#### Country of citizenship (P27)
- **Value:** {{CITIZENSHIP_QCODE}} (e.g., Q30 for United States)

#### Place of residence (P551)
- **Value:** {{RESIDENCE_QCODE}} (e.g., Q1261 for Colorado)

### 3. Identifiers (High Priority)

#### ORCID iD (P496)
- **Value:** `{{ORCID_ID}}` (format: 0000-0000-0000-0000)
- **Reference URL:** <https://orcid.org/{{ORCID_ID}}>

#### GitHub username (P2037)
- **Value:** `{{GITHUB_USERNAME}}`
- **Reference URL:** <https://github.com/{{GITHUB_USERNAME}}>

### 4. External Links

#### Official website (P856)
{{#each WEBSITES}}
- **Value:** {{this}}
{{/each}}

#### Social Media
{{#if LINKEDIN_URL}}
- **LinkedIn profile ID (P6634):** {{LINKEDIN_ID}}
{{/if}}
{{#if TWITTER_HANDLE}}
- **X username (P2002):** {{TWITTER_HANDLE}}
{{/if}}

### 5. Professional Information

#### Field of work (P101)
{{#each EXPERTISE_AREAS}}
- **Value:** {{this}} (find corresponding Q-code at wikidata.org)
{{/each}}

**Common Q-codes:**
- Q21198 — computer science
- Q82738 — intelligence studies
- Q131476 — geospatial analysis
- Q11862829 — artificial intelligence
- Q181788 — open-source intelligence

#### Employer (P108)
{{#each EMPLOYERS}}
- **Value:** {{org_name}} ({{org_qcode}})
- **Start time:** {{start_date}}
- **End time:** {{end_time}} (or leave blank if current)
{{/each}}

### 6. Notable Works (P800)

{{#each PROJECTS}}
#### {{name}}
- **Value:** Create new item if doesn't exist
  - **Label:** {{name}}
  - **Description:** {{description}}
  - **Instance of (P31):** software (Q7397)
  - **Source code repository URL (P1324):** {{url}}
  - **Programming language (P277):** {{languages}}
  - **License (P275):** {{license}}

{{/each}}

### 7. Awards and Honors (P166)

{{#each AWARDS}}
- **Value:** {{this}}
{{/each}}

### 8. Education (P69)

{{#each EDUCATION}}
- **Value:** {{institution}} ({{qcode}})
- **Start time:** {{start_year}}
- **End time:** {{end_year}}
- **Degree:** {{degree}} ({{degree_qcode}})
{{/each}}

### 9. References (Critical for Verification)

For EVERY claim above, add references:

#### Reference types
1. **Reference URL (P854):** Link to source
2. **Retrieved (P813):** Date you accessed the source
3. **Language of work or name (P407):** English (Q1860)

#### High-quality reference sources
- ORCID profile (<https://orcid.org/{{ORCID_ID}}>)
- GitHub profile (<https://github.com/{{GITHUB_USERNAME}}>)
- Official website ({{PRIMARY_URL}})
- Published works, papers, or documentation
- News articles or press releases

### 10. Categories and Topics

Add relevant categories:
- WikiProject Computer Science
- WikiProject Software
- WikiProject Intelligence

---

## Quality Checklist

Before submitting:

- [ ] All required statements present (instance of, occupation, gender, citizenship)
- [ ] At least 2 external identifiers (ORCID, GitHub)
- [ ] At least 3 references for verifiability
- [ ] All Q-codes verified and correct
- [ ] No unsourced/unverifiable claims
- [ ] Description is neutral and factual (no promotional language)
- [ ] All URLs are live and accessible

---

## Wikidata Entity Preview

```json
{
  "labels": {
    "en": "{{PERSON_NAME}}"
  },
  "descriptions": {
    "en": "{{SHORT_DESCRIPTION}}"
  },
  "claims": {
    "P31": [{"mainsnak": {"datavalue": {"value": {"id": "Q5"}}}}],
    "P106": [
      {{#each OCCUPATIONS}}
      {"mainsnak": {"datavalue": {"value": {"id": "{{qcode}}"}}}}{{#unless @last}},{{/unless}}
      {{/each}}
    ],
    "P496": [{"mainsnak": {"datavalue": {"value": "{{ORCID_ID}}"}}}],
    "P2037": [{"mainsnak": {"datavalue": {"value": "{{GITHUB_USERNAME}}"}}}],
    "P856": [
      {{#each WEBSITES}}
      {"mainsnak": {"datavalue": {"value": "{{this}}"}}}{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }
}
```

---

## After Creation

1. Save the Wikidata Q-code (e.g., Q123456)
2. Add to brand statement: `wikidata_url: "https://www.wikidata.org/wiki/Q123456"`
3. Update state.json: `"wikidata": {"status": "claimed", "entity_id": "Q123456"}`
4. Monitor for vandalism and keep profile updated

---

## Resources

- **Wikidata Help:** <https://www.wikidata.org/wiki/Wikidata:Introduction>
- **Property Search:** <https://www.wikidata.org/wiki/Special:Search>
- **Q-code Search:** <https://www.wikidata.org/wiki/Special:Search>
- **Wikidata Tours:** <https://www.wikidata.org/wiki/Wikidata:Tours>
- **Community Portal:** <https://www.wikidata.org/wiki/Wikidata:Community_portal>

---

**Generated by:** OpenClaw E-E-A-T Agent  
**Template Version:** 1.0.0  
**Date:** {{GENERATION_DATE}}
