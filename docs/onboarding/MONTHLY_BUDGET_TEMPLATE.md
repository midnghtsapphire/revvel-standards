# Monthly Subscription Budget — Template

Copy this template to a new note (in Notion / Google Doc / a paper notebook —
whatever works for you) at the start of each month. Fill it in. Refer back
to it during the month.

You don't need to commit this to GitHub. It's YOUR planning tool.

---

## Month of: __________________

### Payday(s) expected

| Date | Amount | Notes |
|---|---|---|
| ________ | $______ | ______________________ |
| ________ | $______ | ______________________ |

**Total income expected this month:** $______

---

### Fixed subscription costs due this month

Look at `data/subscriptions.yml` and pull every entry whose `renewal_date`
or `trial_end` falls inside this month. List them here in date order.

| Renewal date | Vendor | Amount | Auto-renew? | Action if needed |
|---|---|---|---|---|
| ________ | ______________ | $______ | Yes / No | ___________________ |
| ________ | ______________ | $______ | Yes / No | ___________________ |
| ________ | ______________ | $______ | Yes / No | ___________________ |
| ________ | ______________ | $______ | Yes / No | ___________________ |
| ________ | ______________ | $______ | Yes / No | ___________________ |
| ________ | ______________ | $______ | Yes / No | ___________________ |

**Total fixed subs this month:** $______

---

### Variable / usage-billed subscriptions (rough estimate)

These are billed based on how much we used them last month. Look at last
month's actual bill for each vendor's dashboard to estimate.

| Vendor | Last month | Rough estimate this month |
|---|---|---|
| Vercel | $______ | $______ |
| OpenRouter | $______ | $______ |
| DigitalOcean (over-usage) | $______ | $______ |

**Total variable estimate:** $______

---

### The math

```text
    Income expected     $ ____________
  - Fixed subs          $ ____________
  - Variable estimate   $ ____________
  --------------------  --------------
  = Remaining           $ ____________
```

If **Remaining is negative**, you have a shortfall. Time to plan.

---

### Red flags to check

For each subscription due before its associated payday:

- [ ] Card on file at the vendor is still valid (not expired)
- [ ] We WANT this renewal — no plan to cancel
- [ ] The amount matches what's in `data/subscriptions.yml`
- [ ] If auto-renew is ON and we can't afford it: DECIDE NOW whether to
      cancel, downgrade, or defer

---

### Action list for this month

Check things off as you complete them.

- [ ] ________________________________________
- [ ] ________________________________________
- [ ] ________________________________________
- [ ] ________________________________________
- [ ] ________________________________________

---

### If money is short this month — priority order for cuts

Cut in this order (top of list first, only cut further if still short):

1. **CodeRabbit** — currently evaluating, easy to pause
2. **Cursor** ($20/mo) — dad has Copilot as backup
3. **Devin** ($80/mo) — biggest single monthly cost after hosting
4. **RecurseML** (~$20 short-term) — several other reviewers cover us
5. **Bito Team** ($12/mo if we've upgraded) — free tier still works
6. **Copilot** ($10/mo) — dad codes slower without it
7. — never cut below this line without dad —
8. DigitalOcean (real infrastructure — kills real websites)
9. Vercel (same)
10. OpenRouter (kills every automation)
11. Doppler (secrets break)

Anything above the "never cut without dad" line, you can propose cutting
via a comment on the tracker issue. Below the line, always ask first.

---

### End-of-month checklist

At the end of the month, before starting next month's plan:

- [ ] Every action in this month's list is either done or moved to next month
- [ ] `data/subscriptions.yml` reflects what actually happened this month
  (any cancellations, upgrades, downgrades, new tools)
- [ ] Any changes are committed via PR (see SUBSCRIPTION_STEWARD.md
  section "How do I update a renewal date")
- [ ] I know the total we spent on subscriptions this month:  $ __________

---

### Notes / observations for the month

_Anything you noticed — a tool we're not using much, a vendor being
annoying, a price change, a lesson learned. This is your journal._

- Note 1: ____________________________________________________________
- Note 2: ____________________________________________________________
- Note 3: ____________________________________________________________

---

_When dad reviews your monthly plan he might mark it up with questions or
"cancel this" notes. That's normal — better to plan too much and get
corrected than not plan at all._
