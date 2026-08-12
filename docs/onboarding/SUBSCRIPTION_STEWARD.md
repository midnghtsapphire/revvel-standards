# Subscription Steward — Starter Guide

**Welcome!** This is your job description, tailored to be doable in a
browser with no coding.

Your goal in one sentence: **make sure no subscription surprises us.** No
lapsed trials, no auto-charges we didn't plan for, no "the site went down
because a $10 renewal failed."

You are not being asked to write code, review PRs, or understand any of the
AI-agent stuff. You are being asked to be the person who watches the money
clocks. That's it. It's a real, valuable, well-scoped job.

---

## What "subscriptions" means here

Every third-party tool the business pays for — hosting, AI review tools,
domain names, GitHub apps, etc. Each one has:

- A **renewal date** (when it charges us again) or a **trial end date**
  (when a free trial becomes a paid subscription unless we cancel)
- A **cost** per month or year
- A **dashboard URL** (where you go to change or cancel it)
- A **status** — is it actively used, on trial, evaluating, or cancelled

All of that lives in one file: **[`data/subscriptions.yml`](../../data/subscriptions.yml)**.
That is your source of truth. Every time something changes in the real
world (you cancelled a trial, extended a subscription, changed the plan),
that file needs to reflect it, or the automated tracker gets confused and
starts nagging us.

---

## What you actually do — the whole job

### Weekly (Monday, 10-15 minutes)

1. Open the "Subscription Tracker" issue in the repo. It updates itself
   every Monday morning UTC. The URL is at the bottom of this page under
   "Bookmarks — save these".
