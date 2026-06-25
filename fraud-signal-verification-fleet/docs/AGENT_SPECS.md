# Agent Specs

Each agent is a role contract. None self-modify, self-heal, or formally verify.
They gather and annotate; the judge weighs; the scorer caps.

## agent-primary-source  (tier 4-5)
Dockets, indictments, pleas, DOJ releases, FEC/state finance, official transcripts.
Output: structured evidence rows. Forbidden from upgrading news to fill a gap.

## agent-financial  (tier 3-5)
990s, behested payments, contracts, conflicts. Donor→official→benefit only where
each hop has a filing. Inferences labelled INFERENCE.

## agent-media-trace  (tier 1-3)
Provenance & sourcing chain. Answers "how did they get it?". Classifies each
claim's provenance key.

## agent-counter  (adversarial)
Innocent/null explanation for every claim. Finds contradicting sources. May
return "no credible counter found" — never fabricates one.

## agent-legal  (tier 3-5)
Statute + elements + adjudication stage. The stage it sets caps the score.
Strict: investigation ≠ charge ≠ conviction; guilty plea ≠ no-admission settlement.

## judge
Merges, resolves conflict by tier/provenance/recency, writes verdict language and
case integrity. Cannot raise a band above what the scorer computed.

## Dispatch
Parallel: all five at once, then score→judge→publish.
Sequential: chain a second case after publish; append to the ledger.
