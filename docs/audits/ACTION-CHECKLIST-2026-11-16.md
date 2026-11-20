# ✅ ACTION CHECKLIST — 2026-11-16
**One page. Top to bottom. Items marked 🤖 are being done by the agent today (draft PR, nothing merges without you). Items marked 🧑 are you-only — no agent can do them.**

## 🧑 YOU — 5 phone calls / clicks (unblocks everything)
- [ ] **1. GitHub billing** — decide: unlock Actions billing, or commit to CircleCI-only + n8n. (Everything hosted is dead until decided.)
- [ ] **2. CAGE renewals** — 8ZRW3 (XI Website Solutions LLC) + 90SN0 (Freedom Angel Corp), both expired May 2026 → call DLA **1-877-352-2255**
- [ ] **3. IRS transcript** — call this quarter (per compliance clock)
- [ ] **4. DigitalOcean** — set GitHub secret `DIGITALOCEAN_TOKEN` on revvel-standards → oAudrey can deploy
- [ ] **5. Cloudflare DNS** — add App Platform records for `oaudrey.com`, `www.oaudrey.com`, `fieldwork.oaudrey.com` (do NOT move nameservers)

## 🤖 AGENT — today (as draft PR to revvel-standards, you review & merge)
- [ ] **6. Retirement record** — `docs/governance/RETIREMENTS-2026-11-16.md`: every retired process documented (63 silenced crons, Cursor chain, VEINS silence, superseded rules) — retire, never delete
- [ ] **7. Spec-to-action bridge** (pending WR 03) — workflow that auto-applies `wr:code` after research completes, so research stops dying as essays
- [ ] **8. Stale branch cleanup** — delete only branches **already merged into main** (bot branches from the Aug hyper-automation era). Commits stay in history forever; zero work lost
- [ ] **9. Audit + this checklist filed in-repo** — `docs/audits/` so the next agent (or you, at midnight) can see who did what

## 🤖 AGENT — after you merge the PR
- [ ] **10. Stale-branch sweep** — run existing `stale-branch-cleanup.yml` manually once
- [ ] **11. Proof-of-life product run** — pick ONE: `reese-reviews` (your stated #1) or `kdp-packager` (closest to cash) — run it through all 8 pipeline steps end-to-end
- [ ] **12. Secrets sanity sweep** (pending WR 12) — verify `<APP>_API_KEY` / `_TOKEN` naming repo-wide (PR #18417 started this)

## ⏸ PARKED until billing/DNS decisions land
- [ ] 4 staged Railway releases → approve/apply + verify payment
- [ ] n8n/Gumloop migration of always-on jobs (pending WR 05)
- [ ] VEINS engine reactivation — gated on pending WR 14 (grounding gate)

---
*Rule in effect: retire with a dated note, never delete. Draft PRs only; Audrey merges.*
