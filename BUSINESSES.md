# BUSINESSES.md — Master Entity & Project Index

One file that answers "what is what" for the whole empire. Edit in place;
the hub build carries it forward. Placeholders marked `<< FILL IN >>`.

---

## ENTITIES

### 1. Freedom Angel Corp (.org) — NONPROFIT ARM
- **Legal form:** Colorado nonprofit corporation
- **Federal status:** 501(c)(3) — << FILL IN: applied? determination letter date? >>
- **990 filings:** e-Postcard (990-N) filed for years: << FILL IN >>
- **CAGE code:** << FILL IN — recover via SAM.gov Workspace >>
- **SAM.gov:** << FILL IN: active / expired / reactivate by ____ >>
- **Bank account:** NOT YET OPEN — << FILL IN: bank, date opened >>
- **Role:** fundraising for other nonprofits; grantmaking arm; CLE home
- **Projects/repos:** colorado-cle-online, freedom-angel-corps (site), future regranting
- **⚠️ NOTE:** If 501(c)(3) was never formally applied for, 990-N filings alone
  don't establish it — check IRS account. 1023-EZ is $275, ~2–4 weeks.

### 2. Freedom Angel Corps (.com) — BUSINESS / CONTRACTING ARM
- **Legal form:** C-Corp — << FILL IN: filed date, CO SOS ID >>
- **Tax election:** << FILL IN: C-Corp default, or S-Corp election via Form 2553? >>
- **EIN:** << FILL IN >>
- **CAGE code:** << FILL IN — recover via SAM.gov Workspace >>
- **SAM.gov:** << FILL IN: active / expired >>
- **HUBZone:** TARGET — verify address on maps.certify.sba.gov/hubzone/map;
  needs principal office in HUBZone + 35% employees resident (solo counts)
- **Bank account:** << FILL IN >>
- **Role:** payment gateway, product sales, federal contracting vehicle
  (nonprofits CANNOT be HUBZone — no owners to be 51% citizen-owned)
- **Donation model:** % of every sale → Freedom Angel Corp / beneficiary nonprofits
  (start with ONE written co-venture agreement; expand after)

### 3. XI Web Solutions
- **Legal form:** << FILL IN: sole prop / LLC / corp? >>
- **CAGE code:** << FILL IN — recover via SAM.gov or cage.dla.mil search >>
- **Role:** << FILL IN: legacy web business? keep / merge / retire? >>

### 4. Angel Reporters LLC — CLE BUSINESS
- **Legal form:** Colorado LLC
- **CLE provider name:** "Angel" (Colorado Supreme Court accredited) — << FILL IN: provider ID >>
- **Repo:** angel-reporter (archive import 2026-11-05)
- **Content home:** colorado-cle-online (platform, exec summaries, requirements research,
  trending topics, sponsors, App.jsx)
- **NOTE:** CLE materials consolidation target — see CLE section below.

### 5. Uprising Hope LLC — RECOVERY COACHING
- **Legal form:** Colorado LLC
- **Domain:** uprisinghope.com (KEEP; renews 2026-11-13)
- **Focus:** recovery coaching FIRST, life coaching in support
- **Revenue path:** Colorado CPFS certification -> Medicaid H0038 billing;
  subscriptions; KDP workbooks as lead magnets
- **Repo:** Uprising-Hope-LLC (shell - 70K chars of biz dev content in archive)

### 6. Aloha brand — UNFORMED
- **Status:** IDEA STAGE — no entity yet
- **Concept:** << FILL IN: what is the aloha idea in one sentence? >>
- **Repos named 'aloha':**
  - risingaloha = COVID fact-checker Expo app (NOT the brand — name collision)
  - rising-aloha-hub-business = empty shell (AGENTS.md only)
  - livingaloha = << FILL IN: does a repo/domain exist? >>
- **DECISION NEEDED:** keep risingaloha as the debunker app + start brand fresh,
  or fold debunker into the aloha concept? << FILL IN >>

---

## PROJECT FAMILIES

### CLE (consolidate → colorado-cle-online)
| repo | contents | action |
|---|---|---|
| colorado-cle-online | platform, exec summaries, requirements, sponsors, App.jsx | **HOME — keep as master** |
| angel-reporter | LocalFileScout archive (imports/2026-11-05-caresse) | extract CLE materials -> colorado-cle-online/docs |
| Legal-Documents-Court-Filings | legal templates, FOIA, estate planning | keep separate (not CLE; legal-ops library) |

### OSINT (17 repos — sub-grouped)
| family | repos | hub role |
|---|---|---|
| Missing persons | bodyfinders, unfound-docket, case-files | mission core |
| Background/records | background-investigator, background-screening-specialist, forensic-finders-records, forensic-finders-records-phone, forensicfinders | service layer |
| SAR tech | sar-research-fleet, universal-sar-app | R&D fleet |
| OSINT tooling | osint-agent-library, osint-discovery, revvel-forensic-studio, awesome-forensics, ForensicsTools, Digital-Forensics-Guide | tool shelf |
| (excluded) | medical-records-private | PERSONAL — never consolidate |

### KDP / Books (7 repos — done)
kdp-packager (tooling hub) + 6 per-title repos. Pipeline live:
trends -> chapters -> linter -> git -> --book -> cover + answers manifest.

---

## OPEN ACTION ITEMS
- [ ] SAM.gov: recover all 3 CAGE codes (entities 1, 2, 3) -> fill placeholders
- [ ] IRS: verify 501(c)(3) status; file 1023-EZ if never applied ($275)
- [ ] Bank accounts: Freedom Angel Corp (.org) + Freedom Angel Corps (.com)
- [ ] HUBZone map check for home address (maps.certify.sba.gov/hubzone/map)
- [ ] Colorado SOS: confirm corp filings current for both FAC entities
- [ ] Colorado charitable solicitation registration (before fundraising)
- [ ] Aloha brand decision (entity 6)
- [ ] GoDaddy: cancel hosting with no websites; unlist domains not for sale
- [ ] AWS: find & kill accelerator resource behind freedomangelcorp.org

---
*Generated 2026-11-10 · revvel-standards · edit placeholders in place*
