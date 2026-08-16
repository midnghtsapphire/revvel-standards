# WR: FDA SaMD Intended-Use Scoping and Disclaimer Strategy — Issue #15279

**Status:** ACTIVE  
**Related Issues:** #15279, #16114  
**Related Documents:**
- `wr/issues/issue-15279-hipaa-compliance-addendum.md` (HIPAA — separate track)
- `wr/issues/issue-15279-hipaa-compliance-clarification.md`
- `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`

**Prime Directive Alignment:** Protect the $10k → $10M revenue path by keeping the red light therapy product in the FDA general wellness category, avoiding costly and time-consuming SaMD classification that would delay launch.

---

## 1. Problem Statement

The red light therapy app is at risk of FDA Software as a Medical Device (SaMD) classification if any feature makes claims of diagnosis, cure, mitigation, treatment, or prevention of disease. FDA SaMD classification is **independent of HIPAA** and must be treated as a separate compliance track.

**Key distinction (from compliance addendum §4.4):**

> These disclaimers reduce SaMD risk. They do NOT and cannot reduce HIPAA, HBNR, MHMDA, or GDPR obligations.

---

## 2. Intended-Use Statement

### Scope: General Wellness

This product is positioned as a **general wellness** tool under:

- **FDA General Wellness Policy** (September 2019 guidance): Products that promote a healthy lifestyle or general wellness, and do not make claims about specific diseases or conditions, are not subject to FDA enforcement as medical devices.
- **21st Century Cures Act §3060**: Software functions for maintaining or encouraging a healthy lifestyle that are not intended to diagnose, cure, mitigate, treat, or prevent a disease are excluded from the definition of "device."
- **21 CFR 880.6760**: General wellness devices intended for general wellness use.

### Intended-Use Statement (for all product surfaces)

> This application is a general wellness and educational tool for photobiomodulation (red light therapy) session planning. It provides informational calculations based on user-supplied device parameters. It is not a medical device and is not intended to diagnose, treat, cure, mitigate, or prevent any disease or medical condition. Users should consult a qualified healthcare professional for medical advice and before beginning any therapy regimen.

---

## 3. In-App Disclaimer (Required on All Health-Output Screens)

The following disclaimer must appear on every screen where health-related recommendations, calculations, or guidance are displayed:

> **This app is for general wellness and informational purposes only. It is not a medical device and does not diagnose, treat, cure, or prevent any condition.**

---

## 4. Phase-Specific SaMD Risk Assessment

### Phase 1 — Wellness Tracker and Dosage Calculator (Current)

**SaMD Risk Level:** LOW

The current product provides:
- A mathematical dosage-time calculator based on the universal formula `time = (dose × 1000) / irradiance`
- Session logging and weekly dose tracking
- Educational information about photobiomodulation

**Mitigations applied:**
- [ ] All output labeled as "Estimated" or "Calculated" — never "Recommended" or "Prescribed"
- [ ] Required wellness disclaimer displayed on output screens
- [ ] No diagnostic claims in UI copy, protocol guides, or metadata
- [ ] No dosimetry recommendations that constitute treatment guidance — calculator is a math tool, not a protocol engine
- [ ] Intended-use statement documented (this document)

### Phase 2 — AI Skin Analysis (Future)

**SaMD Risk Level:** HIGH

If the AI analysis output can be interpreted as a diagnostic claim (e.g., "your skin shows signs of condition X" or "this protocol will treat Y"), the product crosses into SaMD territory.

**Required before shipping Phase 2:**
- [ ] Conduct formal FDA SaMD classification review with regulatory counsel
- [ ] Evaluate 510(k) vs. De Novo pathway if diagnostic claims cannot be fully removed
- [ ] If staying in general wellness: ensure AI output is strictly informational/educational with no condition-specific claims
- [ ] Document SaMD classification decision and rationale

---

## 5. Language Audit Checklist

All in-app copy, protocol guides, marketing materials, and metadata must be audited for the following prohibited terms and replaced with compliant alternatives:

| Prohibited Language | Compliant Alternative |
| --- | --- |
| "Recommended dose/time" | "Estimated session time" or "Calculated session time" |
| "Treatment" | "Session" or "Routine" |
| "Treats [condition]" | "Supports general wellness" |
| "Diagnoses" | "Provides information" |
| "Cures" | (Remove entirely) |
| "Prevents [condition]" | "Promotes healthy habits" |
| "Prescribed" | "User-configured" |
| "Medical advice" | "Educational information" |
| "Dosage recommendation" | "Dose calculation based on your inputs" |
| "Therapeutic protocol" | "Session plan" |

---

## 6. Dosimetry Position

The calculator performs a mathematical conversion from user-supplied irradiance and target dose values to session time. This is equivalent to a unit converter and does not constitute treatment guidance because:

1. The user supplies all input parameters — the app does not suggest or prescribe dose values
2. Output is labeled as a calculated estimate, not a recommendation
3. No condition-specific protocols are provided
4. No claims about therapeutic efficacy are made
5. A disclaimer directs users to qualified clinicians for medical decisions

---

## 7. References

- FDA General Wellness Guidance (September 2019): <https://www.fda.gov/media/90652/download>
- 21st Century Cures Act §3060: Software exclusion from device definition
- 21 CFR 880.6760: General wellness devices
- FDA SaMD Framework (IMDRF): <https://www.fda.gov/medical-devices/digital-health-center-excellence/software-medical-device-samd>
- Compliance addendum: `wr/issues/issue-15279-hipaa-compliance-addendum.md`
