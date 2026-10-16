"""Tests for evidence_scoring.py (stdlib only; jsonschema path runs if installed)."""

import copy
import csv
import importlib.util
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import evidence_scoring as es  # noqa: E402

CASES = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "case-files", "general", "sar_case_records.json"
    )
)
HAS_JSONSCHEMA = importlib.util.find_spec("jsonschema") is not None


def clue(src, cred, anchor=False, desc=None):
    return {
        "description": desc or f"{src}{cred}{'-anchor' if anchor else ''}",
        "source_reliability": src,
        "information_credibility": cred,
        "is_physical_anchor": anchor,
    }


class Scoring(unittest.TestCase):
    def test_codes_are_concatenated(self):
        self.assertEqual(es.score_clue(clue("A", "2")).code, "A2")
        self.assertEqual(es.score_clue(clue("e", 5)).code, "E5")  # lower case and int accepted

    def test_invalid_grades_rejected(self):
        for bad in [("G", "1"), ("A", "7"), ("A", "0"), ("", "1"), ("AB", "1"), ("A", True)]:
            with self.assertRaises(es.ScoringError, msg=bad):
                es.score_clue(clue(*bad))

    def test_stored_code_mismatch_rejected(self):
        c = clue("B", "2")
        c["code"] = "A1"
        with self.assertRaisesRegex(es.ScoringError, "stored code"):
            es.score_clue(c)

    def test_sort_order_source_then_cred_then_anchor(self):
        clues = [
            clue("B", "1", desc="b1"),
            clue("A", "3", desc="a3"),
            clue("E", "5", desc="e5"),
            clue("A", "2", False, desc="a2-gauge"),
            clue("A", "2", True, desc="a2-anchor"),
            clue("A", "1", desc="a1"),
            clue("C", "2", desc="c2"),
        ]
        order = [s.description for s in es.rank_clues(clues)]
        self.assertEqual(order, ["a1", "a2-anchor", "a2-gauge", "a3", "b1", "c2", "e5"])
        self.assertEqual([s.rank for s in es.rank_clues(clues)], list(range(1, 8)))

    def test_ties_keep_input_order(self):
        clues = [clue("B", "2", desc="first"), clue("B", "2", desc="second")]
        self.assertEqual([s.description for s in es.rank_clues(clues)], ["first", "second"])


class GeographyGate(unittest.TestCase):
    def test_e_f_and_cred_5_6_never_set_geography(self):
        for src in es.SOURCES:
            for cred in es.CREDIBILITIES:
                if src in ("E", "F") or cred in ("5", "6"):
                    for anchor in (True, False):
                        s = es.score_clue(clue(src, cred, anchor))
                        self.assertFalse(s.may_set_geography, s.code)
                        self.assertEqual(s.geography_role, "verify-only")

    def test_a_tier_physical_anchor_may_set_geography(self):
        for cred in ("1", "2", "3"):
            self.assertTrue(es.score_clue(clue("A", cred, True)).may_set_geography)

    def test_a_tier_non_anchor_and_lower_tiers_do_not(self):
        self.assertFalse(es.score_clue(clue("A", "1", False)).may_set_geography)  # gauge data
        self.assertFalse(es.score_clue(clue("A", "4", True)).may_set_geography)  # doubtful anchor
        b = es.score_clue(clue("B", "1", True))
        self.assertFalse(b.may_set_geography)
        self.assertEqual(b.geography_role, "corroborate-to-anchor")

    def test_okanogan_only_firearm_sets_geography(self):
        okan = [c for c in es.load_cases(CASES) if c["case_id"] == "OKANOGAN-2026-05-27"][0]
        ranked = es.rank_clues(okan["evidence"])
        geo = [s.description for s in ranked if s.may_set_geography]
        self.assertEqual(len(geo), 1)
        self.assertIn("Firearm", geo[0])
        self.assertEqual(ranked[0].code, "A1")


