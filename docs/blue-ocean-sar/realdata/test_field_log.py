"""Tests for field_log.py. Standard library only, so they always run."""

import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import field_log as fl  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
HEADER = "Subsystem,Parameter,Expected_Threshold,Actual_Field_Value\n"


def _csv(*rows):
    return HEADER + "".join(",".join(r) + "\n" for r in rows)


class ThresholdParsing(unittest.TestCase):
    def test_comparison_forms(self):
        self.assertEqual(fl.parse_threshold(">= 12"), {"kind": "compare", "op": ">=", "value": 12.0, "unit": None})
        self.assertEqual(fl.parse_threshold("< 0.5")["op"], "<")
        self.assertEqual(fl.parse_threshold("< 0.5")["value"], 0.5)
        self.assertEqual(fl.parse_threshold("≤ 3 V"), {"kind": "compare", "op": "<=", "value": 3.0, "unit": "V"})
        self.assertEqual(fl.parse_threshold("== 1,200")["value"], 1200.0)
        self.assertEqual(fl.parse_threshold("!= 0")["op"], "!=")

    def test_percent_bare_value_is_minimum_by_default(self):
        t = fl.parse_threshold("85%")
        self.assertEqual((t["kind"], t["op"], t["value"], t["unit"]), ("compare", ">=", 85.0, "%"))
        self.assertEqual(fl.parse_threshold("85%", bare_number="max")["op"], "<=")

    def test_range_forms(self):
        for s in ("12-20", "12 - 20", "12 to 20", "12..20", "12–20"):
            t = fl.parse_threshold(s)
            self.assertEqual((t["kind"], t["low"], t["high"]), ("range", 12.0, 20.0), s)
        self.assertEqual(fl.parse_threshold("-5-5")["low"], -5.0)
        self.assertEqual(fl.parse_threshold("10-20 cm")["unit"], "cm")

    def test_text_forms(self):
        self.assertEqual(fl.parse_threshold("RTK Fix"), {"kind": "text", "expected": "RTK Fix"})
        self.assertEqual(fl.parse_threshold('"Firmware v2.1"'), {"kind": "text", "expected": "Firmware v2.1"})

    def test_unparseable_forms(self):
        for s in ("", "   ", ">= abc", "about 12ish", "20-12", "12 V-20 cm"):
            self.assertEqual(fl.parse_threshold(s)["kind"], "unparseable", s)


class RowEvaluation(unittest.TestCase):
    def _st(self, threshold, value):
        return fl.evaluate(fl.parse_threshold(threshold), value)[0]

    def test_compares_against_threshold_not_mere_presence(self):
        # The original marked any present value VALIDATED.
        self.assertEqual(self._st(">= 12", "11.9"), "FAIL")
        self.assertEqual(self._st(">= 12", "12"), "PASS")
        self.assertEqual(self._st("> 12", "12"), "FAIL")
        self.assertEqual(self._st("< 0.5", "0.49"), "PASS")
        self.assertEqual(self._st("< 0.5", "0.5"), "FAIL")
        self.assertEqual(self._st("<= 0.5", "0.5"), "PASS")
        self.assertEqual(self._st("!= 0", "0"), "FAIL")

    def test_percent_and_units(self):
        self.assertEqual(self._st("85%", "87%"), "PASS")
        self.assertEqual(self._st("85%", "84%"), "FAIL")
        self.assertEqual(self._st("85%", "90"), "PASS")
        self.assertEqual(self._st(">= 12 V", "12.4 V"), "PASS")
        self.assertEqual(self._st(">= 12 V", "12.4 mA"), "FAIL")

    def test_range_inclusive(self):
        self.assertEqual(self._st("12-20", "12"), "PASS")
        self.assertEqual(self._st("12-20", "20"), "PASS")
        self.assertEqual(self._st("12-20", "20.01"), "FAIL")
        self.assertEqual(self._st("12-20", "11.99"), "FAIL")

    def test_text_exact(self):
        self.assertEqual(self._st("RTK Fix", "RTK Fix"), "PASS")
        self.assertEqual(self._st("RTK Fix", "RTK Float"), "FAIL")
        self.assertEqual(self._st("RTK Fix", "rtk fix"), "FAIL")

    def test_pending_unparseable_and_non_numeric(self):
        self.assertEqual(self._st(">= 12", ""), "PENDING")
        self.assertEqual(self._st(">= 12", "  "), "PENDING")
        self.assertEqual(self._st("about 12ish", "13"), "UNPARSEABLE_THRESHOLD")
        self.assertEqual(self._st(">= 12", "OK"), "FAIL")


