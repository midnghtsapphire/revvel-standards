# Counsel Engagement Brief — HIPAA Scope Determination (WR #15279 / Issue #16111)

**To:** Qualified U.S. healthcare regulatory counsel (HIPAA Privacy/Security + digital health)
**From:** Product / Compliance (Red Light Therapy — WR #15279)
**Date prepared:** 2026-08-08
**Response needed by:** before any health-data tracker, clinic, telehealth, or insurance-adjacent feature ships
**Internal memo to review:** `compliance/red-light-therapy/entity-classification.md`

---

## 1. Ask (one written memo)

Please provide a **written legal memorandum** that answers:

1. Under the facts in §2 of the internal memo (and any facts you require us to confirm), is the operating entity a **HIPAA Covered Entity**, a **Business Associate**, both, or neither?
2. Do the HIPAA Privacy, Security, and Breach Notification Rules **directly apply** to the shipped Red Light Therapy Dosage Calculator and the content-only surface?
3. If **neither CE nor BA** (Path B):
   - State the legal basis.
   - List residual U.S. federal/state privacy obligations you consider material for this D2C wellness posture (e.g., FTC HBNR, WA MHMDA, CCPA/CPRA).
   - Confirm or edit our re-evaluation triggers.
   - State what public language is allowed. We propose never claiming “HIPAA-compliant” under Path B.
4. If **CE and/or BA** (Path A):
   - State the legal basis.
   - List the minimum compliance program that must exist before launch or before accepting any PHI / CE data.
   - Identify categories of vendors that would require BAAs.
5. Please countersign the sign-off block in §8 of `entity-classification.md` (or attach an equivalent signed letter on firm letterhead).

---

## 2. Facts package (attach / point counsel to)

| Artifact | Path |
| --- | --- |
| Internal determination | `compliance/red-light-therapy/entity-classification.md` |
| Data inventory | `compliance/red-light-therapy/data-inventory.md` |
| Re-evaluation triggers | `compliance/red-light-therapy/re-evaluation-triggers.md` |
| Compliance addendum | `wr/issues/issue-15279-hipaa-compliance-addendum.md` |
| Parent WR | `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` |
| FDA track (separate) | `wr/issues/issue-15279-fda-samd-intended-use-strategy.md` |
| Product source | `products/red-light-therapy-dosage-calculator/` |
| Public privacy policy | product route `/privacy` |

### Business model summary (current)

- D2C wellness calculator + educational/affiliate content
- No insurance billing, no Part 162 transactions
- No provider relationship, no BAAs
- Calculator inputs are ephemeral client-side numerics (irradiance, dose, area, etc.)
- No accounts, photos, symptom journals, or postpartum tracking in the shipped calculator
- Explicit non-device / non-diagnostic framing in UI

### Roadmap items that must NOT ship without your re-review

- Clinic / med-spa partnerships
- Telehealth or “share with provider”
- HSA/FSA clinical workflows
- Insurance / claims / eligibility
- Cloud-synced health journals, photos, severity scores tied to identity
- Any request to sign a BAA

---

## 3. Questions we need answered in writing

1. CE status — yes/no + basis
2. BA status — yes/no + basis
3. Does HIPAA directly apply to the shipped calculator?
4. Does HIPAA directly apply to content-only pages with email capture (marketing list, no health inputs)?
5. Which residual regimes apply to the shipped calculator even if HIPAA does not?
6. Are our prohibited framings in entity-classification §5 sufficient?
7. Are re-evaluation triggers complete? Add any we missed.
8. May we state “not a HIPAA Covered Entity or Business Associate under current facts” publicly after your sign-off, provided we still never say “HIPAA-compliant”?
9. If we later add on-device-only photo journals with no cloud sync and no CE relationship, does that change HIPAA entity status? (We understand state privacy law may still apply.)
10. Recommended retention / destruction language for any future health-adjacent features.

---

## 4. Deliverable format (please)

- PDF or DOCX memo on firm letterhead, or secure portal letter
- Date, counsel name, bar jurisdiction
- Explicit Path A or Path B conclusion
- List of assumed facts
- List of triggers that void the opinion
- Permissioned public language paragraph we can paste into the privacy policy / WR
- Copy for repository: place a **redacted** PDF (no unrelated client confidences) at
  `compliance/red-light-therapy/signed/YYYY-MM-DD-hipaa-scope-opinion.pdf`
  and tell eng to set `status.json` accordingly

---

## 5. Human operator steps (plain English)

Someone on the team must do this outside the agent loop:

1. Open this file and `entity-classification.md`.
2. Pick a U.S. healthcare regulatory attorney (HIPAA + digital health experience).
3. Send them this brief + the linked paths (or a zip of the `compliance/red-light-therapy/` folder and the product `/privacy` page).
4. Do **not** ask an AI agent to “sign” as counsel.
5. When the memo returns:
   - Save the PDF under `compliance/red-light-therapy/signed/`
   - Fill §8 of `entity-classification.md`
   - Edit `compliance/red-light-therapy/status.json`:
     - `"status": "COUNSEL_SIGNED_PATH_B"` or `"COUNSEL_SIGNED_PATH_A"`
     - set `"signed_on"`, `"counsel_name"`, `"opinion_path"`
6. If Path A: stop health-data features; open a HIPAA program project before collection.
7. If Path B: keep §5 prohibitions (still never claim “HIPAA-compliant”); continue residual privacy work.

**Success looks like:** `status.json` is no longer `UNSIGNED`, §8 is filled with a real firm name/date, and a PDF exists under `signed/`.

---

## 6. What this brief is not

- Not legal advice from the repository authors or any coding agent
- Not authorization to skip counsel
- Not an FDA SaMD opinion (separate engagement if needed)