class Validation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = es.load_schema()
        cls.cases = es.load_cases(CASES)

    def test_schema_structure_ok(self):
        self.assertEqual(es.check_schema_structure(self.schema), [])

    def test_schema_structure_catches_enum_drift(self):
        bad = copy.deepcopy(self.schema)
        bad["case_record"]["properties"]["evidence"]["items"]["properties"]["source_reliability"]["enum"].append("G")
        errs = es.check_schema_structure(bad)
        self.assertTrue(any("disagree" in e for e in errs), errs)

    def test_schema_structure_catches_unsupported_keyword(self):
        bad = copy.deepcopy(self.schema)
        bad["case_record"]["properties"]["case_id"]["pattern"] = "^[A-Z]"
        self.assertTrue(any("pattern" in e for e in es.check_schema_structure(bad)))

    def test_seed_cases_pass_builtin(self):
        self.assertEqual(len(self.cases), 2)
        for c in self.cases:
            r = es.validate_case(c, self.schema, use_jsonschema=False)
            self.assertTrue(r.ok, (c["case_id"], r.errors))

    def test_shtuka_null_discharge_is_warning_not_error(self):
        sh = [c for c in self.cases if c["case_id"] == "SHTUKA-2018-02-17"][0]
        r = es.validate_case(sh, self.schema, use_jsonschema=False)
        self.assertTrue(any("discharge_cfs" in w for w in r.warnings))

    @unittest.skipUnless(HAS_JSONSCHEMA, "jsonschema not installed")
    def test_seed_cases_pass_jsonschema(self):
        for c in self.cases:
            r = es.validate_case(c, self.schema, use_jsonschema=True)
            self.assertEqual(r.engine, "builtin+jsonschema")
            self.assertTrue(r.ok, r.errors)

    def _broken(self, mutate):
        rec = copy.deepcopy(self.cases[0])
        mutate(rec)
        out = []
        for use_js in (False, True) if HAS_JSONSCHEMA else (False,):
            r = es.validate_case(rec, self.schema, use_jsonschema=use_js)
            self.assertFalse(r.ok)
            out.append(" | ".join(r.errors))
        return out[0]

    def test_missing_required_top_level(self):
        self.assertIn("missing required field 'ethics_gates'", self._broken(lambda r: r.pop("ethics_gates")))

    def test_bad_case_class_enum(self):
        msg = self._broken(lambda r: r.__setitem__("case_class", "maritime"))
        self.assertIn("case.case_class", msg)
        self.assertIn("'maritime' not in", msg)

    def test_bad_source_grade(self):
        msg = self._broken(lambda r: r["evidence"][0].__setitem__("source_reliability", "Z"))
        self.assertIn("case.evidence[0].source_reliability", msg)

    def test_numeric_credibility_is_wrong_type(self):
        msg = self._broken(lambda r: r["evidence"][1].__setitem__("information_credibility", 1))
        self.assertIn("expected string", msg)

    def test_missing_ethics_gate_flag(self):
        msg = self._broken(lambda r: r["ethics_gates"].pop("decedent_privacy"))
        self.assertIn("decedent_privacy", msg)

    def test_bad_datetime(self):
        msg = self._broken(lambda r: r["incident"].__setitem__("datetime_report", "May 27 2026 2:30pm"))
        self.assertIn("date-time", msg)

    def test_code_mismatch(self):
        msg = self._broken(lambda r: r["evidence"][0].__setitem__("code", "A1"))
        self.assertIn("stored 'A1' != A2", msg)

    def test_lat_as_string(self):
        msg = self._broken(lambda r: r["incident"].__setitem__("lat", "48.93"))
        self.assertIn("case.incident.lat: expected number", msg)


class Cli(unittest.TestCase):
    def test_validate_exit_codes(self):
        with redirect_stdout(io.StringIO()) as out:
            self.assertEqual(es.main(["validate", CASES]), 0)
        self.assertIn("PASS OKANOGAN-2026-05-27", out.getvalue())
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "bad.json")
            with open(p, "w") as f:
                f.write('{"case_id": "X", "case_class": "riverine_recovery"}')
            with redirect_stdout(io.StringIO()) as out:
                self.assertEqual(es.main(["validate", p]), 1)
            self.assertIn("FAIL X", out.getvalue())

    def test_rank_csv_writes_table(self):
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, "clues.csv")
            with open(src, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["description", "source_reliability", "information_credibility", "is_physical_anchor"])
                w.writerow(["youtube comment", "E", "5", "false"])
                w.writerow(["phone found on bank", "A", "1", "true"])
            outp = os.path.join(d, "ranked.csv")
            with redirect_stdout(io.StringIO()):
                self.assertEqual(es.main(["rank", "--csv", src, "--out", outp]), 0)
            with open(outp) as f:
                rows = list(csv.DictReader(f))
            self.assertEqual([r["code"] for r in rows], ["A1", "E5"])
            self.assertEqual([r["may_set_geography"] for r in rows], ["True", "False"])

    def test_rank_bad_csv_exits_nonzero(self):
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, "clues.csv")
            with open(src, "w") as f:
                f.write("description,source_reliability,information_credibility\nx,Q,1\n")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()) as err:
                self.assertEqual(es.main(["rank", "--csv", src]), 1)
            self.assertIn("source_reliability must be one of A-F", err.getvalue())


if __name__ == "__main__":
    unittest.main()
