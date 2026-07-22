# Accessibility Standard — WCAG AAA, TTY/TDD, ADA Compliance

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — every Revvel application  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Why Accessibility Is Non-Negotiable for Revvel

Revvel applications serve **disabled veterans, seniors, neurodiverse users, and underserved communities**. These are exactly the groups that face the most barriers online. Building inaccessible apps is a failure of our mission.

Beyond mission: accessibility is **federal law**. The Americans with Disabilities Act (ADA), Section 508 of the Rehabilitation Act, and the Telephone Consumer Protection Act all require accessible services. Insurance products specifically — including burial insurance, life insurance, and pet insurance — must be accessible to all applicants.

**Audrey's daughter uses a TTY line.** This is not a hypothetical user — TTY accessibility is a first-class requirement in every Revvel app.

---

## 2. Compliance Targets

| Standard | Level Required | Why |
|---|---|---|
| **WCAG 2.1** | Level AA minimum, AAA where feasible | Federal law (ADA), Google's standard |
| **WCAG 2.2** | Level AA | Current version (supersedes 2.1 in most guidance) |
| **Section 508** | Full compliance | Required for any federal government business |
| **ADA Title III** | Full compliance | Insurance and financial services are covered entities |
| **EN 301 549** | AA | EU/international accessibility standard |

---

## 3. TTY / TDD — Telephone Communication Access

### What TTY/TDD Is

**TTY** (TeleTypewriter) / **TDD** (Telecommunications Device for the Deaf) allows deaf and hard of hearing people to communicate over phone lines by typing text instead of speaking.

**The 711 Relay Service** is a free nationwide service. Anyone can dial 711 from any phone:
- The relay operator calls the TTY user
- The hearing caller speaks — the operator types their words to the TTY user
- The TTY user types back — the operator reads their response aloud

### What Every Revvel App Must Do

| Requirement | Implementation | Where |
|---|---|---|
| Display TTY number | `app_config.tty_phone` in footer and Contact page | Every page footer |
| Contact form TTY option | "Check if you need TTY relay" checkbox | Contact form, lead forms |
| Agent training note | "Dial 711 to reach TTY users" | Internal agent documentation |
| TTY in JSON-LD | `contactOption: "TDDService"` in Organization schema | `app/layout.tsx` |
| Lead flagging | `leads.requires_tty = true` triggers TTY workflow | CRM / pipeline |

### TTY Footer Display

Every app footer must include:
```html
<p>
  Phone: <a href="tel:[MAIN_PHONE]">[MAIN_PHONE]</a> &nbsp;|&nbsp;
  TTY: <a href="tel:[TTY_PHONE]">[TTY_PHONE]</a> (Hearing Impaired)
  <br />
  <small>TTY users may also dial 711 to reach us through the relay service.</small>
</p>
```

### TTY Contact Page Section

The `/about/contact` page must include a dedicated accessibility section:
```text
📞 Hearing Impaired / TTY Access
Our TTY line: [TTY_PHONE]
You may also reach us through the 711 Relay Service at no cost.
Dial 711 from any phone, and the relay operator will connect you.
We are available [HOURS] [TIMEZONE].
```

---

## 4. The 7 Accessibility UI Modes

Every Revvel application includes a user-controlled accessibility mode selector. Users choose the mode that works best for them. Their preference is stored in `localStorage` and synced to `users.accessibility_mode` in the database.

| Mode | Code | Who It's For | What Changes |
|---|---|---|---|
| **Standard** | `standard` | Everyone — default experience | Normal design, no changes |
| **WCAG AAA** | `wcag_aaa` | Low vision, high contrast needs | High contrast colors, large text (18px+ body), 4.5:1+ contrast ratio everywhere, enhanced focus indicators, reduced motion |
| **Dyslexia-Friendly** | `dyslexia` | Dyslexic users | OpenDyslexic font, wider letter spacing, reduced justified text, cream/warm background instead of white |
| **ADHD Focus Mode** | `adhd` | ADHD users | Minimal UI (hide decorative elements), Pomodoro timer integration, focus mode that dims non-active elements, reduced notifications |
| **Sensory Safe** | `sensory` | Autism, sensory processing disorders | No animations, no auto-playing media, no pop-ups, muted colors, no flashing |
| **Large Print** | `large_print` | Seniors, low vision | 20px+ body text, 2.5× heading sizes, larger click targets (min 44×44px), no tiny text anywhere |
| **ECO / Low Power** | `eco` | Battery conservation, slow connections | No box shadows, no filters, no gradients, minimal images, text-only mode option |

