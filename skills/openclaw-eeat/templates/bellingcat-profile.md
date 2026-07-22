# Bellingcat Community Profile Setup

**Name:** {{PERSON_NAME}}  
**Focus Areas:** {{FOCUS_AREAS}}  
**Date:** {{DATE}}

---

## About Bellingcat

Bellingcat is an independent international collective of researchers, investigators, and citizen journalists using open-source and social media investigation to probe a variety of subjects – from Mexican drug lords and crimes against humanity to tracking the use of chemical weapons and conflicts worldwide.

**Community:** <https://www.bellingcat.com/>  
**Discord:** <https://discord.gg/bellingcat>

---

## Why Join Bellingcat for {{PERSON_NAME}}

**Your Relevant Experience:**
{{#each RELEVANT_EXPERIENCE}}
- {{this}}
{{/each}}

**Alignment with Bellingcat's Mission:**
- Open-source intelligence (OSINT) expertise
- Geospatial analysis capabilities
- {{#if SAR_EXPERIENCE}}Search and Rescue operations experience{{/if}}
- {{#if THREAT_INTEL}}Threat intelligence analysis{{/if}}
- Commitment to fact-based investigation and verification

---

## Step-by-Step Setup

### 1. Create Bellingcat Account

1. Go to <https://www.bellingcat.com/>
2. Click "Join" or "Register"
3. Fill in registration form:
   - **Username:** {{USERNAME}}
   - **Email:** {{EMAIL}}
   - **Password:** (secure password)
   - **Bio:** See template below

### 2. Profile Information

#### Bio Template

```text
{{PERSON_NAME}} is a {{PRIMARY_ROLE}} specializing in {{EXPERTISE_SUMMARY}}.

Professional Background:
{{BIO_PARAGRAPH}}

OSINT & Investigation Experience:
{{#each OSINT_PROJECTS}}
- {{name}}: {{description}}
{{/each}}

{{#if SAR_EXPERIENCE}}
Search & Rescue:
{{SAR_DESCRIPTION}}
{{/if}}

Relevant Skills:
- Geospatial analysis and mapping ({{GIS_TOOLS}})
- Open-source intelligence gathering and verification
- Satellite imagery analysis
- Social media investigation
- Data visualization and reporting
{{#each ADDITIONAL_SKILLS}}
- {{this}}
{{/each}}

External Links:
- GitHub: https://github.com/{{GITHUB_USERNAME}}
- ORCID: https://orcid.org/{{ORCID_ID}}
{{#if WIKIDATA_URL}}
- Wikidata: {{WIKIDATA_URL}}
{{/if}}
```

#### Profile Photo
- Professional headshot
- Clear visibility
- Appropriate for investigative journalism community

### 3. Areas of Expertise (Select)

Check all that apply:
- [ ] Open Source Intelligence (OSINT)
- [ ] Geospatial Analysis
- [ ] Satellite Imagery Analysis
- [ ] Social Media Investigation
- [ ] Digital Forensics
- [ ] Data Analysis & Visualization
- [ ] Search and Rescue
- [ ] Crisis Mapping
- [ ] Conflict Monitoring
- [ ] Environmental Monitoring
- [ ] Human Rights Documentation

### 4. Join Discord Server

1. Go to <https://discord.gg/bellingcat>
2. Read and accept community rules
3. Introduce yourself in #introductions:

```text
Hi, I'm {{PERSON_NAME}} ({{USERNAME}})

Background: {{SHORT_BIO}}

OSINT focus: {{OSINT_FOCUS}}

Looking forward to contributing to investigations in:
{{#each CONTRIBUTION_AREAS}}
- {{this}}
{{/each}}

Recent relevant work:
{{#each RECENT_WORK}}
- {{this}}
{{/each}}

GitHub: https://github.com/{{GITHUB_USERNAME}}
```

### 5. Contribute Case Study: Sun Peaks SAR Brief

{{#if SAR_CASE_STUDY_AVAILABLE}}

#### Formatting Your SAR Case Study for Bellingcat

**Title:** "{{SAR_CASE_STUDY_TITLE}}"

**Abstract:**
```text
{{SAR_ABSTRACT}}
```

**Structure:**

1. **Incident Overview**
   - Date, location, victim profile
   - Initial reports and alerts
   - Environmental conditions

2. **OSINT Methodology**
   - Sources consulted (weather data, terrain maps, social media)
   - Tools used (GIS software, satellite imagery, mapping platforms)
   - Data collection and verification process

3. **Geospatial Analysis**
   - Terrain analysis
   - Search area prioritization
   - Movement modeling
   - Resource allocation optimization

4. **Findings & Outcomes**
   - Key insights from analysis
   - Impact on search operations
   - Lessons learned
   - Recommendations for future operations

5. **Tools & Techniques**
   - Software/platforms used
   - Open-source data sources
   - Verification methods
   - Reproducibility notes

**Visuals to Include:**
- Maps with search areas marked
- Terrain analysis visualizations
- Timeline graphics
- Before/after comparisons (if applicable)

**Submission:**
1. Write case study in Markdown or Google Docs
2. Get permission from SAR organization (if needed)
3. Anonymize victim information (use "Subject" or initials)
4. Submit via Bellingcat's contact form or Discord
5. Tag: #SAR #Geospatial #OSINT #CaseStudy

{{/if}}

### 6. Participate in Investigations

**Ways to Contribute:**

1. **Verify Information**
   - Fact-check claims in ongoing investigations
   - Cross-reference sources
   - Geolocate images and videos

2. **Provide Technical Expertise**
   - Geospatial analysis for conflict/disaster zones
   - Satellite imagery interpretation
   - Data visualization for reports

3. **Share Tools & Methods**
   - Document OSINT workflows
   - Share custom scripts/tools (via GitHub)
   - Write tutorials for community

4. **Collaborative Research**
   - Join working groups
   - Contribute to long-term investigations
   - Peer review findings

### 7. Community Guidelines

**Follow Bellingcat's Standards:**
- Verify all information before sharing
- Cite sources properly
- Respect privacy and safety
- No doxing or harassment
- Fact-based, not politically motivated
- Transparent about methods and limitations

**Attribution:**
- Give credit to contributors
- Link to original sources
- Document your methodology

---

## Professional Portfolio Items for Bellingcat

### GrowlingEyes OSINT Platform

**Relevance:** Open-source threat intelligence

**Submission Format:**
```markdown
# GrowlingEyes: OSINT & Threat Intelligence Platform

**Description:** {{GROWLINGEYES_DESCRIPTION}}

**OSINT Capabilities:**
{{#each GROWLINGEYES_CAPABILITIES}}
- {{this}}
{{/each}}

**Use Cases for Investigative Journalism:**
{{#each JOURNALISM_USE_CASES}}
- {{this}}
{{/each}}

**GitHub:** {{GROWLINGEYES_URL}}
**Documentation:** {{DOCS_URL}}
```

### Geospatial Analysis Work

**Showcase:**
- Sun Peaks SAR brief (anonymized)
- Any crisis mapping projects
- Conflict zone analysis (if applicable)
- Environmental monitoring case studies

---

## Networking & Visibility

### Follow Key Contributors
- Eliot Higgins (@EliotHiggins) — Founder
- Giancarlo Fiorella (@giancarlofiorel)
- Aric Toler (@AricToler)
- Christiaan Triebert (@trbrtc)

### Engage with Content
- Comment on investigations
- Share findings and tools
- Participate in Discord discussions
- Contribute to tutorials and guides

### Cross-Promote
- Share Bellingcat investigations on your channels
- Reference Bellingcat methods in your work
- Collaborate on joint investigations

---

## After Setup Checklist

- [ ] Profile created with complete bio
- [ ] Expertise areas selected
- [ ] Discord account linked and introduced
- [ ] SAR case study drafted (if applicable)
- [ ] GrowlingEyes platform documented for community
- [ ] Following key contributors
- [ ] Read community guidelines and investigation standards
- [ ] Contributed first comment/discussion post
- [ ] Shared profile on GitHub/ORCID/Wikidata

---

## Maintenance

**Monthly Activities:**
- Check for new investigations in your expertise areas
- Contribute verifications or analysis
- Share relevant tools or methods
- Engage in Discord discussions

**Quarterly:**
- Submit case study or tutorial
- Update profile with new projects
- Review and contribute to methodology guides

---

## Benefits for E-E-A-T

**Expertise Signals:**
- Association with respected investigative journalism collective
- Demonstrated OSINT and geospatial analysis capabilities
- Peer-reviewed contributions
- Published case studies and methodologies

**Authority Signals:**
- Recognized within OSINT community
- Cited in investigations
- Collaboration with established researchers

**Trustworthiness Signals:**
- Transparent methodologies
- Verifiable contributions
- Fact-based, cited work
- Peer validation

---

## Resources

- **Bellingcat Toolkit:** <https://docs.google.com/spreadsheets/d/18rtqh8EG2q1xBo2cLNyhIDuK9jrPGwYr9DI2UncoqJQ/>
- **Online Investigation Toolkit:** <https://start.me/p/ZME8nR/bellingcat>
- **Discord Server:** <https://discord.gg/bellingcat>
- **Submission Guidelines:** <https://www.bellingcat.com/contribute/>
- **Investigation Standards:** <https://www.bellingcat.com/category/resources/>

---

**Generated by:** OpenClaw E-E-A-T Agent  
**Template Version:** 1.0.0  
**Date:** {{GENERATION_DATE}}