2. Read the top section: "Expiring in the next 14 days" and "Past due".
3. For each item:
   - **If nothing needs doing** (renewal is fine, we're happy with the tool)
     → check it off in your list and move on
   - **If we can afford the renewal** (see budget planning below) → make
     sure the payment card on file at that vendor is valid; if not, update
     it in that vendor's dashboard
   - **If we cannot afford it this month** (short on cash) → log into
     that vendor's dashboard and either downgrade, pause, or manually
     extend/cancel BEFORE the date. Do not let it auto-charge and then
     have to fight for a refund. Manual > reactive, always.
   - **If a trial is about to convert to paid and we don't want to keep
     it** → cancel BEFORE `trial_end`. Add a note to `data/subscriptions.yml`
     saying "cancelled YYYY-MM-DD".

### Monthly (first business day, 20 minutes)

1. Look at your budget plan for this month (you'll build one — see below).
2. Compare to the "renewal_date within this month" items in the tracker.
3. Flag anything that will charge before payday. If you're short:
   - Move the payment date if the vendor allows it (some do — DigitalOcean,
     Vercel, most SaaS)
   - Downgrade to a cheaper tier that renews later
   - Cancel and re-subscribe after payday (only if losing a few days of
     access is OK)
4. Post a brief summary comment on the Subscription Tracker issue: "August
   plan: X will renew Y, we're good. Z is deferred until next payday."

### As-needed (when your dad tells you something changed)

1. He adds a new tool → you add it to `data/subscriptions.yml` (I'll show
   you exactly how, below — it's a copy-paste template)
2. He cancels a tool → you change its `status` to `cancelled` and add a note
3. Bill amount changed → you update the `cost` field
4. Vendor sent an email saying "your card is expiring" → update the card
   in that vendor's dashboard, that's it. You don't touch the code file
   for that.

---

## Budget planning ahead — the exact template

The whole point of doing this AHEAD instead of reactively is to catch
"we can't afford this next Tuesday" while it's still Sunday and there's
time to do something.

### At the start of each month, write out this table

Paste this template into a note app, a spreadsheet, or a GitHub issue —
whichever you prefer. Fill it in from `data/subscriptions.yml`.

```text
Month of _____________

Payday(s) expected this month:
  - Date: ______  Amount: ______
  - Date: ______  Amount: ______

Fixed subscription costs this month:
  Date        Vendor              Amount    Status
  ----------  ------------------  --------  ---------
  YYYY-MM-DD  ________________    $______   auto-renew / need to act
  YYYY-MM-DD  ________________    $______   auto-renew / need to act
  YYYY-MM-DD  ________________    $______   auto-renew / need to act
  ----------                     --------
  TOTAL                            $______

Total after subs cleared: (payday - total subs) = $______

RED FLAGS (subs whose bill lands BEFORE the payday that covers them):
  - ______________________________________________________________
  - ______________________________________________________________

Actions this month:
  [ ] ______________________________________________________________
  [ ] ______________________________________________________________
```

### How to know how much each is going to cost

In `data/subscriptions.yml`, each subscription has a `cost` and a
`billing_cycle`. Cost is in USD unless the `currency` field says otherwise.

- `billing_cycle: monthly` — that cost hits every month on the renewal date
- `billing_cycle: annual` — hits once a year, and it's a bigger number
- `billing_cycle: usage` — variable, based on how much we used it (you can't
  perfectly predict this one; check the vendor dashboard for last month's
  actual bill as a rough estimate)
- `billing_cycle: free` — costs $0 this month

### Short-term (2-week / monthly) subscriptions — the pattern to watch

Some tools (RecurseML, some AI tools) auto-charge every 14-30 days. If we
don't have money in that window:

- **Cancel** just before the charge, and **manually re-subscribe** after
  payday. Yes it's a little annoying, but it saves us from failed charges
  or overdrafts.
- Update `data/subscriptions.yml` with the new dates each time. This is
  the manual work the tracker can't do for us.

---

## The exact steps for common actions

### How do I check the tracker

1. Go to <https://github.com/midnghtsapphire/revvel-standards/issues>
2. In the search bar type: `label:subscription-tracker is:open` and hit enter
3. Open the first result — that's the current tracker report
4. Scroll to the "Expiring in the next 14 days" section

### How do I update a renewal date after I extended a subscription

1. Go to <https://github.com/midnghtsapphire/revvel-standards>
2. Click the folder `data/`
3. Click `subscriptions.yml`
4. Click the pencil ✏️ icon in the top-right of the file view to edit
5. Find the subscription you extended (search on the page with Ctrl+F / Cmd+F)
6. Change the `renewal_date:` line to the new date, keeping the format
   `YYYY-MM-DD` (e.g. `2026-09-15`)
7. Scroll to the bottom → "Commit changes" button
8. In the commit message field type something like:
   `chore(subs): update Bito renewal_date after paying`
9. Choose "Create a new branch and open a pull request" (this is the safe way)
10. Click "Propose changes"
11. On the next page click "Create pull request"
12. Add `@midnghtsapphire` as reviewer (dad) — he'll approve and merge it

That's it. You didn't touch code, you touched one line in a config file
using the browser.

### How do I add a new subscription to the file

Same as above, but instead of editing an existing entry, scroll to the
bottom of the `subscriptions:` list and add a new block. Template:

```yaml
  - name: NAME_HERE                  # e.g. "Namecheap"
    vendor: VENDOR_HERE              # e.g. "Namecheap Inc"
    type: saas                       # or: github_app, api, hosting, ci, other
    status: active                   # or: trial, cancelled, evaluating
    trial_start: null                # YYYY-MM-DD if it's a trial, else null
    trial_end: null                  # YYYY-MM-DD if it's a trial, else null
    renewal_date: 2027-01-15         # YYYY-MM-DD next charge date
    billing_cycle: annual            # or: monthly, usage, free
    cost: 12                         # a number, no dollar sign
    currency: USD
    repositories: all                # or a specific list like [midnghtsapphire/revvel-standards]
    dashboard_url: https://...       # where dad manages this subscription
    decision_doc: null               # leave null unless he tells you otherwise
    notes: >-
      Anything worth remembering, like: "billed on the 15th of each month",
      "card expires 2027-06", "yearly plan cheaper than monthly".
```

Indentation is important — the file uses 2 spaces, never tabs. Copy an
existing entry above the one you're adding as your template and change the
values.

### The commit / PR thing looks scary — do I have to do that

Not for everything. You have two options depending on what you're doing:

**Option A — the file edit + PR flow above.**
Use this when the change is important and should be recorded permanently
(a subscription renewed, a new tool added, a cancellation).

**Option B — just leave a comment.**
Use this for reminders, questions, "hey dad this looks weird, should we
cancel it?" Open the Subscription Tracker issue and just leave a comment.
No file editing. Dad reads it and either answers or does the file edit
himself.

**When in doubt: leave a comment first.** It's the "raise your hand" option
and it's always safe.

---

## What NOT to do

- ❌ Don't edit any file that isn't `data/subscriptions.yml` or a
  personal note file. Everything else has code implications.
- ❌ Don't share the dashboard passwords/emails with anyone
- ❌ Don't cancel anything without checking with dad first if you're unsure
  (renewals within your budget plan are fine — but if you're not sure, ask)
- ❌ Don't buy new subscriptions on the business — that's dad's call
- ❌ Don't panic if a workflow shows red — dad will handle "red workflows".
  Your job is subscriptions, not the automation stuff around them.
- ❌ Don't respond to unsolicited emails from vendors asking for card info
  or account access. Real vendors don't email you asking you to click a
  link and enter your card. Always go through the dashboard URL in
  `data/subscriptions.yml`, never an email link.

---

## Bookmarks — save these in your browser

Save these five links as bookmarks. Everything you need is one of them.

1. **The tracker issue** —
   <https://github.com/midnghtsapphire/revvel-standards/issues?q=is%3Aissue+label%3Asubscription-tracker+is%3Aopen>

2. **The data file** —
   <https://github.com/midnghtsapphire/revvel-standards/blob/main/data/subscriptions.yml>

3. **This guide** —
   <https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/onboarding/SUBSCRIPTION_STEWARD.md>

4. **The "explore apps" tour** —
   <https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/onboarding/APP_TOUR.md>

5. **Your monthly-plan template** — a copy of the budget block above,
   stored wherever you prefer (Notion, Google Doc, a note app, whatever)

---

## Getting familiar with GitHub — no code required

You do not need to learn any coding. You need to know how to:

1. **Log in to GitHub** — sign in with your own account. Dad will invite you
   as a **collaborator** on this repository so you can leave comments and
   open PRs against `data/subscriptions.yml`. You do NOT need admin access.
2. **Read an issue** — an "issue" is basically a threaded conversation with
   a title. The Subscription Tracker is one of these. Click, read, scroll.
3. **Leave a comment** — there's a big comment box at the bottom of every
   issue. Type. Click "Comment". Done.
4. **Edit a file in the browser** — Option A flow above. Pencil icon,
   change text, commit-with-PR.
5. **Approve a pull request** — dad may sometimes ask you to click "Approve"
   on a PR (his or another agent's) that affects a subscription. There's a
   green "Review changes" button on the PR — click it, pick "Approve",
   click Submit. That's it. Never click "Request changes" or "Merge"
   unless dad has told you to specifically.

That's the entire GitHub skill list for your job. Everything else is
optional and you can pick it up later if you're curious.

---

## Questions you'll have, answered upfront

**"What if I mess up the YAML file?"**
It's fine. When you commit through a PR (Option A), an automated check
runs and will refuse the change if the YAML is invalid. It's essentially
impossible for you to break anything permanently through that flow. Worst
case: dad rejects the PR, tells you what to fix, you try again.

**"What if I forget to check on Monday?"**
The tracker doesn't care what day you look at it — it'll still be there.
If a subscription expires and we miss it, we deal with it. That's better
than nobody watching at all, which is the current state.

**"What if a vendor asks me for a credit card?"**
Never give one over email. Only in the vendor's real dashboard URL from
`data/subscriptions.yml`. And check with dad before entering any new card.

**"What if I don't understand what a subscription does?"**
Add a comment on the tracker issue: "Hey dad, what does RecurseML actually
do? Should we keep it?" That's exactly the right question. Dad will fill
you in and it'll become obvious what to keep and cut.

**"What if a subscription's dashboard requires a login I don't have?"**
Ask dad for it. Some tools he'll want you to have access to (the ones you
manage), some he'll want to keep the login himself. That's his call.

---

## Progression — after 30 / 60 / 90 days

You'll naturally get more comfortable. Optional growth path if you want it:

- **After 30 days:** you'll know all 13 current subscriptions by heart and
  what each one costs
- **After 60 days:** you can spot patterns — "we spend $X/mo on AI review
  tools, is that worth it?" — that's real business value
- **After 90 days:** if you want, dad can teach you the next thing (WRs,
  labels, whatever comes next). Or you can stop here — subscription
  stewardship alone is a real, valuable job

**Do not feel obligated to move past subscriptions.** This job is enough
on its own if you like it.

---

## Contact

- Dad: use `@midnghtsapphire` in any comment and he gets a notification
- If something feels urgent and he isn't answering GitHub: text him
- If something feels URGENT-urgent (a critical service is going to expire
  in 24 hours and you can't reach him): update the file yourself with
  your best guess and add a note like "acted on my own — please review".
  Better to act imperfectly than not act at all.

---

_This guide was written by an AI agent (OpenHands) on behalf of
@midnghtsapphire specifically for you. If anything here is unclear or wrong,
tell dad — he'll fix it and it'll be corrected for future editions. Every
question you ask makes this guide better for the next person._