### Mode Selector Component

```tsx
// components/AccessibilityModeSelector.tsx
// Must be accessible from:
// 1. A persistent button in the site header (visible on every page)
// 2. The /about/accessibility page
// 3. Keyboard shortcut: Alt+A opens the mode selector

const modes = [
  { code: 'standard', label: 'Standard', description: 'Default experience' },
  { code: 'wcag_aaa', label: 'High Contrast (WCAG AAA)', description: 'Maximum contrast, large text' },
  { code: 'dyslexia', label: 'Dyslexia-Friendly', description: 'OpenDyslexic font, wider spacing' },
  { code: 'adhd', label: 'Focus Mode (ADHD)', description: 'Minimal UI, focus timer' },
  { code: 'sensory', label: 'Sensory Safe', description: 'No animations, muted colors' },
  { code: 'large_print', label: 'Large Print', description: 'Extra large text and buttons' },
  { code: 'eco', label: 'Low Power / Eco', description: 'Minimal graphics, faster load' },
];
```

### Database Storage

```sql
-- In users table:
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessibility_mode VARCHAR(50) DEFAULT 'standard';
ALTER TABLE users ADD COLUMN IF NOT EXISTS font_size_preference VARCHAR(20) DEFAULT 'medium'; -- 'small', 'medium', 'large', 'xl'
ALTER TABLE users ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false;
```

---

## 5. WCAG 2.2 AA Requirements (The Non-Negotiables)

Every page must pass these before launch:

### 5.1. Perceivable

| Rule | What It Means | How to Implement |
|---|---|---|
| All images have alt text | Screen readers describe every image | `alt` attribute on every `<img>` and `<Image>`. See `SEO_METADATA_STANDARD.md` §3 |
| Color is not the only indicator | Don't say "click the red button" | Use icons + labels, not color alone |
| Text contrast: 4.5:1 minimum | Small text must be readable | Use WebAIM Contrast Checker |
| Text contrast: 3:1 for large text | Headers (18px+) have slightly lower bar | Same tool |
| Captions on video | Deaf users need text for video | Auto-generate captions with Whisper AI, then review |
| Audio description or transcript | Blind users need described video content | Provide text transcript below all videos |

### 5.2. Operable

| Rule | What It Means | How to Implement |
|---|---|---|
| Keyboard accessible | Everything works with Tab + Enter + Space | Test by unplugging your mouse and navigating |
| No keyboard traps | Keyboard focus cannot get stuck | Test modal dialogs, dropdowns, popups |
| Skip navigation link | Let keyboard users skip the nav | `<a href="#main-content" class="sr-only">Skip to main content</a>` |
| Focus visible | Always show which element has focus | Never `outline: none` without a custom visible focus style |
| No keyboard shortcut conflicts | Custom shortcuts must not override browser | Use `Alt+[key]` for app shortcuts |
| Minimum click target: 44×44px | Touch targets must be large enough | All buttons, links, checkboxes: min 44px |
| No timing requirements | Never require an action within a time limit | If you have a countdown, allow extension or disable |

### 5.3. Understandable

| Rule | What It Means | How to Implement |
|---|---|---|
| Language declared | Screen reader reads in right language | `<html lang="en">` (or "es" for Spanish) |
| Error identification | Form errors are specific | "Email is required" not "Error in field 3" |
| Error suggestion | Tell them how to fix it | "Enter a valid email like <name@example.com>" |
| Labels on all inputs | Every form field has a label | `<label for="email">Email</label>` — never rely on placeholder alone |
| Consistent navigation | Nav looks the same on every page | Same component, same order |
| No jargon | Plain language | Replace "EIN" with "EIN (your business tax ID number)" |

### 5.4. Robust

| Rule | What It Means | How to Implement |
|---|---|---|
| Valid HTML | No broken markup | Run HTML validator, Lighthouse audit |
| ARIA labels on interactive elements | Screen readers understand custom widgets | `aria-label`, `aria-labelledby`, `aria-describedby` on all custom components |
| Status messages announced | Success/error toasts reach screen readers | Use `role="alert"` or `aria-live="polite"` on toast notifications |

---

## 6. Form Accessibility (Critical for Lead Forms and Insurance Applications)

