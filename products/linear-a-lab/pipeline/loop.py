"""The test -> deconstruct -> prosecute -> fix loop.

One round:
  1. TEST        - the model states (or revises) a hypothesis about a word.
  2. DECONSTRUCT - the evidence pack is computed from the corpus (stats.py).
  3. PROSECUTE   - deterministic gates score the claim (prosecutor.py), then
                   the model argues the prosecution case against itself.
  4. FIX         - if gates failed, the model revises the hypothesis with the
                   prosecution record in hand, and the loop repeats.

The LLM proposes and critiques; only the deterministic gates decide.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from gorila_ge.corpus import Inscription

from . import prosecutor, stats

SYSTEM_HYPOTHESIZE = (
    "You are a careful Aegean epigraphist working on Linear A. You never "
    "overclaim: Linear A is undeciphered, so claims are about document "
    "function, not phonetic translation, unless arithmetic or distribution "
    "proves more. Answer ONLY with a JSON object: "
    '{"word": str, "role": one of %s, "claim": one short sentence, '
    '"reasoning": one short paragraph}' % (list(prosecutor.ROLES),)
)

SYSTEM_PROSECUTE = (
    "You are the prosecutor. Attack the hypothesis using only the evidence "
    "pack and gate results provided. Point out alternative explanations the "
    "defense ignored. Answer ONLY with a JSON object: "
    '{"strongest_objection": str, "alternative_hypothesis": str, '
    '"fatal": true/false}'
)

SYSTEM_FIX = (
    "You are the same epigraphist. The prosecution record is in front of "
    "you. Revise your hypothesis to survive the failed gates - narrow the "
    "claim, change the role, or concede. Answer ONLY with a JSON object in "
    "the same schema as before."
)


def extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model reply (tolerates fences)."""
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise ValueError(f"no JSON object in model reply: {text[:200]!r}")
    return json.loads(m.group(0))


@dataclass
class Round:
    hypothesis: dict
    verdict: dict
    prosecution_argument: dict | None = None


@dataclass
class CaseFile:
    word: str
    rounds: list[Round] = field(default_factory=list)

    @property
    def final(self) -> Round | None:
        return self.rounds[-1] if self.rounds else None

    def to_dict(self) -> dict:
        return {
            "word": self.word,
            "rounds": [
                {
                    "hypothesis": r.hypothesis,
                    "verdict": r.verdict,
                    "prosecution_argument": r.prosecution_argument,
                }
                for r in self.rounds
            ],
            "final_grade": self.final.verdict["grade"] if self.final else None,
        }


def run_case(
    corpus: dict[str, Inscription],
    word: str,
    llm,
    max_rounds: int = 3,
    seed_hypothesis: dict | None = None,
) -> CaseFile:
    """Run the full loop for one word. `llm` needs a .chat(system, user) -> str."""
    case = CaseFile(word=word)
    pack = stats.evidence_pack(corpus, word)

    hypothesis = seed_hypothesis
    for rnd in range(max_rounds):
        if hypothesis is None:
            reply = llm.chat(
                SYSTEM_HYPOTHESIZE,
                "Evidence pack for the Linear A word %s:\n%s\n"
                "State your hypothesis." % (word, json.dumps(pack, ensure_ascii=False)),
            )
            hypothesis = extract_json(reply)
        hypothesis.setdefault("word", word)
        hypothesis["word"] = word  # the case stays about this word

        verdict = prosecutor.prosecute(corpus, hypothesis, pack)

        argument = None
        try:
            arg_reply = llm.chat(
                SYSTEM_PROSECUTE,
                "Hypothesis: %s\nEvidence pack: %s\nGate results: %s"
                % (
                    json.dumps(hypothesis, ensure_ascii=False),
                    json.dumps(pack, ensure_ascii=False),
                    json.dumps(verdict, ensure_ascii=False),
                ),
            )
            argument = extract_json(arg_reply)
        except Exception:
            pass  # prosecution argument is advisory; gates already ruled

        case.rounds.append(
            Round(hypothesis=hypothesis, verdict=verdict,
                  prosecution_argument=argument)
        )

        if not verdict["failed_gates"] and not (argument or {}).get("fatal"):
            break  # survived prosecution

        if rnd + 1 >= max_rounds:
            break

        fix_reply = llm.chat(
            SYSTEM_FIX,
            "Your hypothesis: %s\nVerdict: %s\nProsecution: %s\nRevise."
            % (
                json.dumps(hypothesis, ensure_ascii=False),
                json.dumps(verdict, ensure_ascii=False),
                json.dumps(argument, ensure_ascii=False),
            ),
        )
        hypothesis = extract_json(fix_reply)

    return case
