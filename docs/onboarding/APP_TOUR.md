# App Tour — What Are All These Things

Companion to [SUBSCRIPTION_STEWARD.md](./SUBSCRIPTION_STEWARD.md).

This is a plain-English tour of every third-party tool we currently pay
(or don't pay) for. No jargon. No agent stuff. Just: what is this, why is
it here, what does it cost, where's the dashboard.

**Note on prices:** these are current as of 2026-08-10. Prices change
often. If you see a different price on a vendor's site, trust the vendor —
and please update `data/subscriptions.yml` with the new amount.

---

## The 13 subscriptions, one by one

### 1. Vercel — hosting for our websites

- **What it does:** it's where our websites actually "live" so people can
  visit them. Think of it like the electricity bill for a website.
- **Cost:** $0 today (we're on the free tier); usage-based if we get big
- **Renews:** month by month
- **Dashboard:** <https://vercel.com/oaudrey-projects>
- **Cancel impact:** every one of our public sites would go dark. Don't cancel.

### 2. DigitalOcean — hosting for smaller things + our droplet

- **What it does:** rents us cloud servers. Some sites live here instead
  of Vercel. Also runs some backend jobs.
- **Cost:** ~$250/month
- **Renews:** monthly, currently marked 2026-07-15 (past due — needs review)
- **Dashboard:** <https://cloud.digitalocean.com/>
- **Cancel impact:** any site or service running on DO goes dark. Before
  cancelling, dad has to migrate the sites off first. This is a "flag and
  discuss" not a "just cancel."

### 3. OpenRouter — the AI brain gateway

- **What it does:** it's how all our AI tools (agents, review bots)
  connect to actual AI models (Claude, GPT-4, etc.) without us needing
  a separate account for each one.
- **Cost:** $0 up-front; pay-as-you-go per AI call
- **Renews:** usage-billed
- **Dashboard:** <https://openrouter.ai/settings/credits>
- **Cancel impact:** most of our AI automations stop working. High-value,
  don't touch.

### 4. GitHub Copilot — AI coding assistant

- **What it does:** helps dad write code by suggesting completions as he
  types. Not a review tool — a typing helper.
- **Cost:** $10/month
- **Renews:** monthly
- **Dashboard:** <https://github.com/settings/copilot>
- **Cancel impact:** dad codes slower. Renew if we have $10; skip if we
  don't. Non-critical.

### 5. Cursor — AI-first code editor

- **What it does:** a whole code-editing app with AI built in. Overlaps
  with Copilot but different UI. Dad uses it for some kinds of work.
- **Cost:** $20/month
- **Renews:** monthly
- **Dashboard:** <https://cursor.com/settings>
- **Cancel impact:** dad falls back to Copilot + regular VS Code. Skippable
  if budget is tight.

### 6. RecurseML — AI code reviewer (paid, expensive)

- **What it does:** reads pull requests (proposed code changes) and posts
  comments saying what's wrong or risky, before we merge them. It's like
  having a senior developer double-check every change.
- **Cost:** ~$10 every 2 weeks OR $250/year (annual is cheaper by ~$10/yr)
- **Renews:** trial ended 2026-06-27, currently short-term recurring
- **Dashboard:** <https://app.recurse.ml>
- **Cancel impact:** we lose one review bot. We still have Bito, Cubic,
  Octopus, Copilot-reviewer, Jules, and Cursor as alternatives. This is a
  "nice to have" not critical. If money is tight, cancel and re-add later.

### 7. Bito — AI code reviewer (going to be $12/month soon)

- **What it does:** same idea as RecurseML — reads PRs and comments —
  but from a different vendor. Free tier right now; upgrading to Team
  plan when dad has budget.
- **Cost:** $0 today; $144/year once upgraded ($12/mo annual)
- **Renews:** monthly on free plan
- **Dashboard:** <https://app.bito.ai>
- **Cancel impact:** none today (we're on free). After upgrade, we lose
  one review bot. Same "nice to have" as RecurseML.
- **Big note:** Bito prices are changing a lot in 2026. If a price on
  their dashboard is different from what's in `data/subscriptions.yml`,
  trust the dashboard and update the file.

### 8. Devin — an autonomous AI coding agent

- **What it does:** a fancy AI that can be given a task and it writes code
  autonomously. Expensive but sometimes worth it for big jobs.
- **Cost:** ~$80/month
- **Renews:** monthly, currently marked 2026-07-08 (past due — needs review)
- **Dashboard:** <https://preview.devin.ai/settings/billing>
- **Cancel impact:** dad loses one autonomous coder. He can compensate
  with OpenHands + Copilot. If money is tight and he isn't actively using
  Devin, this is a good one to pause.

### 9. Cubic — AI code reviewer (free tier)

- **What it does:** another AI reviewer, free tier.
- **Cost:** $0
- **Renews:** monthly, free
- **Dashboard:** <https://app.cubic.dev>
- **Cancel impact:** we lose one free reviewer. No reason to cancel a free tool
  unless it stops working.

### 10. Octopus Review — AI code reviewer (free tier)

- **What it does:** another AI reviewer, free tier.
- **Cost:** $0
- **Renews:** monthly, free
- **Dashboard:** <https://octopus.review>
- **Cancel impact:** we lose one free reviewer. Keep.

### 11. CodeRabbit — AI code reviewer (evaluating)

- **What it does:** another AI reviewer, currently evaluating whether
  it's worth using.
- **Cost:** $0 during evaluation
- **Renews:** monthly free
- **Dashboard:** <https://app.coderabbit.ai>
- **Cancel impact:** none today.

### 12. Jules — Google's AI coding agent

- **What it does:** Google's autonomous coding agent. Beta / free access.
- **Cost:** $0 today (usage-based when it converts)
- **Renews:** usage-based
- **Dashboard:** <https://jules.google/settings>
- **Cancel impact:** we lose one AI coder. Free today so keep.

### 13. Doppler — secret storage

- **What it does:** stores passwords, API keys, and other secrets in one
  central place so we don't have to paste them into every tool.
- **Cost:** $0 (free tier)
- **Renews:** monthly free
- **Dashboard:** <https://dashboard.doppler.com>
- **Cancel impact:** things start breaking because secrets aren't
  available where they need to be. Don't cancel.

---

## Domain names (a separate category — not in subscriptions.yml yet)

Dad also owns a few `.com` domain names through Namecheap. Those renew
annually and are their own $10-15 each per year. When you're comfortable
with the main list, ask dad to add those to `data/subscriptions.yml` so
they get tracked too.

---

## Summary — the money picture at a glance

| Category | Current monthly cost |
|---|---|
| Hosting (Vercel + DigitalOcean) | ~$250 |
| AI coding help (Copilot + Cursor + Devin) | ~$110 |
| AI code review (RecurseML paid, Bito on free) | ~$20 (short-term recurring) |
| Everything else (Doppler, OpenRouter, Cubic, Octopus, CodeRabbit, Jules) | $0 (all free tiers or usage-based) |
| **Approximate total baseline** | **~$380/month** |

Actual bills will vary because OpenRouter and Vercel are usage-based.
Some months are lower, some higher.

---

## Guiding principles for you

1. **Free tools stay unless they break.** No reason to cancel something
   that costs $0.
2. **Paid tools we're not using = pause first.** If we have money later,
   we can reactivate.
3. **Hosting > AI tools.** If we have to cut something, cut a nice-to-have
   AI reviewer before we cut a hosting bill that keeps a real customer-
   facing website up.
4. **Trials are traps if you forget them.** Every trial has a date it
   auto-charges. That date must be in `data/subscriptions.yml` and you
   must handle it BEFORE the date, not after.
5. **When in doubt, comment don't act.** Leaving a question on the tracker
   issue is always safe. Cancelling something dad still uses is not.

---

_See [SUBSCRIPTION_STEWARD.md](./SUBSCRIPTION_STEWARD.md) for the actual
step-by-step of how to do the work. This file just explains WHAT each
thing is._
