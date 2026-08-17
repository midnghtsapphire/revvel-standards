# Provenance — How the News Channel Got It

Turning the user's question into a rule. The *route* a fact takes to the public
changes how much we trust it, independent of who published it.

| Provenance | Discount | What it means |
|---|---|---|
| filing | 1.00 | Outlet pulled it from an official docket/registry itself |
| on_record_statement | 0.95 | Named person said it on the record (transcript/press conf) |
| official_leak | 0.70 | Confirmed leak from a party with standing (e.g. counsel) |
| unattributed_leak | 0.40 | "Sources say" with no standing established |
| anonymous_report | 0.25 | "A report claims", screenshot, anonymous PDF |

`agent-media-trace` assigns one per claim and must show the chain: first
publisher → date → byline/anon → document-obtained vs claim-repeated.

## Rules baked into the process
1. A fact an outlet **obtained as a document** outranks one it **repeats**.
2. A leak is weighted by the leaker's standing, not the outlet's prestige.
3. "Exclusive" and "bombshell" carry **zero** evidentiary weight.
4. The same fact arriving via two independent routes earns corroboration; the
   same fact echoed by ten outlets citing one anonymous report does **not**.
