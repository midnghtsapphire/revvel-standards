# Red Light Therapy — HIPAA / Privacy Compliance Pack

**Issue:** #16111  
**Parent WR:** #15279  
**Product:** `products/red-light-therapy-dosage-calculator`

This folder is the system of record for HIPAA **entity scope** documentation for the red light therapy consumer surface.

## Files

| File | Purpose |
| --- | --- |
| `status.json` | Machine-readable status (`UNSIGNED`, `COUNSEL_SIGNED_PATH_B`, `COUNSEL_SIGNED_PATH_A`, `REEVAL_REQUIRED`) |
| `entity-classification.md` | Internal determination + counsel sign-off block |
| `counsel-engagement-brief.md` | Packet to send to qualified healthcare counsel |
| `re-evaluation-triggers.md` | Human-readable hard gates |
| `re-evaluation-triggers.json` | Machine-readable hard gates |
| `data-inventory.md` | What the shipped calculator actually collects |
| `signed/` | Drop zone for counsel PDF (see `.gitkeep`) |

## Hard rules

1. **`allows_hipaa_compliance_claim` is always false** unless a full Path A HIPAA program is implemented and separately attested. Path B confirmation still does **not** authorize “HIPAA-compliant” marketing.
2. Agents must **never** set `status` to a `COUNSEL_SIGNED_*` value. Only a human after real counsel returns a memo.
3. Any trigger in `re-evaluation-triggers.json` → set `REEVAL_REQUIRED` and stop the feature.
4. Public privacy policy must describe actual data handling and must **not** claim HIPAA compliance while unsigned or on Path B without a program.

## Current status

See `status.json`. On creation it is `UNSIGNED` with provisional Path B facts documented for counsel.
