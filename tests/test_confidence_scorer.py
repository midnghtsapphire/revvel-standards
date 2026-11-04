"""unittest suite for scripts/confidence_scorer.py. Run: python3 -m unittest tests/test_confidence_scorer.py -v"""
import io
import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "scripts", "confidence_scorer.py")
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import confidence_scorer as cs  # noqa: E402


def opt(oid, ev=1.0, agree=1.0, rev=1.0, cost=0.0, risk=0.0, flags=None, subs=None):
    o = {"id": oid, "title": oid.upper(),
         "evidence": {"web": ev, "google_drive": ev, "seo_sem": ev, "social": ev},
         "source_agreement": agree, "reversibility": rev, "cost": cost, "risk": risk}
    if flags:
        o["flags"] = flags
    if subs:
        o["sub_choices"] = subs
    return o


def run_cli(data, *args):
    p = subprocess.run([sys.executable, SCRIPT] + list(args), input=json.dumps(data).encode(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return p.returncode, p.stdout, p.stderr


class TestWeights(unittest.TestCase):
    def test_weights_sum_to_100(self):
        self.assertEqual(sum(cs.WEIGHTS.values()), 100)
        self.assertAlmostEqual(sum(cs.EVIDENCE_SOURCES.values()), 1.0)

    def test_perfect_and_zero(self):
        self.assertEqual(cs.evaluate([opt("a")])["ranked"][0]["score"], 100.0)
        z = opt("z", ev=0.0, agree=0, rev=0, cost=1, risk=1)
        self.assertEqual(cs.evaluate([z])["ranked"][0]["score"], 0.0)

    def test_counts_saturate(self):
        o = opt("a", ev=0.0)
        o["evidence"] = {"web": 50}
        r = cs.evaluate([o])["ranked"][0]
        self.assertEqual(r["evidence_sources"]["web"], 1.0)


class TestDeterminism(unittest.TestCase):
    def test_byte_identical_cli_output(self):
        data = [opt("b", ev=0.5), opt("a", ev=0.7, subs=[opt("s2"), opt("s1", ev=0.2)])]
        outs = [run_cli(data, "--json")[1] for _ in range(3)]
        self.assertEqual(outs[0], outs[1])
        self.assertEqual(outs[1], outs[2])
        txt = [run_cli(data)[1] for _ in range(2)]
        self.assertEqual(txt[0], txt[1])

    def test_input_order_does_not_matter(self):
        a, b, c = opt("a", ev=0.3), opt("b", ev=0.9), opt("c", ev=0.6)
        r1 = json.dumps(cs.evaluate([a, b, c]), sort_keys=True)
        r2 = json.dumps(cs.evaluate([c, a, b]), sort_keys=True)
        self.assertEqual(r1, r2)


class TestRanking(unittest.TestCase):
    def test_ranked_by_score(self):
        res = cs.evaluate([opt("low", ev=0.1), opt("high", ev=0.9), opt("mid", ev=0.5)])
        self.assertEqual([r["id"] for r in res["ranked"]], ["high", "mid", "low"])
        self.assertEqual([r["rank"] for r in res["ranked"]], [1, 2, 3])

    def test_tie_break_by_id(self):
        res = cs.evaluate([opt("zeta"), opt("alpha"), opt("mu")])
        self.assertEqual([r["id"] for r in res["ranked"]], ["alpha", "mu", "zeta"])

    def test_breakdown_and_rationale_present(self):
        r = cs.evaluate([opt("a", ev=0.5)])["ranked"][0]
        self.assertEqual(set(r["breakdown"]), set(cs.WEIGHTS))
        self.assertAlmostEqual(sum(b["points"] for b in r["breakdown"].values()), r["score"], places=2)
        self.assertIn("Ranked #1", r["rationale"])


class TestThresholdAndMargin(unittest.TestCase):
    def test_single_option_above_threshold_proceeds(self):
        self.assertEqual(cs.evaluate([opt("a")])["decision"], "proceed")

    def test_below_threshold_escalates(self):
        # evidence 0.2 -> 8 + 20 + 15 + 10 + 15 = 68 < 70
        res = cs.evaluate([opt("a", ev=0.2)])
        self.assertEqual(res["ranked"][0]["score"], 68.0)
        self.assertEqual(res["decision"], "gather_more_evidence_or_escalate")

    def test_exactly_threshold_proceeds(self):
        # evidence 0.25 -> 10 + 60 = 70
        res = cs.evaluate([opt("a", ev=0.25)])
        self.assertEqual(res["ranked"][0]["score"], 70.0)
        self.assertEqual(res["decision"], "proceed")

    def test_small_margin_escalates(self):
        res = cs.evaluate([opt("a", ev=1.0), opt("b", ev=0.9)])  # lead 4
        self.assertEqual(res["lead_over_runner_up"], 4.0)
        self.assertEqual(res["decision"], "gather_more_evidence_or_escalate")
        self.assertIn("margin", res["decision_reason"])

    def test_clear_margin_proceeds(self):
        res = cs.evaluate([opt("a", ev=1.0), opt("b", ev=0.5)])  # lead 20
        self.assertEqual(res["decision"], "proceed")

    def test_recursive_sub_choices(self):
        subs = [opt("s-good"), opt("s-bad", ev=0.0, agree=0)]
        res = cs.evaluate([opt("a", subs=subs), opt("b", ev=0.1)])
        top = res["ranked"][0]
        self.assertEqual(top["sub_decision"]["decision"], "proceed")
        self.assertEqual(top["sub_decision"]["top_id"], "s-good")
        self.assertNotIn("sub_decision", res["ranked"][1])


class TestAlwaysAskOwner(unittest.TestCase):
    def test_each_flag_forces_owner(self):
        for f in cs.ACTION_FLAGS:
            res = cs.evaluate([opt("a", flags={f: True}), opt("b", ev=0.0)])
            self.assertEqual(res["ranked"][0]["score"], 100.0)
            self.assertTrue(res["needs_owner"], f)
            self.assertTrue(res["ranked"][0]["needs_owner"], f)
            self.assertEqual(res["decision"], "ask_owner", f)

    def test_flagged_sub_choice_bubbles_up(self):
        res = cs.evaluate([opt("a", subs=[opt("s", flags={"spends_money": True})])])
        self.assertTrue(res["needs_owner"])
        self.assertEqual(res["ranked"][0]["sub_decision"]["decision"], "ask_owner")

    def test_false_flags_do_not_trigger(self):
        res = cs.evaluate([opt("a", flags={"destructive": False, "sends_message": False, "spends_money": False})])
        self.assertFalse(res["needs_owner"])
        self.assertEqual(res["decision"], "proceed")


class TestBadInput(unittest.TestCase):
    def bad(self, data):
        with self.assertRaises(cs.InputError):
            cs.evaluate(data)

    def test_bad_shapes(self):
        self.bad([])
        self.bad({"id": "a"})
        self.bad(["x"])
        self.bad([{"title": "no id"}])
        self.bad([opt("a"), opt("a")])

    def test_bad_values(self):
        for k, v in (("cost", 1.5), ("risk", -0.1), ("reversibility", "high"), ("source_agreement", True)):
            o = opt("a")
            o[k] = v
            self.bad([o])
        o = opt("a"); del o["risk"]; self.bad([o])
        o = opt("a"); o["evidence"] = {"tiktok": 1}; self.bad([o])
        o = opt("a"); o["evidence"] = {"web": 1.5}; self.bad([o])
        o = opt("a"); o["flags"] = {"destructive": "yes"}; self.bad([o])
        o = opt("a"); o["flags"] = {"nuke": True}; self.bad([o])

    def test_cli_bad_json_exit_2(self):
        p = subprocess.run([sys.executable, SCRIPT], input=b"{not json", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertEqual(p.returncode, 2)
        self.assertIn(b"invalid JSON", p.stderr)

    def test_cli_file_arg(self):
        ex = os.path.join(HERE, "..", "scripts", "examples", "confidence_scorer_example.json")
        p = subprocess.run([sys.executable, SCRIPT, ex, "--json"], stdout=subprocess.PIPE)
        self.assertEqual(p.returncode, 0)
        self.assertEqual(json.loads(p.stdout)["top_id"], "a-publish-draft")


if __name__ == "__main__":
    unittest.main()
