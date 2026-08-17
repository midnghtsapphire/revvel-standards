# Internet Archive Submission Guide

**Collection:** Citable Brand & Project Documentation  
**Creator:** {{CREATOR_NAME}}  
**Date:** {{DATE}}

---

## What to Upload

A **citable package** of your brand statement and project documentation that can be referenced with a permanent URL and Archive.org identifier.

### Package Contents

1. **Brand Statement** (`brand-statement.pdf`)
2. **Project Overviews** (one PDF per project)
3. **Technical Documentation** (README files, architecture docs)
4. **Metadata File** (`metadata.json`)

---

## Step-by-Step Instructions

### 1. Prepare Upload Package

Create a folder: `archive-upload-{{DATE}}/`

#### Files to Include

```text
archive-upload-{{DATE}}/
├── brand-statement.pdf
├── projects/
│   ├── {{PROJECT_1_SLUG}}.pdf
│   ├── {{PROJECT_2_SLUG}}.pdf
│   └── {{PROJECT_3_SLUG}}.pdf
├── documentation/
│   ├── {{PROJECT_1_SLUG}}-README.pdf
│   └── {{PROJECT_1_SLUG}}-ARCHITECTURE.pdf
└── metadata.json
```

#### Brand Statement PDF

Convert your brand statement to PDF with:
- Clear title: "{{PERSON_NAME}} — Professional Statement"
- Subtitle: "{{TAGLINE}}"
- Sections:
  - Introduction / Bio
  - Expertise Areas
  - Credentials & Certifications
  - Notable Projects
  - Contact Information
  - References (ORCID, GitHub, Wikidata URLs)

**Formatting:**
- Professional font (Arial, Calibri, Times New Roman)
- 11-12pt body text
- Clear section headers
- Page numbers
- Date of creation
- Copyright/license statement (e.g., CC BY 4.0)

#### Project Overview PDFs

For each project, create a PDF with:

```markdown
# {{PROJECT_NAME}}

**Author:** {{CREATOR_NAME}}  
**Version:** {{VERSION}}  
**Date:** {{DATE}}  
**URL:** {{PROJECT_URL}}  
**License:** {{LICENSE}}

## Abstract

{{ONE_LINE_PITCH}}

## Problem Statement

{{PROBLEM_SOLVED}}

## Technical Approach

{{TECHNICAL_DESCRIPTION}}

## Technology Stack

{{#each TECH_STACK}}
- {{this}}
{{/each}}

## Outcomes & Impact

{{#each OUTCOMES}}
- {{this}}
{{/each}}

## Documentation

- Source Code: {{GITHUB_URL}}
- README: {{README_URL}}
- Issues: {{ISSUES_URL}}

## E-E-A-T Relevance

{{EEAT_RELEVANCE}}

## References

1. GitHub Repository: {{GITHUB_URL}}
2. ORCID Works: {{ORCID_URL}}
3. Wikidata Entity: {{WIKIDATA_URL}}

## License

This work is licensed under {{LICENSE}}.

## Citation

{{CREATOR_NAME}}. ({{YEAR}}). *{{PROJECT_NAME}}*. Retrieved from {{ARCHIVE_URL}}
```

#### Metadata JSON

Create `metadata.json`:

```json
{
  "mediatype": "texts",
  "collection": "opensource",
  "title": "{{CREATOR_NAME}} — Professional Portfolio {{YEAR}}",
  "creator": "{{CREATOR_NAME}}",
  "date": "{{DATE}}",
  "description": "{{DESCRIPTION}}",
  "subject": [
    {{#each SUBJECTS}}
    "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  ],
  "language": "eng",
  "licenseurl": "{{LICENSE_URL}}",
  "identifier": "{{IDENTIFIER_SLUG}}",
  "external-identifier": [
    "orcid:{{ORCID_ID}}",
    "github:{{GITHUB_USERNAME}}",
    "wikidata:{{WIKIDATA_QID}}"
  ]
}
```

**Suggested subjects:**
- Open Source Intelligence (OSINT)
- Software Engineering
- Geospatial Analysis
- Artificial Intelligence
- Search and Rescue
- Threat Intelligence

### 2. Create Internet Archive Account

1. Go to <https://archive.org/account/signup>
2. Sign up with email
3. Verify email address
4. Complete profile with real name

### 3. Upload Files

#### Option A: Web Upload (Small Packages < 500MB)

1. Go to <https://archive.org/upload/>
2. Click "Choose Files"
3. Select all files from `archive-upload-{{DATE}}/`
4. Fill in metadata form:

**Item Title:**
```text
{{CREATOR_NAME}} — Professional Portfolio {{YEAR}}
```

