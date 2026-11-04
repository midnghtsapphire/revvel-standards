# White-label distribution — vendor diligence rubric

Use this on vendor calls. Same questions, same order, every vendor, answers
written down with the date and the name of the person who said them.

No vendor on this list publishes pricing. All of them are enterprise-sales
gated, so the first call is a qualification call in both directions. The point
of a fixed rubric is to compare answers instead of comparing sales energy.

**This document commits nothing.** No contract, no spend. Diligence only.

Prepared 2026-11-04.

---

## Question 1 — the disqualifying one, ask it first

> **Do you hold direct DSP supply-chain status, or are you sub-distributing
> through another aggregator? Name the DSPs where you are direct.**

Ask before anything else, because a wrong answer ends the call and the rest of
the rubric is wasted effort.

Sub-sub-distribution stacks a third party between you and the DSP. That means
another queue for delivery latency, another party who can lose metadata,
another margin cut, another set of terms you did not sign, and an enforcement
surface you cannot see. If the intermediate aggregator loses status, every
client under it goes down and you will not have been warned.

Vendors do not volunteer this. It will not be on the website. Ask for it DSP by
DSP and write down the answer per DSP, not as a single yes.

**Follow-ups that catch a soft answer:**

- Which DSPs are you direct with, and which go through a partner?
- Who is the partner, for the ones that do?
- How long have you held direct status with Spotify? With Apple?
- Has any DSP suspended or reviewed your supply-chain status? When, and what
  changed afterwards?

A vendor who will not answer the last one in writing has answered it.

## Question 2 — ERN version

> **Which ERN versions do you deliver, per DSP?**

The correct answer in late 2026 is **4.3.2** (or later).

Context that makes this a real test rather than a trivia question:

- DDEX announced in February 2023 that older standards would sunset. Support
  for all ERN 3.x versions and ERN 4.0 **ended 1 March 2025**. Those standards
  were **removed from DDEX websites on 1 March 2026** — already past.
- `ContainsAI`, the AI-disclosure field, was added in **ERN 4.3.1**. **ERN 3.x
  has no equivalent.**

So a vendor still speaking ERN 3.8.2 is on an unsupported, withdrawn standard
*and* structurally incapable of AI disclosure. Both at once. That is
disqualifying for us specifically, because our catalog is AI-generated and
disclosure is not optional for us even where the DSP calls it optional.

An earlier draft of this rubric asked vendors whether they spoke "4.3 and
3.8.2 per DSP." That was correct in 2024 and is wrong now: in late 2026, a yes
to 3.8.2 is a negative signal, not a capability.

**Follow-ups:**

- Do you deliver `ContainsAI` and `AiContribution` today, in production, or is
  it roadmap? Show me a delivered release that carries it.
- Do you support Apple's `ai_transparencies` block, spec 5.3.27? It is not
  DDEX, so DDEX support does not cover it.
- What is your plan and date for whatever ERN version comes after 4.3.2?

See `DDEX_AI_DISCLOSURE.md` for what these fields are and which DSP wants
which.

## Question 3 — Merlin

> **Do you have Merlin access, and does it extend to our releases or only to
> your own label roster?**

Merlin membership is the route to DSP deals that are otherwise closed to new
aggregators. Vendors sometimes hold it at their own corporate level and not for
white-label clients. That distinction is the whole value of the answer, and it
is easy to get a yes that means the first thing when you asked about the
second.

**Follow-ups:**

- Are our releases inside your Merlin reporting, or outside it?
- What does it take for us to hold our own membership instead?

## Question 4 — royalty accounting

> **Who computes royalties, who holds the money, and when does it move?**

Three separate questions wearing one coat. Get three answers.

| Ask | Why it matters |
| --- | --- |
| Do you compute statements, or hand us raw DSR files to process? | "We give you the data" is a very different product from "we run your accounting" |
| Which DSR version and format? | XML DSR support ended 1 March 2025 — flat-file only from then |
| Do you hold client funds, or do DSPs pay us directly? | Holding funds makes them a payment intermediary and makes their solvency our problem |
| Payment cadence, and lag from DSP receipt to our receipt | 45 days and 120 days are both "quarterly" to a salesperson |
| Minimum payout threshold, and what happens below it | Where small balances quietly go |
| Who absorbs a DSP underpayment or restatement? | The answer is usually "you," and it should be said out loud |

