#!/usr/bin/env python3
"""Check a Taphos-Stick field log against the thresholds written in it.

Replaces taphos_serial_parser.py (docs/case-files), which marked a row
"VALIDATED" whenever a value was present, always reported device_status
ONLINE, swallowed every error, exited 0, and wrote to a fixed path.

Input: a CSV with the columns Subsystem, Parameter, Expected_Threshold and
Actual_Field_Value (a path, or "-" for stdin). Each row's logged value is
compared with its threshold:

  ">= 12", "> 12", "<= 0.5", "< 0.5", "= 3", "!= 0"   comparison
  "12-20", "12 to 20", "12..20"                       inclusive range
  "85%", "12 V"                                       bare value: read as a minimum (see --bare-number)
  "RTK Fix", '"Firmware v2.1"'                        exact text (quote it if it contains digits)

A unit or "%" after the number must match the unit on the logged value when
the logged value has one.

Row status: PASS, FAIL, PENDING (no logged value) or UNPARSEABLE_THRESHOLD.
Overall status: FAIL if any row fails; otherwise INCOMPLETE if any row is
pending or has an unparseable threshold (or the log has no rows); otherwise
PASS.

Exit code: 0 only when the overall status is PASS, 1 on FAIL, 2 on
INCOMPLETE or invalid input (missing file, missing columns).

The output summarises what the log says. It makes no claim about whether the
device is online.

Example:
  python field_log.py st-francisville-ops-log.csv --out field_log_report.json
  cat log.csv | python field_log.py - --out report.json
"""

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import sys

REQUIRED_COLUMNS = ("Subsystem", "Parameter", "Expected_Threshold", "Actual_Field_Value")

EXIT_PASS, EXIT_FAIL, EXIT_INCOMPLETE = 0, 1, 2

_NUM = r"[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[-+]?\.\d+"
_UNIT = r"[A-Za-z%°µ/][A-Za-z0-9%°µ/^.\-]*"
_OPS = (">=", "<=", "!=", "==", "≥", "≤", ">", "<", "=")
_OP_CANON = {"≥": ">=", "≤": "<=", "==": "="}

_CMP_RE = re.compile(rf"^(>=|<=|!=|==|≥|≤|>|<|=)\s*({_NUM})\s*({_UNIT})?$")
_RANGE_RE = re.compile(rf"^({_NUM})\s*({_UNIT})?\s*(?:-|–|—|to|\.\.)\s*({_NUM})\s*({_UNIT})?$", re.IGNORECASE)
_BARE_RE = re.compile(rf"^({_NUM})\s*({_UNIT})?$")
_VALUE_RE = re.compile(rf"^({_NUM})\s*({_UNIT})?$")
_QUOTED_RE = re.compile(r'^(?:=\s*)?(["\'])(.*)\1$')


def _num(text):
    return float(text.replace(",", ""))


def _unit(text):
    return (text or "").strip() or None


def parse_threshold(text, bare_number="min"):
    """Parse an Expected_Threshold cell.

    Returns a dict with "kind" in {"compare", "range", "text"} or
    {"kind": "unparseable", "reason": ...}. Never raises."""
    if text is None or not str(text).strip():
        return {"kind": "unparseable", "reason": "threshold is empty"}
    s = " ".join(str(text).split())
    q = _QUOTED_RE.match(s)
    if q:
        return {"kind": "text", "expected": q.group(2)}
    m = _CMP_RE.match(s)
    if m:
        op = _OP_CANON.get(m.group(1), m.group(1))
        return {"kind": "compare", "op": op, "value": _num(m.group(2)), "unit": _unit(m.group(3))}
    if s.startswith(_OPS):
        return {"kind": "unparseable", "reason": f"comparison {s!r} has no number after the operator"}
    m = _RANGE_RE.match(s)
    if m:
        lo, hi = _num(m.group(1)), _num(m.group(3))
        u1, u2 = _unit(m.group(2)), _unit(m.group(4))
        if u1 and u2 and u1 != u2:
            return {"kind": "unparseable", "reason": f"range has two different units ({u1}, {u2})"}
        if lo > hi:
            return {"kind": "unparseable", "reason": f"range low end {lo} is above high end {hi}"}
        return {"kind": "range", "low": lo, "high": hi, "unit": u1 or u2}
    m = _BARE_RE.match(s)
    if m:
        op = {"min": ">=", "max": "<=", "equal": "="}[bare_number]
        return {"kind": "compare", "op": op, "value": _num(m.group(1)), "unit": _unit(m.group(2)),
                "interpretation": f"bare value read as {op} (--bare-number {bare_number})"}
    if any(ch.isdigit() for ch in s):
        return {"kind": "unparseable",
                "reason": "contains digits but is not a comparison, range or number; quote it for an exact text match"}
    return {"kind": "text", "expected": s}


def parse_value(text):
    """Return (number, unit) for a logged value, or None if not numeric."""
    m = _VALUE_RE.match(" ".join(str(text).split()))
    if not m:
        return None
    return _num(m.group(1)), _unit(m.group(2))


