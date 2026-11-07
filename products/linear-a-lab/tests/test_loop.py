import json
import unittest

from gorila_ge.corpus import load_corpus
from pipeline import prosecutor, stats
from pipeline.loop import extract_json, run_case


class FakeLLM:
    """Scripted stand-in for LM Studio: returns queued replies in order."""

    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def chat(self, system, user, **kw):
        self.calls.append((system[:40], user[:80]))
        if not self.replies:
            raise AssertionError("FakeLLM ran out of scripted replies")
        return self.replies.pop(0)


class TestExtractJson(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(extract_json('{"a": 1}'), {"a": 1})

    def test_fenced(self):
        txt = "Sure!\n```json\n{\"word\": \"KU-RO\", \"role\": \"transaction-term\"}\n```"
        self.assertEqual(extract_json(txt)["word"], "KU-RO")

    def test_garbage_raises(self):
        with self.assertRaises(ValueError):
            extract_json("no json here")


class TestProsecutor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load_corpus()
        cls.pack = stats.evidence_pack(cls.corpus, "KU-RO")

    def test_kuro_total_claim_survives(self):
        hyp = {"word": "KU-RO", "role": "transaction-term",
               "claim": "functions as the total of the entries above"}
        verdict = prosecutor.prosecute(self.corpus, hyp, self.pack)
        self.assertIn(verdict["grade"], ("A", "B"))
        gate = {g["name"]: g for g in verdict["gates"]}
        self.assertTrue(gate["arithmetic"]["passed"])
        self.assertTrue(gate["attestation"]["passed"])

    def test_hapax_claim_fails_attestation(self):
        pack = stats.evidence_pack(self.corpus, "ZZ-ZZ-ZZ")
        hyp = {"word": "ZZ-ZZ-ZZ", "role": "toponym", "claim": "a place"}
        verdict = prosecutor.prosecute(self.corpus, hyp, pack)
        self.assertIn("attestation", verdict["failed_gates"])
        self.assertEqual(verdict["grade"], "C")


class TestLoop(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load_corpus()

    def test_case_survives_first_round(self):
        hyp = json.dumps({
            "word": "KU-RO", "role": "transaction-term",
            "claim": "marks the total of entries", "reasoning": "sums match"})
        pros = json.dumps({"strongest_objection": "none",
                           "alternative_hypothesis": "none", "fatal": False})
        llm = FakeLLM([hyp, pros])
        case = run_case(self.corpus, "KU-RO", llm, max_rounds=3)
        self.assertEqual(len(case.rounds), 1)
        self.assertEqual(case.final.verdict["failed_gates"], [])
        d = case.to_dict()
        self.assertEqual(d["final_grade"], case.final.verdict["grade"])

    def test_case_revises_after_failed_gates(self):
        bad = json.dumps({
            "word": "ZZ-TOP", "role": "transaction-term",
            "claim": "means total", "reasoning": "guess"})
        pros1 = json.dumps({"strongest_objection": "not attested",
                            "alternative_hypothesis": "damage", "fatal": True})
        fixed = json.dumps({
            "word": "ZZ-TOP", "role": "unknown",
            "claim": "insufficient evidence; concede", "reasoning": "proseco"})
        pros2 = json.dumps({"strongest_objection": "none",
                            "alternative_hypothesis": "none", "fatal": False})
        llm = FakeLLM([bad, pros1, fixed, pros2])
        case = run_case(self.corpus, "ZZ-TOP", llm, max_rounds=2)
        self.assertEqual(len(case.rounds), 2)
        # round 1 failed, round 2 is the revised (conceded) hypothesis
        self.assertTrue(case.rounds[0].verdict["failed_gates"])
        self.assertEqual(case.rounds[1].hypothesis["role"], "unknown")

    def test_prosecution_argument_failure_is_nonfatal(self):
        hyp = json.dumps({"word": "KU-RO", "role": "transaction-term",
                          "claim": "total", "reasoning": "x"})
        llm = FakeLLM([hyp, "NOT JSON AT ALL"])
        case = run_case(self.corpus, "KU-RO", llm, max_rounds=1)
        self.assertEqual(len(case.rounds), 1)
        self.assertIsNone(case.rounds[0].prosecution_argument)


if __name__ == "__main__":
    unittest.main()
