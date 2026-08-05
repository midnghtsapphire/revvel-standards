# ADA Compliance Agent — Usage Examples

This document provides practical examples of how to use the ADA Compliance Agent in different scenarios.

## Example 1: On-Demand Audit of Current Codebase

**Scenario:** You want to check the accessibility of your current codebase before deploying to production.

**Command:**
```text
Load the ada-compliance-agent skill and run a full accessibility audit on the current branch
```

**What happens:**
1. Agent scans all HTML/JSX/TSX files
2. Runs axe-core, Pa11y, and Lighthouse tests
3. Auto-fixes safe violations (alt text, contrast, labels)
4. Creates `/docs/ada-compliance-report-{date}.md` with findings
5. Opens GitHub issues for violations requiring human review
6. Commits auto-fixes to a new branch

**Expected output:**
```text
✅ Completed ADA Compliance Audit

Summary:
- Lighthouse Score: 94/100 ✅
- axe-core violations: 2 moderate (auto-fixed)
- Pa11y errors: 0 ✅

Auto-fixed:
- Added alt="" to 12 decorative images
- Improved contrast on 3 text elements
- Added aria-label to 5 icon-only buttons

Manual intervention needed:
- Issue #123: Video on homepage needs captions
- Issue #124: Complex form needs ARIA labels review

Next steps:
- Review and merge branch `fix/accessibility-auto-fixes`
- Address issues #123 and #124
- Re-run audit to verify fixes
```

---

## Example 2: Research Free ADA Certifications

**Scenario:** You want to find free courses to learn about ADA compliance.

**Command:**
```text
Load ada-compliance-agent and research free ADA certification courses available in 2026
```

**What happens:**
1. Agent scans primary certification sources (W3C, ADA National Network, LinkedIn Learning, etc.)
2. Filters for free courses with certificates
3. Prioritizes courses with CEU/CRCC credits
4. Creates `/docs/ada-certifications.md` with findings
5. Posts summary in GitHub Discussions

**Expected output:**
```text
🎓 Free ADA Certification Courses (2026)

Found 8 free courses with certificates:

HIGH PRIORITY (CEU Credits Available):
1. ADA Basic Building Blocks
   - Provider: ADA National Network
   - URL: https://adabasics.org
   - Credits: CEU/CRCC ✅
   - Duration: 2 hours
   - Level: Beginner

2. ADA Title II Tutorial
   - Provider: ADA National Network  
   - URL: https://adatitle2.org
   - Credits: CEU/CRCC ✅
   - Duration: 2 hours
   - Level: Intermediate

RECOMMENDED (No Credits, but High Quality):
3. Digital Accessibility Foundations
   - Provider: W3C WAI
   - URL: https://www.w3.org/WAI/courses/foundations-intro/
   - Credits: Optional paid cert
   - Duration: 4-5 hours
   - Level: All levels

[... 5 more courses ...]

PAID OPTIONS (for advanced certification):
- IAAP CPACC ($425) - Professional certification
- IAAP WAS ($425) - Web accessibility specialist

Created discussion: "New Free ADA Certifications for 2026"
Updated: /docs/ada-certifications.md
```

---

## Example 3: Fix Accessibility Issues in a Pull Request

**Scenario:** CI failed on a PR due to accessibility violations.

**Command:**
```text
Load ada-compliance-agent and fix accessibility violations in PR #42
```

**What happens:**
1. Agent checks out the PR branch
2. Runs accessibility tests
3. Identifies violations
4. Auto-fixes safe violations
5. Comments on PR with results
6. Requests review for manual fixes

**Expected output:**
```text
🔧 Auto-Fixed Accessibility Violations in PR #42

Fixed automatically:
✅ Added alt="Company logo" to logo.png
✅ Increased contrast on button text from 3.2:1 to 4.8:1
✅ Associated label with input field via for/id
✅ Added role="alert" to error message container

Still needs manual review:
⚠️  Main navigation image needs descriptive alt text (not just filename)
⚠️  Modal dialog needs focus trap implementation
⚠️  Video needs closed captions

Pushed fixes to PR #42
Lighthouse score improved: 78 → 92
Remaining violations: 3 (down from 7)

Next steps: Address the 3 manual items above, then re-run tests.
```

---

## Example 4: Scheduled Weekly Compliance Monitoring

**Scenario:** Set up automatic weekly audits that run every Monday at 9 AM.

**Setup:**
1. Copy `skills/ada-compliance-agent/.github/workflows/ada-compliance-check.yml` to your repo's `.github/workflows/`
2. Modify the schedule:
   ```yaml
   schedule:
     - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
   ```

**What happens:**
- Workflow runs automatically every Monday
- Audits all pages on staging environment
- Generates compliance report
- Creates GitHub issue if violations found
- Posts summary to Slack/Discord (if configured)