**Item Description:**
```text
Citable documentation of professional work by {{CREATOR_NAME}}, including:

{{#each PROJECTS}}
- {{name}}: {{description}}
{{/each}}

This collection serves as a permanent, citable reference for expertise in {{EXPERTISE_SUMMARY}}.

External Identifiers:
- ORCID: https://orcid.org/{{ORCID_ID}}
- GitHub: https://github.com/{{GITHUB_USERNAME}}
- Wikidata: https://www.wikidata.org/wiki/{{WIKIDATA_QID}}

Licensed under {{LICENSE}}.
```

**Subject Tags:**
```text
{{#each SUBJECTS}}
{{this}}; 
{{/each}}
```

**Creator:**
```text
{{CREATOR_NAME}}
```

**Date:**
```text
{{DATE}}
```

**License:**
```text
{{LICENSE}}
```

**Language:**
```text
English
```

**Collection:**
```text
opensource
```

1. Click "Upload and Create Your Item"

#### Option B: Command Line Upload (Large Packages)

Install `internetarchive` CLI:
```bash
pip install internetarchive
```

Configure credentials:
```bash
ia configure
```

Upload:
```bash
ia upload {{IDENTIFIER_SLUG}} \
  archive-upload-{{DATE}}/* \
  --metadata="title:{{TITLE}}" \
  --metadata="creator:{{CREATOR_NAME}}" \
  --metadata="date:{{DATE}}" \
  --metadata="description:{{DESCRIPTION}}" \
  --metadata="subject:{{SUBJECTS}}" \
  --metadata="licenseurl:{{LICENSE_URL}}" \
  --metadata="language:eng" \
  --metadata="mediatype:texts" \
  --metadata="collection:opensource"
```

### 4. After Upload

1. **Note Item URL:** <https://archive.org/details/{{IDENTIFIER_SLUG}}>
2. **Update Brand Statement:** Add Archive.org URL
3. **Update state.json:**
   ```json
   "archive-org": {
     "status": "published",
     "item_id": "{{IDENTIFIER_SLUG}}",
     "url": "https://archive.org/details/{{IDENTIFIER_SLUG}}",
     "published_date": "{{DATE}}"
   }
   ```
4. **Add to ORCID:** Use Archive.org URL as external identifier for works
5. **Add to Wikidata:** Reference Archive.org item in notable works
6. **Add to ResearchGate:** Link to Archive.org in publications

### 5. Citing Your Archive.org Item

**APA Format:**
```text
{{CREATOR_NAME}}. ({{YEAR}}). {{TITLE}}. Internet Archive. https://archive.org/details/{{IDENTIFIER_SLUG}}
```

**MLA Format:**
```text
{{CREATOR_NAME}}. "{{TITLE}}." Internet Archive, {{DATE}}, archive.org/details/{{IDENTIFIER_SLUG}}.
```

**Chicago Format:**
```text
{{CREATOR_NAME}}. "{{TITLE}}." Internet Archive. {{DATE}}. https://archive.org/details/{{IDENTIFIER_SLUG}}.
```

---

## Verification & Quality Checklist

Before uploading:

- [ ] All PDFs are searchable (not scanned images)
- [ ] Metadata.json is valid JSON
- [ ] All external URLs in documents are live
- [ ] License is clearly stated in each document
- [ ] Creator name is consistent across all files
- [ ] Date format is ISO 8601 (YYYY-MM-DD)
- [ ] File names are kebab-case, no spaces
- [ ] Total package size < 2GB for web upload
- [ ] All referenced identifiers (ORCID, GitHub) are correct

---

## Why Internet Archive for E-E-A-T

**Benefits:**
1. **Permanent URLs** — Never expires, can be cited forever
2. **Wayback Machine** — Automatic versioning and time travel
3. **High Domain Authority** — archive.org has strong SEO weight
4. **Academic Recognition** — Accepted by many citation systems
5. **OSINT Discovery** — Indexed by intelligence community tools
6. **Free Forever** — No fees, no ads, open access

**Use Cases:**
- Citable professional portfolio
- Project documentation snapshots
- White papers and technical reports
- Conference presentations
- Research datasets
- Software release archives

---

## Maintenance

**Update Schedule:**
- Upload new version annually or when significant projects are added
- Keep old versions available (archive.org supports versioning)
- Update metadata.json with new projects/credentials

**Naming Convention:**
```text
{{CREATOR_SLUG}}-portfolio-{{YEAR}}
{{CREATOR_SLUG}}-{{PROJECT_SLUG}}-{{VERSION}}
```

---

## Resources

- **Upload Guide:** <https://help.archive.org/help/uploading-a-basic-guide/>
- **Metadata Guidelines:** <https://help.archive.org/help/metadata/>
- **CLI Tool:** <https://archive.org/services/docs/api/internetarchive/>
- **License Info:** <https://creativecommons.org/licenses/>

---

**Generated by:** OpenClaw E-E-A-T Agent  
**Template Version:** 1.0.0  
**Date:** {{GENERATION_DATE}}
