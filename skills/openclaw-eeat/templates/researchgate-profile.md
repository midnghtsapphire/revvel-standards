# ResearchGate Profile Setup Guide

**Name:** {{PERSON_NAME}}  
**Date:** {{DATE}}

---

## Step-by-Step Instructions

### 1. Create Account / Claim Profile

1. Go to <https://www.researchgate.net/>
2. Sign up using your academic/institutional email (preferred) or Gmail
3. If a profile already exists with your name, click "Is this you?" to claim it

### 2. Profile Information

#### Basic Information
- **Full Name:** {{FULL_NAME}}
- **Current Position:** {{JOB_TITLE}}
- **Current Institution:** {{CURRENT_INSTITUTION}}
- **Department:** {{DEPARTMENT}}
- **Location:** {{CITY}}, {{STATE}}, {{COUNTRY}}

#### Professional Summary
```text
{{BIO}}

Expertise:
{{#each EXPERTISE_AREAS}}
- {{this}}
{{/each}}
```

#### Profile Photo
- Upload high-quality headshot (min 400×400px)
- Professional appearance
- Clear face visibility
- File: `{{PHOTO_PATH}}`

### 3. Research Interests & Skills

#### Research Interests (Select/Add)
{{#each RESEARCH_INTERESTS}}
- {{this}}
{{/each}}

**Suggested interests:**
- Open Source Intelligence (OSINT)
- Geospatial Analysis
- Threat Intelligence
- Software Engineering
- Artificial Intelligence
- Search and Rescue
- Computer Science

#### Skills
{{#each SKILLS}}
- {{this}}
{{/each}}

### 4. Institution & Positions

#### Current Position
- **Position:** {{CURRENT_JOB_TITLE}}
- **Institution:** {{CURRENT_INSTITUTION}}
- **Department:** {{DEPARTMENT}}
- **Start Date:** {{START_DATE}}
- **Description:** {{JOB_DESCRIPTION}}

#### Previous Positions
{{#each PREVIOUS_POSITIONS}}
- **Position:** {{title}}
- **Institution:** {{institution}}
- **Duration:** {{start_date}} — {{end_date}}
{{/each}}

### 5. Education

{{#each EDUCATION}}
#### {{degree}} — {{institution}}
- **Field of Study:** {{field}}
- **Start Year:** {{start_year}}
- **End Year:** {{end_year}}
- **Description:** {{description}}
{{/each}}

### 6. Publications & Projects

#### Add Software Projects as Publications

For each project, click "Add Research" → "Other":

{{#each PROJECTS}}

##### {{name}}

**Publication Type:** Software / Research Tool

**Title:** {{name}}

**Description:**
```text
{{description}}

Problem Solved:
{{problem_solved}}

Tech Stack:
{{#each tech_stack}}
- {{this}}
{{/each}}

Outcomes:
{{#each outcomes}}
- {{this}}
{{/each}}
```

**Publication Date:** {{release_date}}

**DOI (if available):** {{doi}}

**External Link:** {{url}}

**Project Type:** Open Source Software

**Co-authors (if applicable):**
{{#each contributors}}
- {{this}}
{{/each}}

**File Attachments:**
- README.md (download from {{url}}/blob/main/README.md)
- Documentation PDF (if available)
- Architecture diagram (if available)

{{/each}}

### 7. Technical Reports & White Papers

{{#if HAS_REPORTS}}
{{#each REPORTS}}
#### {{title}}

- **Type:** Technical Report / White Paper
- **Date:** {{date}}
- **Abstract:** {{abstract}}
- **File:** Upload PDF from {{file_path}}
- **DOI:** {{doi}}
- **External URL:** {{url}}
{{/each}}
{{/if}}

### 8. External Links & Identifiers

#### ORCID iD
- Link your ORCID: {{ORCID_ID}}
- Click "Add ORCID iD" in profile settings
- Authorize ResearchGate to read your ORCID works

#### External Links
{{#each EXTERNAL_LINKS}}
- **{{name}}:** {{url}}
{{/each}}

**Add these:**
- GitHub: <https://github.com/{{GITHUB_USERNAME}}>
- Personal Website: {{WEBSITE_URL}}
- Wikidata: {{WIKIDATA_URL}} (after creation)
- LinkedIn: {{LINKEDIN_URL}}

### 9. Research Networks & Communities

Join relevant groups:
- OSINT Community
- Geospatial Intelligence Network
- AI & Machine Learning
- Search and Rescue Technology
- Open Source Software Development

### 10. Questions & Answers

Participate in Q&A to establish expertise:
1. Browse questions in your research areas
2. Provide detailed, cited answers
3. Ask thoughtful questions in your field

### 11. Privacy & Visibility Settings

Recommended settings:
- **Profile Visibility:** Public
- **Email Visibility:** Hidden
- **Publication Full-Texts:** Public (for open source projects)
- **Stats & Metrics:** Visible
- **Contact:** Messages from anyone

### 12. Verification & Badges

- **Email Verification:** Complete immediately
- **Institution Verification:** Use institutional email if possible
- **ORCID Verification:** Link and verify ORCID iD
- **Domain Verification:** Verify website ownership ({{WEBSITE_URL}})

---

## Content Checklist

Before finalizing:

- [ ] Profile photo uploaded (professional quality)
- [ ] Full bio/summary completed with expertise areas
- [ ] Current position added with institution
- [ ] Education history complete
- [ ] At least 3 projects added as publications
- [ ] ORCID linked and verified
- [ ] External links added (GitHub, website, etc.)
- [ ] Research interests selected (min 5)
- [ ] Skills added (min 10)
- [ ] Joined at least 3 relevant research networks
- [ ] Privacy settings configured
- [ ] Profile is set to "Public"

---

## Profile Optimization Tips

1. **Regular Updates:** Add new projects and publications within 30 days of release
2. **Engagement:** Answer questions, comment on papers, join discussions
3. **Networking:** Connect with researchers in your field
4. **Citations:** Add citations to your open-source work when others reference it
5. **Metrics:** Monitor your RG Score and profile views monthly
6. **Content Quality:** Ensure all project descriptions are clear, well-formatted, and professional

---

## Why ResearchGate for Non-Academic Work

**Applied Research Qualifies:**
- Open-source intelligence tools (GrowlingEyes)
- AI/ML systems development (Neurooz)
- Search and rescue technology innovations
- Geospatial analysis methodologies
- Software engineering research

ResearchGate recognizes **applied research** and **industry R&D** as valid scholarly contributions.

---

## After Profile Creation

1. **Share Profile URL:** <https://www.researchgate.net/profile/{{USERNAME}}>
2. **Update Brand Statement:** Add ResearchGate URL
3. **Update state.json:** `"researchgate": {"status": "claimed", "profile_url": "..."}`
4. **Cross-Link:** Add ResearchGate link to GitHub profile, ORCID, and website
5. **Monitor:** Check weekly for questions, connection requests, and citations

---

## Resources

- **ResearchGate Help:** <https://www.researchgate.net/help>
- **Adding Publications:** <https://www.researchgate.net/help/research/adding-publications>
- **Profile Settings:** <https://www.researchgate.net/settings>
- **Privacy Settings:** <https://www.researchgate.net/settings/privacy>
- **ORCID Integration:** <https://www.researchgate.net/settings/identifiers>

---

**Generated by:** OpenClaw E-E-A-T Agent  
**Template Version:** 1.0.0  
**Date:** {{GENERATION_DATE}}