## Question 5 — takedown and permanence

> **If we stop paying, what happens to releases that are already live?**

This is the question that started the whole investigation. The owner's
objection to DistroKid is specific and correct: pay-to-keep-live means the
catalog is a hostage, and the ransom recurs.

Get the answer in contract language, not in reassurance.

**Follow-ups:**

- On non-payment, do live releases stay up, come down, or stop being paid out?
- On voluntary termination, same three questions.
- How long do you keep delivering to DSPs after we give notice?
- Do you charge per takedown, or per re-delivery?
- If a DSP removes a release, who is told, how fast, and with what reason code?

## Question 6 — AI-content policy

> **What is your written policy on AI-generated catalogs, and what volume
> triggers review?**

This cuts both ways and both directions matter.

A vendor with *no* AI policy sounds convenient and is a liability: permissive
distributors that wave through bulk AI catalogs draw the hardest DSP scrutiny,
and their legitimate clients inherit the suspicion. A vendor with a strict
policy may refuse our own roster outright, which is useful to learn on a call
rather than after signing.

**Follow-ups:**

- Is there an upload-volume threshold that triggers manual review? What is it?
- Have you had a client removed by a DSP for AI-related reasons? What happened
  to their catalog?
- Do you require AI disclosure from clients, or merely permit it?
- Would you accept our roster, described honestly as high-volume AI-generated
  music with disclosure? Ask this directly and early.

The last one is the real question. A vendor who says yes without hesitating has
told you what kind of client base they have.

## Question 7 — exit terms

> **If we leave, who owns the catalog relationship?**

**Follow-ups:**

- Do ISRCs we supplied stay ours? (They do if we hold our own registrant code —
  which is the argument for buying one, see below.)
- Do release-level DSP identifiers survive a move, or does the catalog
  re-ingest as new?
- Do our artists keep their Spotify artist URIs, or get re-routed?
- Do we get our historical royalty data out, in a machine-readable format, on
  exit? At what cost?
- Notice period, and any post-termination exclusivity.

## Question 8 — contract shape

Ask last, because the answer is only meaningful once the above is known.

- Minimum term and auto-renewal.
- Minimum volume or minimum revenue commitment.
- Per-release fees, per-track fees, revenue share, platform fee — all four, by
  name, because vendors mix and match and quote only the flattering one.
- What is priced per-seat versus per-release?
- Is there a setup or onboarding fee?

## The vendors

Quote-based and enterprise-gated, all of them. Listed for call planning, in no
particular order and with no endorsement.

| Vendor | What to confirm first |
| --- | --- |
| SonoSuite | Direct status per DSP; white-label depth |
| Revelator | Royalty accounting model; whether they hold funds |
| FUGA | Likely the most enterprise; ask the minimum-commitment question early |
| LabelGrid | Direct vs sub-distribution; Merlin scope |
| Audicient | Direct status; ERN version in production |

Record each answer in a dated row. A vendor claim is a claim, not a fact, until
it is in a contract.

## Buy the ISRC registrant code regardless

**$95 one-time, from the RIAA at <https://usisrc.org>.** Allows 100,000 ISRCs
per year, and the registrant code is yours for life.

This is the one recommendation in this document that does not depend on any
vendor answer, and it should be done before any vendor call:

- It makes Question 7 answerable in our favour instead of theirs. Codes issued
  under a distributor's registrant code are traceable to that distributor
  forever.
- It costs less than one month of the distribution subscriptions already being
  paid.
- It is independent of whether white-label ever happens.

## What this rubric cannot tell you

Pricing. Nobody publishes it, and the first number quoted will be a function of
how large you appeared on the call. Expect to run all five calls before any
number means anything, and expect the rubric answers — not the price — to be
what eliminates vendors.

## Sources

- DDEX knowledge base, "What's new" — ERN 3.x / 4.0 sunset and removal dates,
  XML DSR end of support: <https://kb.ddex.net/about-ddex-standards/whats-new/>
- `DDEX_AI_DISCLOSURE.md` — `ContainsAI` availability by ERN version, per-DSP
  disclosure state.
- `ENFORCEMENT_SEPARATION.md` — why our own catalog does not ship through a
  distributor we operate.