Insurance lead forms collect sensitive personal information from people who may have disabilities. Every form must:

```tsx
// Example: Accessible form field
<div className="form-field">
  <label htmlFor="date-of-birth" className="label">
    Date of Birth <span aria-label="required" className="required">*</span>
  </label>
  <input
    id="date-of-birth"
    name="dateOfBirth"
    type="date"
    aria-required="true"
    aria-describedby="dob-hint dob-error"
    aria-invalid={errors.dateOfBirth ? 'true' : 'false'}
  />
  <p id="dob-hint" className="hint">
    Used to calculate your insurance rate. Format: MM/DD/YYYY
  </p>
  {errors.dateOfBirth && (
    <p id="dob-error" role="alert" className="error">
      {errors.dateOfBirth.message}
    </p>
  )}
</div>
```

**Key rules:**
- Every `<input>` must have an associated `<label>` via `for`/`id` pairing
- Error messages must be announced via `role="alert"` or `aria-live`
- Required fields must have `aria-required="true"`
- Invalid fields must have `aria-invalid="true"` when there is an error
- `placeholder` text is not a substitute for a `<label>`
- TTY checkbox must have clear label: "I am deaf or hard of hearing and need to be contacted via TTY relay"

---

## 7. Screen Reader Testing

Before launch, test the app with real screen readers:

| Screen Reader | Platform | Cost | Where to Download |
|---|---|---|---|
| **NVDA** | Windows | Free | nvaccess.org |
| **JAWS** | Windows | Paid (30-day trial) | freedomscientific.com |
| **VoiceOver** | Mac / iPhone | Built-in | Press Cmd+F5 on Mac |
| **TalkBack** | Android | Built-in | Accessibility settings |
| **Narrator** | Windows | Built-in | Win+Ctrl+Enter |

**Minimum test checklist with a screen reader:**
- [ ] Can you navigate the home page using only Tab?
- [ ] Are all images described?
- [ ] Can you fill out the lead form without a mouse?
- [ ] Are error messages announced when a form field is invalid?
- [ ] Do modal dialogs trap focus correctly (focus stays inside modal)?
- [ ] Can you find and use the accessibility mode selector?

---

## 8. Automated Testing Tools

Run these tools in CI/CD before every deploy:

| Tool | What It Checks | How to Run |
|---|---|---|
| **axe-core** | WCAG 2.2 AA violations | `npx axe https://[appurl].com` |
| **Lighthouse** | Accessibility score (target: 90+) | `npx lighthouse --only-categories=accessibility` |
| **Pa11y** | WCAG issues in CI | `npx pa11y https://[appurl].com` |
| **eslint-plugin-jsx-a11y** | JSX accessibility in code | Runs on every PR via ESLint |

**Required CI check: Accessibility score must be ≥ 90 (Lighthouse) before merge to main.**

---

## 9. Font Resources for Accessibility Modes

| Mode | Font | Source | License |
|---|---|---|---|
| Dyslexia | **OpenDyslexic** | opendyslexic.org | Free, open source |
| Large Print / WCAG | **Atkinson Hyperlegible** | brailleinstitute.org/freefont | Free |
| Standard | **Inter** | fonts.google.com | Free (OFL) |
| ADHD Focus | **Lexie Readable** | lexiereadable.com | Free |

---

## 10. Accessibility Compliance Checklist (Per App at Launch)

- [ ] All images have descriptive alt text (no blank or "image" alt text)
- [ ] All form fields have associated `<label>` elements
- [ ] Color contrast is 4.5:1 for body text, 3:1 for large text
- [ ] All interactive elements reachable and operable by keyboard
- [ ] Skip navigation link present on every page
- [ ] Focus indicator visible on all interactive elements
- [ ] TTY phone number in footer, contact page, and Organization JSON-LD
- [ ] TTY checkbox on all lead forms and contact forms
- [ ] Accessibility mode selector accessible from every page header
- [ ] All 7 accessibility modes functional
- [ ] Video captions or transcripts provided
- [ ] `lang` attribute on `<html>` element
- [ ] Error messages use `role="alert"` or `aria-live`
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Pa11y CI check passes with 0 critical errors
- [ ] Tested with NVDA (Windows) or VoiceOver (Mac)
- [ ] `/about/accessibility` page published with commitment statement
- [ ] Accessibility statement page includes TTY number and contact info