**Example report:**
```text
📊 Weekly ADA Compliance Report (May 5, 2026)

Trend: ⬆️ Score improved from 89 to 94

Current Status:
- Lighthouse: 94/100 ✅
- WCAG 2.2 AA: 98% compliant ⚠️
- Critical violations: 0 ✅
- Moderate violations: 2 ⚠️

What improved this week:
- Fixed missing alt text on 8 product images
- Improved form labels across checkout flow
- Added keyboard shortcuts documentation

Still needs attention:
- 2 third-party widgets lack keyboard navigation
  (opened issue #456 with vendor)

Certifications completed this month: 1
- ✅ "Digital Accessibility Foundations" (W3C)

Next scheduled audit: May 12, 2026
```

---

## Example 5: 24/7 Continuous Monitoring via OpenRouter

**Scenario:** Run the agent continuously to catch new violations immediately and stay current with ADA standards.

**Setup:**
```yaml
# In your repo's settings or OpenRouter configuration
agent: ada-compliance-agent
mode: continuous
schedule: 24/7
budget: $50/month
alerts:
  - slack-webhook: https://hooks.slack.com/...
  - email: accessibility-team@company.com
```

**What the agent does continuously:**

**Daily:**
- Monitors W3C WAI RSS feeds for new guidelines
- Scans ADA lawsuit database for new accessibility cases
- Checks for updates to testing tools (axe-core, Pa11y, Lighthouse)
- Runs nightly compliance scan on staging

**Weekly:**
- Completes one certification module
- Reviews recent accessibility blog posts and research
- Updates internal documentation with new findings
- Generates compliance trend report

**Monthly:**
- Full production audit
- Completes at least one full certification course
- Benchmarks against top accessibility leaders
- Posts detailed report to GitHub Discussions

**Instant alerts for:**
- New critical WCAG violation detected in production
- Lighthouse score drops below 90
- New accessibility lawsuit filed in your industry
- New free certification course published
- Major update to WCAG or Section 508

**Example alert:**
```text
🚨 ADA Compliance Alert

Type: Critical Violation Detected
Time: 2026-05-08 14:23 UTC
Environment: Production

Issue: Login form missing labels
Impact: Screen reader users cannot complete login
WCAG: Violates 3.3.2 (Labels or Instructions) - Level A
Severity: CRITICAL

Auto-fix available: YES
Estimated fix time: 2 minutes

Action: Agent created PR #789 with fix
Status: Awaiting review and merge

Affected pages: 
- /login
- /signup

Next: Merge PR #789 and deploy to fix immediately.
```

---

## Example 6: Integration with Code Review Process

**Scenario:** Automatically check accessibility on every PR before allowing merge.

**Setup in `.github/workflows/pr-checks.yml`:**
```yaml
name: PR Checks
on: pull_request

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ADA audit
        run: |
          # Load skill and audit PR changes
          load-skill ada-compliance-agent
          audit-pr-changes
      - name: Block merge if violations
        run: |
          # Fail the check if critical violations found
          if [ "$CRITICAL_VIOLATIONS" -gt 0 ]; then
            exit 1
          fi
```

**What happens on every PR:**
1. Agent runs before other checks
2. Only audits changed files (faster)
3. Auto-fixes safe violations
4. Comments on PR with findings
5. Blocks merge if critical violations remain

**Example PR comment:**
```text
## 🔍 ADA Compliance Check

Status: ⚠️ **Action Required**

### Changed Files Audited
- ✅ `components/Button.tsx` - No issues
- ⚠️  `pages/checkout.tsx` - 2 violations
- ✅ `components/Modal.tsx` - Auto-fixed 1 issue

### Auto-Fixed
- Added `aria-label="Close modal"` to close button

### Requires Manual Fix
1. **Missing form label** (Line 45)
   - Issue: Input field for credit card has no label
   - Fix: Add `<label htmlFor="cc-number">Credit Card Number</label>`
   - WCAG: 3.3.2 (Level A)

2. **Low contrast** (Line 78)
   - Issue: Gray text on light gray background (2.8:1)
   - Fix: Change text color to #333 for 4.6:1 contrast
   - WCAG: 1.4.3 (Level AA)

### Next Steps
- [ ] Fix the 2 issues above
- [ ] Push changes
- [ ] This check will re-run automatically

---

❌ **This PR cannot be merged until accessibility issues are resolved.**
```

---

## Example 7: Accessibility Pre-Launch Checklist

**Scenario:** Final accessibility review before launching a new feature.

**Command:**
```text
Load ada-compliance-agent and run complete pre-launch accessibility audit for the payment-flow feature
```

**What happens:**
1. Agent runs full audit suite on feature
2. Tests with actual screen reader (NVDA)
3. Keyboard navigation testing
4. Generates launch readiness report
5. Creates punch list of any remaining issues

