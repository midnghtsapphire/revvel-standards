# Enforcement separation — the catalog rule

**Rule: our own catalog ships through an established third-party distributor.
A distribution business we operate does not carry it.**

Hard architectural constraint. Not a guideline, not a default, not a
preference. If a design requires breaking it, the design is wrong.

---

## What the rule protects against

Losing a release and losing supply-chain status are different kinds of event.

A release coming down costs that release. Losing DSP supply-chain status costs
every release of every client at once, and it is not appealable on the timescale
a business survives. Spotify removed over 75 million tracks as spam in a single
year. Enforcement escalates: metadata rejection, then monetization blocks, then
**distributor-level bans**.

What draws that escalation is well documented: mass uploads, duplicate
recordings, metadata SEO manipulation, and artificially short tracks.
Permissive distributors that wave bulk AI catalogs through attract the hardest
scrutiny, and their legitimate clients inherit it.

Now put the two facts together.

Our own roster is high-volume AI-generated music. That is the strategy, and it
is not changing. A distribution business we operate would be a service sold to
other people. If our catalog ships through it, then the volume strategy and the
service business share one enforcement surface — and the strategy is precisely
the activity the surface is tuned to detect.

So the failure mode is not "a release gets rejected." It is: our own upload
pattern triggers a distributor-level review, status is lost, and every paying
client goes dark. The volume strategy terminates the distribution business.
That is not a release problem, it is a company problem.

## Why separation actually works

Because the risks are not merely additive, they are *correlated by design*, and
separation is what breaks the correlation.

| Routing | What one enforcement action costs |
| --- | --- |
| Own catalog through own distributor | Both businesses. Status loss takes the service business and the catalog together |
| Own catalog through a third party | One business. A third-party takedown costs releases and a migration; our clients are untouched |

The asymmetry is the whole argument. Third-party distribution has a real cost —
subscription fees, less control, someone else's terms, exactly the terms the
owner objects to in DistroKid. Pay it anyway. It is cheap insurance against the
only failure that cannot be recovered from.

## The rule in practice

1. **Our releases never enter a delivery pipeline we own.** Not "usually not,"
   not "except for test releases." Never. A test release is a real release to a
   DSP's enforcement systems.
2. **Shared infrastructure is fine. Shared supply-chain status is not.** The
   repaint editor, the mastering gate, the metadata schema, the artifact QA —
   all shared, all internal, none of it touches a DSP account. Draw the line at
   the DDEX delivery boundary, not earlier.
3. **No shared account identity at the DSP.** Not the same corporate entity on
   the supply-chain agreement, not the same contact email, not the same payment
   account. Enforcement follows the identity, and an investigator who can link
   two accounts will treat them as one.
4. **Honest disclosure on both sides.** Separation is a blast radius control,
   not a concealment mechanism. Our releases carry accurate per-element AI
   disclosure (`DDEX_AI_DISCLOSURE.md`) wherever they ship. Separating the
   routing while hiding the AI content would recreate the risk and add fraud to
   it.

Point 4 matters more than it looks. The rule is defensible only if it is what
it claims to be. "We route our own catalog elsewhere so a problem with our
volume cannot take down our clients" is a sound structural argument that
survives being said out loud to a DSP. "We route our own catalog elsewhere so
nobody connects it to us" is a different thing, is not defensible, and would be
discovered.

## What this costs

Stated plainly so it is not relitigated later as a surprise:

- A third-party distribution subscription, permanently. At the current plan,
  roughly $90/year, plus whatever that vendor's permanence terms demand.
- No margin recovery on our own catalog's distribution.
- Two sets of metadata plumbing to maintain — ours to the third party, clients'
  to ours.

The distribution business was never justified on our own catalog's volume. Low
margin, high operational load; it does not pay off that way, and "escaping a
subscription fee" is not a business case. It is justified only as a service
business with a differentiated compliance position
(`WHITE_LABEL_DILIGENCE.md`). This rule is a cost of that position, and the
position is the only reason to be in the business at all.

## If the rule has to break

It does not. But if someone argues it should, the argument has to clear this
bar, in the PR body, in writing:

1. Name the specific DSP enforcement mechanism that makes correlated risk
   acceptable.
2. Show that distributor-level bans no longer propagate to client catalogs.
3. Price the downside: revenue of the service business at the time, times the
   probability of a status loss, against the subscription saved.

Absent all three, the answer is no. Record the attempt in
`wr/memory/decisions.jsonl` either way, so it is argued once.

## Related

- `WHITE_LABEL_DILIGENCE.md` — vendor rubric; question 6 is the AI-policy
  question this rule is the other half of.
- `DDEX_AI_DISCLOSURE.md` — the disclosure obligation that point 4 depends on.
- `HIT_PREDICTION_ASSESSMENT.md` — the other recorded negative decision.