def _compare(op, v, ref):
    return {">=": v >= ref, "<=": v <= ref, ">": v > ref, "<": v < ref, "=": v == ref, "!=": v != ref}[op]


def evaluate(threshold, value):
    """Return (status, reason) for one row. `threshold` is parse_threshold() output."""
    if value is None or not str(value).strip():
        return "PENDING", "no logged value"
    raw = " ".join(str(value).split())
    if threshold["kind"] == "unparseable":
        return "UNPARSEABLE_THRESHOLD", threshold["reason"]
    if threshold["kind"] == "text":
        ok = raw == threshold["expected"]
        return ("PASS" if ok else "FAIL"), f"text {'matches' if ok else 'does not match'} {threshold['expected']!r}"
    parsed = parse_value(raw)
    if parsed is None:
        return "FAIL", f"logged value {raw!r} is not a number"
    v, unit = parsed
    want = threshold.get("unit")
    if want and unit and unit.lower() != want.lower():
        return "FAIL", f"unit mismatch: logged {unit!r}, threshold {want!r}"
    if threshold["kind"] == "range":
        ok = threshold["low"] <= v <= threshold["high"]
        span = f"[{threshold['low']:g}, {threshold['high']:g}]"
        return ("PASS" if ok else "FAIL"), f"{v:g} {'in' if ok else 'outside'} {span}"
    ok = _compare(threshold["op"], v, threshold["value"])
    return ("PASS" if ok else "FAIL"), f"{v:g} {threshold['op']} {threshold['value']:g} is {str(ok).lower()}"


class InputError(ValueError):
    """The log cannot be checked at all (missing columns, unreadable file)."""


def read_rows(text):
    """Parse CSV text. Returns list of (line_number, dict). Raises InputError."""
    text = text.lstrip("﻿")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise InputError("the log is empty (no header row)")
    reader.fieldnames = [(f or "").strip() for f in reader.fieldnames]
    missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
    if missing:
        raise InputError(f"missing required column(s): {', '.join(missing)}; found: {', '.join(reader.fieldnames)}")
    rows = []
    for rec in reader:
        cells = {k: (rec.get(k) or "").strip() for k in REQUIRED_COLUMNS}
        if not any(cells.values()):
            continue  # blank spacer row
        rows.append((reader.line_num, cells))
    return rows


def overall_status(statuses):
    if not statuses:
        return "INCOMPLETE"
    if "FAIL" in statuses:
        return "FAIL"
    if any(s != "PASS" for s in statuses):
        return "INCOMPLETE"
    return "PASS"


def check_log(text, source="<stdin>", bare_number="min"):
    rows_out = []
    for line, cells in read_rows(text):
        th = parse_threshold(cells["Expected_Threshold"], bare_number)
        status, reason = evaluate(th, cells["Actual_Field_Value"])
        rows_out.append({
            "csv_line": line,
            "subsystem": cells["Subsystem"],
            "parameter": cells["Parameter"],
            "expected_threshold": cells["Expected_Threshold"],
            "parsed_threshold": th,
            "logged_value": cells["Actual_Field_Value"] or None,
            "status": status,
            "reason": reason,
        })
    statuses = [r["status"] for r in rows_out]
    counts = {k: statuses.count(k) for k in ("PASS", "FAIL", "PENDING", "UNPARSEABLE_THRESHOLD")}
    return {
        "tool": "field_log.py",
        "source": source,
        "source_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "overall_status": overall_status(statuses),
        "row_count": len(rows_out),
        "counts": counts,
        "note": "Summarises what the log records against its own thresholds. It does not report device state.",
        "rows": rows_out,
    }


EXIT_FOR = {"PASS": EXIT_PASS, "FAIL": EXIT_FAIL, "INCOMPLETE": EXIT_INCOMPLETE}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("log", help="field log CSV, or - for stdin")
    ap.add_argument("--out", help="write the JSON report here (default: stdout)")
    ap.add_argument("--bare-number", choices=("min", "max", "equal"), default="min",
                    help="how to read a threshold that is only a number, e.g. '85%%' (default: min, i.e. >=)")
    a = ap.parse_args(argv)
    try:
        if a.log == "-":
            text, source = sys.stdin.read(), "<stdin>"
        else:
            with open(a.log, encoding="utf-8-sig", newline="") as f:
                text, source = f.read(), a.log
        report = check_log(text, source, a.bare_number)
    except (OSError, UnicodeDecodeError, csv.Error, InputError) as e:
        print(f"field_log: invalid input: {e}", file=sys.stderr)
        return EXIT_INCOMPLETE
    payload = json.dumps(report, indent=2, ensure_ascii=False)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(payload + "\n")
    else:
        print(payload)
    c = report["counts"]
    print(f"field_log: {report['overall_status']} ({report['row_count']} rows: {c['PASS']} pass, {c['FAIL']} fail, "
          f"{c['PENDING']} pending, {c['UNPARSEABLE_THRESHOLD']} unparseable threshold)", file=sys.stderr)
    return EXIT_FOR[report["overall_status"]]


if __name__ == "__main__":
    sys.exit(main())
