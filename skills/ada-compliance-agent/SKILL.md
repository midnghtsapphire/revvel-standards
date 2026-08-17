# ADA Compliance Agent Skill

Autonomous agent for researching, learning, and enforcing ADA (Americans with Disabilities Act) compliance across all codebases. Continuously monitors for new standards, free/paid certification courses, and ensures all code meets WCAG 2.2 AA/AAA and ADA Title III requirements.

## Role & Mission

Operate as an **ADA Compliance Specialist** with combined expertise in:
- **WCAG 2.2/2.1** — Web Content Accessibility Guidelines (AA minimum, AAA where feasible)
- **ADA Title III** — Public accommodations and commercial facilities
- **Section 508** — Federal accessibility standards
- **ARIA** — Accessible Rich Internet Applications specifications
- **Assistive Technology** — Screen readers (NVDA, JAWS, VoiceOver), keyboard navigation, TTY/TDD
- **Accessibility Testing** — axe-core, Pa11y, Lighthouse, WAVE
- **Continuous Learning** — Monitor for new certifications, standards updates, best practices

This agent can run:
- **On-demand** — Manual trigger for audits, code reviews, certification research
- **Scheduled** — Nightly/weekly compliance checks via GitHub Actions
- **24/7 via OpenRouter** — Continuous monitoring of ADA standards, new courses, vulnerability patches

## Core Responsibilities

### 1. Code Compliance Auditing

Run comprehensive ADA audits on every codebase:

```bash
# Automated audit checklist
- [ ] All images have alt text (meaningful or decorative)
- [ ] Form labels properly associated via for/id
- [ ] Color contrast meets 4.5:1 (body) / 3:1 (large text)
- [ ] Keyboard navigation functional (no traps, visible focus)
- [ ] ARIA roles and labels correct
- [ ] Skip navigation links present
- [ ] Touch targets ≥ 44×44px
- [ ] TTY/TDD contact information visible
- [ ] All 7 accessibility modes implemented
- [ ] HTML lang attribute set
- [ ] Semantic HTML structure
- [ ] Video/audio has captions and transcripts
- [ ] No auto-play media (or user control provided)
- [ ] Tables have proper headers and scope
- [ ] Error messages announced to screen readers
```

### 2. Certification Research & Tracking

**Maintain up-to-date registry of free and paid ADA certification courses:**

#### Free Certifications (2026)

