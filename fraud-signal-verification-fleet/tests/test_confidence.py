"""Stdlib-only tests for the confidence scorer (no pyyaml needed)."""
import json, os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from confidence import score_case, score_claim, is_refused  # noqa: E402

CFG = {
    "tiers": {
        5: {"name": "adjudicated_record", "weight": 1.00},
        4: {"name": "primary_official", "weight": 0.80},
        3: {"name": "direct_reporting", "weight": 0.60},
        2: {"name": "opinion_or_secondary", "weight": 0.35},
        1: {"name": "social_or_anonymous", "weight": 0.15},
    },
    "adjudication_ceilings": {
        "unknowable": 0.20, "alleged": 0.45, "investigated": 0.55,
        "charged": 0.75, "guilty_plea": 0.90, "settled_no_admission": 0.65,
        "plea_or_settled": 0.90, "convicted": 0.98,
    },
    "corroboration": {"per_source_bonus": 0.06, "max_bonus": 0.24},
    "contradiction": {"per_source_penalty": 0.12, "max_penalty": 0.48},
    "provenance": {"on_record_statement": 0.95, "filing": 1.00,
                   "anonymous_report": 0.25, "official_leak": 0.70},
}


class TestRefusal(unittest.TestCase):
    def test_fraud_phrase_refused(self):
        self.assertTrue(is_refused("Newsom committed fraud"))
        self.assertTrue(is_refused("He is guilty of bribery"))
        self.assertFalse(is_refused("The DOJ is investigating him"))

    def test_refused_claim_scores_zero(self):
        case = {"sources": [{"id": "s", "tier": 5}],
                "claims": [{"id": "C5", "text": "Newsom committed fraud", "stage": "alleged",
                            "supporting": [{"source": "s", "provenance": "filing"}]}],
                "refused_claims": ["C5"]}
        r = score_case(case, CFG)[0]
        self.assertTrue(r.refused)
        self.assertEqual(r.confidence, 0.0)


class TestCaps(unittest.TestCase):
    def _src(self, tier):
        return {"sources": [{"id": "s", "tier": tier}]}

    def test_alleged_ceiling_caps_high_tier(self):
        # tier-4 on-record statement, but stage 'alleged' -> capped at 0.45
        claim = {"id": "C", "text": "x", "stage": "alleged",
                 "supporting": [{"source": "s", "provenance": "on_record_statement"}]}
        r = score_claim(claim, {"s": {"id": "s", "tier": 4}}, dict(CFG))
        self.assertLessEqual(r.confidence, 0.45)

    def test_social_post_cannot_substantiate(self):
        # tier-1 anonymous report stays weak regardless of stage ceiling
        claim = {"id": "C", "text": "x", "stage": "convicted",
                 "supporting": [{"source": "s", "provenance": "anonymous_report"}]}
        r = score_claim(claim, {"s": {"id": "s", "tier": 1}}, dict(CFG))
        self.assertLessEqual(r.confidence, 0.15)
        self.assertIn(r.band, ("WEAK", "UNSUBSTANTIATED"))

    def test_adjudicated_plea_scores_high(self):
        claim = {"id": "C", "text": "x pleaded guilty", "stage": "guilty_plea",
                 "supporting": [{"source": "s", "provenance": "filing"}]}
        r = score_claim(claim, {"s": {"id": "s", "tier": 5}}, dict(CFG))
        self.assertGreaterEqual(r.confidence, 0.85)
        self.assertEqual(r.band, "SUBSTANTIATED")

    def test_no_admission_settlement_capped_below_guilty_plea(self):
        # Same tier-5 filing, but a no-admission settlement must not score like a plea.
        src = {"s": {"id": "s", "tier": 5}}
        plea = score_claim({"id": "P", "text": "x", "stage": "guilty_plea",
                            "supporting": [{"source": "s", "provenance": "filing"}]}, src, dict(CFG))
        settled = score_claim({"id": "S", "text": "x", "stage": "settled_no_admission",
                               "supporting": [{"source": "s", "provenance": "filing"}]}, src, dict(CFG))
        self.assertLess(settled.confidence, plea.confidence)
        self.assertLessEqual(settled.confidence, 0.65)


class TestRobustness(unittest.TestCase):
    def test_unknown_source_id_does_not_crash(self):
        claim = {"id": "C", "text": "x", "stage": "alleged",
                 "supporting": [{"source": "nope", "provenance": "filing"}]}
        r = score_claim(claim, {"s": {"id": "s", "tier": 5}}, dict(CFG))
        self.assertFalse(r.refused)
        self.assertEqual(r.band, "UNSUBSTANTIATED")
        self.assertEqual(r.confidence, 0.0)

    def test_contradiction_to_zero_is_unsubstantiated_not_refused(self):
        # Heavy contradiction drives a non-refused claim to 0 -> must NOT read as REFUSED.
        claim = {"id": "C", "text": "x", "stage": "alleged",
                 "supporting": [{"source": "s", "provenance": "anonymous_report"}],
                 "contradicting": [{"source": "s"}] * 5}
        r = score_claim(claim, {"s": {"id": "s", "tier": 1}}, dict(CFG))
        self.assertFalse(r.refused)
        self.assertEqual(r.confidence, 0.0)
        self.assertEqual(r.band, "UNSUBSTANTIATED")


class TestSeedCase(unittest.TestCase):
    def test_seed_case_runs(self):
        p = os.path.join(os.path.dirname(__file__), "..", "data", "seed", "newsom_case.json")
        with open(p) as f:
            case = json.load(f)
        results = score_case(case, CFG)
        by_id = {r.claim_id: r for r in results}
        # The fraud verdict claim must be refused.
        self.assertTrue(by_id["C5"].refused)
        # The "Newsom said it" claim must outrank the "investigation exists" claim.
        self.assertGreaterEqual(by_id["C1"].confidence, by_id["C2"].confidence)


if __name__ == "__main__":
    unittest.main()