class OverallAndExitCodes(unittest.TestCase):
    def _run(self, text, *extra):
        with tempfile.TemporaryDirectory() as d:
            src, out = os.path.join(d, "log.csv"), os.path.join(d, "out.json")
            with open(src, "w", encoding="utf-8") as f:
                f.write(text)
            with redirect_stderr(io.StringIO()):
                code = fl.main([src, "--out", out, *extra])
            report = None
            if os.path.exists(out):
                with open(out, encoding="utf-8") as f:
                    report = json.load(f)
            return code, report

    def test_all_pass_exit_0(self):
        code, r = self._run(_csv(("GNSS", "Fix", "RTK Fix", "RTK Fix"), ("Power", "Battery", "85%", "90%")))
        self.assertEqual((code, r["overall_status"]), (0, "PASS"))
        self.assertEqual(r["counts"]["PASS"], 2)
        self.assertNotIn("device_status", r)

    def test_one_failure_exit_1_and_row_flagged(self):
        code, r = self._run(_csv(("Power", "Battery", "85%", "90%"), ("Probe", "Depth cm", "12-20", "25")))
        self.assertEqual((code, r["overall_status"]), (1, "FAIL"))
        self.assertEqual([x["status"] for x in r["rows"]], ["PASS", "FAIL"])
        self.assertEqual(r["rows"][1]["csv_line"], 3)

    def test_fail_outranks_pending(self):
        code, r = self._run(_csv(("A", "x", ">= 1", "0"), ("A", "y", ">= 1", "")))
        self.assertEqual((code, r["overall_status"]), (1, "FAIL"))

    def test_pending_exit_2(self):
        code, r = self._run(_csv(("A", "x", ">= 1", "2"), ("A", "y", ">= 1", "")))
        self.assertEqual((code, r["overall_status"]), (2, "INCOMPLETE"))

    def test_unparseable_threshold_is_incomplete(self):
        code, r = self._run(_csv(("A", "x", ">= 1", "2"), ("A", "y", "roughly 5ish", "5")))
        self.assertEqual((code, r["overall_status"]), (2, "INCOMPLETE"))

    def test_missing_column_exit_2_no_output(self):
        code, r = self._run("Subsystem,Parameter,Actual_Field_Value\nA,x,1\n")
        self.assertEqual((code, r), (2, None))

    def test_missing_file_exit_2(self):
        with redirect_stderr(io.StringIO()):
            self.assertEqual(fl.main([os.path.join(HERE, "no-such-log.csv")]), 2)

    def test_empty_log_is_incomplete(self):
        code, r = self._run(HEADER + ",,,\n")
        self.assertEqual((code, r["overall_status"], r["row_count"]), (2, "INCOMPLETE", 0))

    def test_stdin_and_exit_code_through_process(self):
        text = _csv(("A", "x", "< 0.5", "0.7"))
        p = subprocess.run([sys.executable, os.path.join(HERE, "field_log.py"), "-"], input=text,
                           capture_output=True, text=True, check=False)
        self.assertEqual(p.returncode, 1, p.stderr)
        self.assertEqual(json.loads(p.stdout)["rows"][0]["status"], "FAIL")


if __name__ == "__main__":
    unittest.main()