**Expected output:**
```text
🚀 Pre-Launch Accessibility Audit: Payment Flow

OVERALL STATUS: ⚠️  NOT READY FOR LAUNCH

Automated Tests:
✅ Lighthouse: 96/100
✅ axe-core: 0 critical violations
✅ Pa11y: 0 errors
✅ Color contrast: All pass
✅ HTML validation: No errors

Screen Reader Testing (NVDA):
✅ All form fields announced correctly
✅ Error messages read aloud
⚠️  Modal close button not announced (Issue #890)
⚠️  Payment total not announced on update (Issue #891)

Keyboard Navigation:
✅ All interactive elements reachable
✅ Focus indicators visible
⚠️  Can't escape credit card iframe with Esc key (Issue #892)

Compliance Checklist:
✅ WCAG 2.2 Level AA: 96% (32/33 criteria)
✅ Section 508: Compliant
✅ ADA Title III: Compliant
⚠️  WCAG 2.2 Level AAA: 78% (optional)

BLOCKING ISSUES (Must fix before launch):
1. Issue #890: Modal close button needs aria-label
   Severity: Medium | WCAG: 4.1.2 | Fix time: 5 min

2. Issue #891: Payment total needs aria-live="polite"
   Severity: Medium | WCAG: 4.1.3 | Fix time: 5 min

3. Issue #892: iframe needs keyboard trap handling
   Severity: High | WCAG: 2.1.2 | Fix time: 30 min

RECOMMENDED (Not blocking, but important):
- Add loading states with aria-busy
- Add progress indicator for multi-step form
- Consider adding payment form instructions for screen readers

LAUNCH RECOMMENDATION: Fix 3 blocking issues (est. 40 min total), then re-audit.
Current risk level: MEDIUM
Estimated time to launch-ready: 1 hour

Would you like me to auto-fix issues #890 and #891?
```

---

## Example 8: Competitive Accessibility Benchmarking

**Scenario:** Compare your accessibility against competitors.

**Command:**
```text
Load ada-compliance-agent and benchmark our checkout flow against Amazon, Shopify, and Stripe
```

**What happens:**
1. Agent audits your checkout flow
2. Audits competitor checkout flows
3. Identifies gaps and opportunities
4. Generates comparison report

**Expected output:**
```text
📊 Accessibility Benchmark Report

YOUR SITE vs. COMPETITORS

Overall Scores:
1. Stripe: 98/100 ⭐⭐⭐⭐⭐
2. Shopify: 95/100 ⭐⭐⭐⭐⭐
3. Your Site: 89/100 ⭐⭐⭐⭐
4. Amazon: 84/100 ⭐⭐⭐⭐

What you're doing well:
✅ Keyboard navigation (better than Amazon)
✅ Color contrast (matches Stripe)
✅ Form labels (matches Shopify)

Where you can improve:
⚠️  Screen reader testing
   - Stripe announces all state changes
   - You only announce errors
   - Recommendation: Add aria-live regions for all dynamic content

⚠️  Loading states
   - Shopify shows accessible loading indicators
   - You show spinner but no text alternative
   - Recommendation: Add "Processing payment..." for screen readers

⚠️  Error recovery
   - Stripe provides clear, actionable error messages
   - Your errors are technical (e.g., "Error code: 402")
   - Recommendation: Rewrite errors in plain language

Quick wins to reach Shopify's level (95):
1. Add aria-live to payment processing status (15 min)
2. Improve error messages (30 min)
3. Add loading state announcements (10 min)

Estimated time to match Stripe's level (98):
- 2-3 days of focused accessibility work
- Key areas: ARIA patterns, focus management, error handling

Detailed comparison report saved to:
/docs/accessibility-benchmark-2026-05-08.md
```

---

## Tips for Effective Use

1. **Start with on-demand audits** to understand your baseline
2. **Enable automated checks** in CI to catch regressions early
3. **Take one free course per month** to continuously improve
4. **Run competitive benchmarking quarterly** to stay ahead
5. **Use 24/7 mode only if budget allows** and you need real-time monitoring
6. **Review auto-fixes before merging** to ensure they make sense in context
7. **Combine with real user testing** - automated tools catch ~40% of issues
8. **Track metrics over time** to show progress to stakeholders

---

## Common Issues and Solutions

### "Lighthouse score varies between runs
- Run multiple times and take average
- Test in incognito mode to avoid extension interference
- Use CI environment for consistent results

### "Agent auto-fixed something incorrectly
- Revert the commit
- Add the pattern to `.ada-compliance-ignore`
- Open issue to improve auto-fix logic

### "Too many false positives
- Configure axe-core rules in `.axerc.json`
- Use `aria-hidden` for truly decorative elements
- Document exceptions in `/docs/ada-exceptions.md`

### "Agent can't access my dev server
- Ensure server runs on `localhost:3000` or configure URL
- Add `--host 0.0.0.0` to make server accessible
- Check firewall isn't blocking

---

**Need more examples?** Open an issue with your use case!