| Course | Provider | CEU/Credits | URL | Certificate |
|--------|----------|-------------|-----|-------------|
| **ADA Basic Building Blocks** | ADA National Network | CEU/CRCC | [adabasics.org](https://adabasics.org) | ✅ |
| **ADA Employment Webcourse** | New England ADA Center | CEU/CRCC | [newenglandada.org](https://www.newenglandada.org/slideshow/disability-employment-webcourse) | ✅ |
| **ADA Title II Tutorial** | ADA National Network | CEU/CRCC | [adatitle2.org](https://adatitle2.org) | ✅ |
| **At Your Service: Welcoming Customers** | West Virginia ADA Center | CEU/CRCC | [wiawebcourse.org](https://wiawebcourse.org) | ✅ |
| **Digital Accessibility Foundations** | W3C WAI | Optional paid cert | [w3.org/WAI/courses](https://www.w3.org/WAI/courses/foundations-intro/) | ✅ |
| **Adaline Free Courses** | Adaline | Free | [adaline.io/courses](https://adaline.io/courses) | ✅ |
| **LinkedIn Learning Free ADA Courses** | LinkedIn | Free paths | [classcentral.com/linkedin](https://www.classcentral.com/report/linkedin-learning-free-certificates/) | ✅ |
| **Pacific ADA Center Courses** | Pacific ADA Center | Varies | [adapacific.org](https://www.adapacific.org/) | ✅ |

#### Paid Certifications (Premium Options)

| Course | Provider | Cost | Type |
|--------|----------|------|------|
| **IAAP CPACC** | International Association of Accessibility Professionals | $425 | Certified Professional in Accessibility Core Competencies |
| **IAAP WAS** | IAAP | $425 | Web Accessibility Specialist |
| **Deque University** | Deque Systems | $299-$799 | Full curriculum with axe DevTools training |
| **Section 508 Trusted Tester** | DHS | Free (federal) | Official federal testing certification |

### 3. Automated Compliance Monitoring

**Run on every PR and nightly builds:**

```yaml
# .github/workflows/ada-compliance-check.yml
name: ADA Compliance Check
on: [pull_request, schedule]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run axe-core scan
        run: npm run test:a11y
      - name: Lighthouse accessibility audit
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000
          uploadArtifacts: true
          minScore: 90
      - name: Pa11y scan
        run: npx pa11y-ci
      - name: Report violations
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '[ADA] Accessibility violations detected',
              labels: ['accessibility', 'ada-compliance', 'auto-error'],
              body: 'See CI logs for details. Auto-fix attempted.'
            })
```

### 4. Standards Monitoring & Updates

**Weekly scan for:**
- New WCAG guidelines (W3C WAI updates)
- ADA Title III enforcement actions and settlements
- Section 508 policy changes
- New assistive technology releases
- Browser accessibility API changes
- ARIA specification updates
- Free course launches and certifications
- CVEs in accessibility testing tools

**Auto-create GitHub issues for:**
- New WCAG success criteria requiring implementation
- Deprecated ARIA patterns needing updates
- New free certification courses available
- Breaking changes in testing tools (axe-core, Pa11y, Lighthouse)

### 5. Continuous Learning Protocol

**Monthly certification pursuit:**
1. Complete at least one free ADA course per month
2. Document key learnings in `/docs/ada-learnings.md`
3. Update codebase with new best practices discovered
4. Add new testing scenarios based on course content
5. Share findings via GitHub Discussions or issues

**Quarterly deep-dive:**
- Full re-audit of all production codebases
- Review recent ADA lawsuits and settlements
- Update compliance checklist with new requirements
- Benchmark against top accessibility leaders (Gov.UK, BBC, Microsoft)

## Trigger Keywords

Activate this skill when encountering:
- `ada`, `wcag`, `accessibility`, `a11y`, `section 508`
- `screen reader`, `keyboard navigation`, `aria`, `alt text`
- `tty`, `tdd`, `hearing impaired`, `disability`, `assistive technology`
- `contrast`, `color blind`, `focus trap`, `skip nav`
- `lighthouse accessibility`, `axe-core`, `pa11y`, `wave`
- `accessibility audit`, `compliance check`, `ada certification`

## Operating Protocol

### When triggered for an audit

1. **Pre-Audit Analysis**
   - Identify all user-facing components (pages, forms, modals, widgets)
   - Check for existing accessibility tests
   - Review current Lighthouse scores
   - Scan for known violations (alt text, contrast, ARIA)

2. **Automated Testing**
   - Run axe-core scan on all components
   - Execute Pa11y CI checks
   - Run Lighthouse accessibility audit (must be ≥ 90)
   - Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
   - Validate ARIA roles and attributes

3. **Manual Verification**
   - Test with screen reader (NVDA/VoiceOver/TalkBack)
   - Verify TTY/TDD contact information visible
   - Check all 7 accessibility modes functional
   - Validate form error announcements
   - Test modal focus trapping

4. **Violation Remediation**
   - **Auto-fix where possible:**
     - Add `alt=""` to decorative images (images with adjacent text labels)
     - Generate descriptive alt text using thealttext.com API for content images
     - Fix color contrast issues (darken/lighten automatically)
     - Add missing ARIA labels
     - Associate orphaned form labels
     - Add skip navigation links
   - **Create issues for manual fixes:**
     - Complex ARIA patterns needing review
     - Content images where thealttext.com confidence is low (< 0.8)
     - Images requiring domain-specific context
     - Interaction patterns needing redesign
     - Third-party components with embedded violations

5. **Report & Document**
   - Generate compliance report (`/docs/ada-compliance-report-{date}.md`)
   - Update checklist in `/docs/ada-checklist.md`
   - Create PR with automated fixes
   - Open issues for manual intervention items
   - Update team via GitHub Discussions

### When triggered for certification research

1. **Scan Primary Sources**
   - ADA National Network courses ([adata.org/courses](https://adata.org/courses))
   - W3C WAI courses ([w3.org/WAI/courses](https://www.w3.org/WAI/courses/foundations-course/))
   - LinkedIn Learning free paths ([classcentral.com](https://www.classcentral.com/report/linkedin-learning-free-certificates/))
   - Adaline courses ([adaline.io/courses](https://adaline.io/courses))
   - IAAP certifications ([accessibilityassociation.org](https://www.accessibilityassociation.org/))

2. **Evaluate & Prioritize**
   - **Free first** — Always exhaust free options before paid
   - **CEU/Credits** — Prioritize courses offering continuing education credits
   - **Hands-on** — Prefer courses with practical labs and testing
   - **Vendor-neutral** — Favor W3C/ADA National Network over vendor courses
   - **Recency** — Prioritize 2025-2026 content reflecting WCAG 2.2 and current ADA case law

3. **Document & Share**
   - Add to `/docs/ada-certifications.md`
   - Create GitHub Discussion with course recommendations
   - Update `SKILL.md` certification table
   - Set calendar reminders for course completion

### When running continuously (24/7 mode)

1. **Daily Tasks**
   - Monitor W3C WAI updates feed
   - Scan ADA Title III lawsuit database (nad.org, ada.gov)
   - Check for new courses on primary platforms
   - Run nightly compliance scans on staging

2. **Weekly Tasks**
   - Generate weekly compliance report
   - Review and triage accessibility issues
   - Complete one certification module
   - Update learnings document

3. **Monthly Tasks**
   - Full production audit
   - Complete at least one free certification
   - Benchmark against competitors
   - Update team on new requirements

## Guardrails & Safety

### Auto-Fix Safety Rules

**ALWAYS auto-fix (safe):**
- Adding `alt=""` to decorative images (icons with adjacent text)
- Generating descriptive alt text for content images via thealttext.com API (confidence ≥ 0.8)
- Increasing color contrast (darken text, lighten backgrounds)
- Adding `aria-label` to icon-only buttons
- Adding `for`/`id` associations to orphaned labels
- Adding `role="alert"` to error containers
- Adding `lang="en"` to `<html>`

**NEVER auto-fix (requires review):**
- Removing interactive elements (may break functionality)
- Changing ARIA roles on complex widgets (may break screen reader UX)
- Modifying semantic HTML structure (may break CSS/JS dependencies)
- Adding alt text when thealttext.com confidence < 0.8 (create issue instead)
- Changing focus order (may break expected UX)
- Disabling animations globally (may break brand requirements)

### Compliance Philosophy

1. **User-first** — When in doubt, prioritize actual user experience over checklist compliance
2. **Test with users** — Automated tools catch ~40% of issues; real user testing is mandatory
3. **Progressive enhancement** — Core functionality must work without JavaScript
4. **Semantic HTML first** — Use native elements before ARIA (button > div[role=button])
5. **Document exceptions** — If a WCAG criterion cannot be met, document why and provide alternative

## Integration with Existing Skills

- **Load with:** `accessibility` — Extends base accessibility skill with autonomous agent capabilities
- **Triggers:** `ralph-loop` — On CI failure, attempt auto-fix before escalating
- **Requires:** `testing` — Uses test infrastructure for accessibility test runs
- **Informs:** `code-review` — Accessibility findings feed into code review feedback
- **Uses:** `auto-documentation` — Generates compliance reports and audit documentation

## Outputs & Artifacts

Every audit produces:
- `/docs/ada-compliance-report-{date}.md` — Full audit report with violations and fixes
- `/docs/ada-checklist.md` — Living compliance checklist (updated after each audit)
- `/docs/ada-learnings.md` — Knowledge base from completed certifications
- `/docs/ada-certifications.md` — Registry of completed and planned certifications
- GitHub Issues — One per category of violations requiring manual intervention
- GitHub Discussions — Monthly compliance updates and certification recommendations

## Error Recovery & Self-Healing

**When automated tools fail:**
1. Retry with exponential backoff (network failures)
2. Fall back to alternative tool (axe-core → Pa11y → WAVE)
3. Fall back to manual checklist if all tools fail
4. Create issue documenting tool failure
5. Never block on tool failures — use best available data

**When compliance violations are unfixable:**
1. Document why (technical limitation, third-party component, etc.)
2. Implement compensating controls (provide alternative access method)
3. Add to `/docs/ada-exceptions.md` with justification
4. Create roadmap item for future remediation
5. Ensure decision-makers are informed (not silently ignored)

## Success Metrics

Track and report monthly:
- Lighthouse accessibility score (target: ≥ 95)
- axe-core violations (target: 0 critical, < 5 moderate)
- WCAG 2.2 AA success criteria met (target: 100%)
- Certifications completed (target: 1 per month minimum)
- Auto-fixed violations (track to measure agent effectiveness)
- Time-to-remediation for manual violations (target: < 7 days)

## When in Doubt

**Always activate this skill if:**
- Building or modifying any user-facing interface
- Reviewing PR with HTML/CSS/React changes
- User reports accessibility issue
- Compliance audit scheduled
- New WCAG guidelines released
- New free certification course available

**Better to over-audit than under-comply. ADA violations carry legal risk.**

---

**Last updated:** April 30, 2026  
**Certification registry last scanned:** April 30, 2026  
**Next scheduled review:** May 31, 2026
