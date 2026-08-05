"""Research-fleet agent definitions.

Each agent is a *role contract*: what it pulls, what tiers it is allowed to
emit, and the prompt that drives it. The orchestrator can dispatch these to a
live LLM (see prompts/) or run in OFFLINE mode against the seed dataset, where
each agent simply asserts the claims it "found" in the provided sources.

No agent here self-modifies, self-heals, or formally verifies anything. They
gather and annotate evidence; the judge weighs it; the scorer caps it.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class AgentSpec:
    name: str
    mission: str
    allowed_tiers: tuple[int, ...]
    prompt_file: str


FLEET = [
    AgentSpec(
        "agent-primary-source",
        "Pull adjudicated and first-party records: dockets, indictments, pleas, "
        "FEC/state finance filings, official transcripts. Emit tier 4-5 only.",
        (4, 5), "prompts/agent_primary_source.md"),
    AgentSpec(
        "agent-financial",
        "Map money: behested payments, 990s, conflicts of interest. Tie each "
        "assertion to a filing or report. Emit tier 3-5.",
        (3, 4, 5), "prompts/agent_financial.md"),
    AgentSpec(
        "agent-media-trace",
        "Reconstruct provenance: who published, when, sourcing chain, leak vs "
        "filing. Classify how each fact reached the public. Emit tier 1-3.",
        (1, 2, 3), "prompts/agent_media_trace.md"),
    AgentSpec(
        "agent-counter",
        "Adversarial. Argue the innocent/null explanation for every claim. "
        "Surface contradicting sources. Emit contradictions only.",
        (1, 2, 3, 4, 5), "prompts/agent_counter.md"),
    AgentSpec(
        "agent-legal",
        "Map each allegation to statutory elements (intent, materiality, "
        "adjudication stage). Set the legal stage that ceilings the score.",
        (3, 4, 5), "prompts/agent_legal.md"),
]


def fleet_manifest() -> list[dict]:
    # asdict() returns fresh dicts so callers can't mutate the frozen AgentSpec instances.
    return [asdict(a) for a in FLEET]
