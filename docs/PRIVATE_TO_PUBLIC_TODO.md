# Private → Public Repos TODO

> **Mission:** Make 76 private repos public with proper licenses
> **Status:** Not Started
> **Last Updated:** 2026-04-25

---

## Summary

| Metric | Count |
|--------|-------|
| Total Private Repos | 76 |
| Need Public + License | 74 |
| Keep Private | 2 |
| Already Public | 80+ |

---

## 🚨 PRIORITY REPOS (Revenue-Generating)

| # | Repo | Priority | Status |
|---|------|----------|--------|
| 1 | the-alt-text | 🔴 HIGH | ⬜ TODO |
| 2 | thealttext-backend | 🔴 HIGH | ⬜ TODO |
| 3 | thealttext-frontend | 🔴 HIGH | ⬜ TODO |
| 4 | thealttext-standalone | 🔴 HIGH | ⬜ TODO |
| 5 | revvel-music-studio | 🟡 MEDIUM | ✅ DONE (already public!) |
| 6 | ceremony-spark-toolkit | 🟡 MEDIUM | ⬜ TODO |
| 7 | openclaw-ui | 🟡 MEDIUM | ⬜ TODO |

---

## 📋 ALL PRIVATE REPOS (74 to process)

### Tier 1: High Revenue (7 repos) - ✅ DONE
- [x] the-alt-text
- [x] thealttext-backend
- [x] thealttext-frontend
- [x] thealttext-standalone
- [x] ceremony-spark-toolkit
- [x] openclaw-ui
- [x] revvel-expert-skills

### Tier 2: Core Products (15 repos) - ✅ DONE
- [x] mindmappr
- [x] mindmappr-setup
- [x] ai-benchmarking-tool
- [x] ai-benchmarking-standalone
- [x] datascope-standalone
- [x] data-router-standalone
- [x] smart-ai-router
- [x] universal_oz
- [x] trusty-agents
- [x] openclaw-skills-hub
- [x] revvel-skill-runner
- [x] revvel-skills-vault
- [x] oz-prompt-library

### Tier 3: Consumer Apps (25 repos)
- [ ] Pawsitting
- [ ] anime-ascend
- [ ] anime-ascend-wellness
- [ ] carbon-champions
- [ ] climate-resilience-navigator
- [ ] cozy-haven-hub
- [ ] drive-easy-insure
- [ ] drive-organizer
- [ ] food-freedom-ai
- [ ] gmail-organizer
- [ ] guardaio
- [ ] in-the-wild
- [ ] instant-ordain-certificate-pro
- [ ] lifeos-hub
- [ ] longevity-insights
- [ ] marketing-automation-standalone
- [ ] muse-maker
- [ ] neighborly-services
- [ ] nomad-navigator
- [ ] rent-anything-hub
- [ ] talent-ladder
- [ ] toastbot-ai-scribe
- [ ] wedlock-wizard-mobile

### Tier 4: Utilities & Tools (20 repos)
- [ ] code-review-mcp-server
- [ ] code-review-repo
- [ ] exact-match-display
- [ ] meetaudreyevans-dashboard
- [ ] oath-gate-connect
- [ ] ocean2-v2-research
- [ ] premolt
- [ ] project-face-standalone
- [ ] radiant-recommends-app
- [ ] rags
- [ ] revvel-forensic-studio
- [ ] revvel-template-library
- [ ] rvvel-affiliate-links-mcp
- [ ] secret-sip-feed
- [ ] skill-builder-mobile
- [ ] skin-ai-advisor
- [ ] soil-soul-map
- [ ] sovereign-ai-hub
- [ ] steel-white
- [ ] stellar-insight-archive-tool

### Tier 5: Duplicates (Consolidate Later)
- [ ] rentiverse-finds-it-all
- [ ] rentiverse-finds-it-all-30
- [ ] stellar-insight-archive-tool-93
- [ ] tikiwash-autofill-frontend-kit
- [ ] tikiwash-autofill-frontend-kit-93
- [x] ai-benchmarking-standalone
- [ ] marketing-automation-standalone

### Tier 6: Archives (Keep Private)
- [x] glowstarlabs-vault (KEEP PRIVATE - secrets!)
- [x] meetaudreyevans-archive (KEEP PRIVATE - archive)

---

## ✅ DONE (Already Public)
- [x] revvel-music-studio (2024)
- [x] revvel-standards (2024)

---

## Standard License (Add to all)

```text
MIT License

Copyright (c) 2026 MIDNGHTSAPPHIRE (Audrey Evans)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Automation Commands

```bash
# Make repo public
gh api -X PATCH repos/midnghtsapphire/REPO_NAME -f private=false

# Add license file
gh api repos/midnghtsapphire/REPO_NAME/contents/LICENSE \
  --method PUT -F "content=$(base64 -w0 LICENSE)" -F "message=Add MIT license"
```

---

## Next Steps

1. **Pick a tier** to work on (start with Tier 1)
2. **For each repo:**
   - Make public via GitHub API
   - Add LICENSE file
   - Verify branch protection
3. **Update this document** with progress
