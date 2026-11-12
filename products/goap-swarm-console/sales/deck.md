# REVVEL GOAP agent sales deck

Source for the on-screen deck, the PDF, and the static landing page.
Work request #18334. Actor: MarketShipper, 2026-11-11.

The case-study slide says proof pending because a same-day check found no
deployed product with a live URL. No customer, quote, or result is invented.
Dependency: issue 18330.

## Value proposition

**Headcount-priced capacity, with the limit stated**

The work request prices a GOAP agent like headcount, from $2,000 to $5,000 a month, and names the line "Ships code 24/7, no benefits, outcome-guaranteed." What runs today is the symbolic planner in this repository: it plans, assigns, and exports a report. Round-the-clock production coding and a guaranteed customer outcome are not demonstrated here.

## What runs today

**Plan, assign, and export**

GOAP Swarm Console searches a symbolic state space. Each action exposes its conditions, effects, role, and cost. A swarm tick allocates work under capacity limits, and the run exports to Markdown or CSV. A buyer can inspect that evidence before any pilot.

## Price per agent

**$2,000 to $5,000 per month**

The published band is $2,000 to $5,000 per agent per month. Volume, integrations, support, and human review time pick the point inside the band. Cloud compute and third-party model calls are written into the proposal. The band is the offer, not a receipt.

## ROI illustration

**An estimate, not a customer result**

Illustration: 30 task hours a week, times 52 divided by 12, times 50 percent, times $60 an hour, equals $3,900 of monthly capacity value. At a $2,000 price the illustrated net is $1,900 a month and $22,800 a year. Replace every input. A negative result is a valid result.

## Calculator edges

**Zero stays defined**

A $0 price does not produce an infinite ROI. A $0 hourly cost does not produce infinite break-even hours. Hours, cost, automation, and price must be finite and at least zero, and automation cannot pass 100 percent. The landing page uses the same function as lib/agent-roi.js.

## Bounded pilot

**Baseline, acceptance, and a stop date**

Record current effort and the failure rate. Choose one workflow. Set access boundaries. Name the person who accepts output. Write pass and fail rules, review checkpoints, and the day the pilot ends. Expand only after the measurement supports it.

## Inspectable plans

**Goals, preconditions, and actions**

The planner shows the path. Change the world state and the plan changes with it. The report lists the actions that were selected. This demonstrates the planning method. It is not a statement about a customer's production system.

## Role-aware assignment

**Capacity and a reviewable split**

Actions go to agents that match the role and still have capacity. The assignment board exports to CSV. The buyer reviews that split before anyone treats it as a schedule.

## Visible recovery

**Anomalies stay on the record**

The planner reports awareness checks, predicted outcomes, and escalation signals. This repository also appends a written learning after a failed task. Production recovery and access control are checked in the customer environment during the pilot.

## Proof pending

**No customer case study**

Checked 2026-11-11. Product hostnames in the deploy notes did not resolve, GitHub Pages for this repo returned 404, and the Vercel host returned 402. oaudrey.com served a parking page, not a product. No customer, quote, or result is shown. A case study waits on a live product, issue 18330.

## Outside this offer

**What the monthly price does not buy**

Enterprise contracts and a white-label offering are separate work requests. The price does not include unlimited cloud spend, a claim that a job was removed, or a customer reference. Each of those needs its own evidence and its own agreement.

## One workflow

**Agree the finish line first**

Bring one repeatable workflow and the test that says the output is accepted. Discovery examples are repository hygiene, test triage, a research-to-build handoff, or release preparation. The agent is not assigned until that finish line is written down.

## Request a pilot

**The booking link is the owner's**

The landing page embeds a calendar only when the build is given CALENDLY_URL and the value is an https link on calendly.com with a scheduling path. This deck invents no booking link. Until that value is set, use github.com/midnghtsapphire/revvel-standards/discussions/18238 and keep private details out of the public thread.
