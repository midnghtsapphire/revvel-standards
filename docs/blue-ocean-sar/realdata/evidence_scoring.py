"""Admiralty two-axis evidence scoring and case-record validation.

Implements the evidence scoring system and case-record structure in
``docs/case-files/general/sar_repository_schema.json`` (v0.1.0).

Two independent axes (the schema's "principle"):

* source reliability ``A``-``F`` (A = physical evidence / instrumented data,
  F = reliability cannot be judged);
* information credibility ``1``-``6`` (1 = confirmed, 6 = truth cannot be judged).

The code is the plain concatenation, e.g. ``A2``.

Sort order (``rank_clues``)
---------------------------
Clues are sorted by, in order:

1. source rank, A before B before ... F;
2. credibility, 1 before 2 before ... 6;
3. within an exact code tie, physical anchors (``is_physical_anchor`` true)
   before everything else;
4. original input order (the sort is stable), so the output is deterministic.

The source axis leads because the schema says physical/instrumented (A-tier)
evidence outranks all witness/OSINT. So ``A3`` sorts above ``B1``. That is a
choice; the schema does not define a single combined number.

Geography gate (``may_set_geography``)
--------------------------------------
From the schema's ``combined_priority`` text and the riverine method's section 4:

* source ``E`` or ``F``, or credibility ``5`` or ``6`` -> never sets search
  geography (``False``). Route to investigators.
* source ``A`` **and** ``is_physical_anchor`` true **and** credibility ``1``-``3``
  -> may set geography (``True``). Credibility 4 ("doubtful - not consistent
  with known facts") is held back even for A-tier, because an anchor that
  contradicts the other facts must be resolved before a search is built on it.
* everything else (B-D sources, or A-tier data that is not a physical anchor,
  such as a gauge reading) -> ``False``: it informs the model (hydrology,
  timing, scenario) but does not by itself fix *where* to search. A B-tier
  physical anchor (e.g. witnesses placing the LKP) is reported as
  ``corroborate-to-anchor`` so a human can promote it explicitly.

This gate is stricter than "anything not E/F": the tool never promotes a clue
to a geography driver on its own judgement.

Validation
----------
``validate_case`` checks a case record against the schema's ``case_record``
sub-schema. A small built-in validator handles every keyword the schema uses
(``type``, ``required``, ``properties``, ``enum``, ``items``, ``format:
date-time``). If the ``jsonschema`` package is installed it is also run, and
both must agree. Two documented leniencies:

* a ``null`` value for a property that is not ``required`` is treated as
  "not provided" and reported as a warning (the SHTUKA seed case stores
  ``discharge_cfs: null`` for a terrain case, where the schema says ``number``);
* the stored ``code`` must equal source + credibility; a mismatch is an error.

CLI
---
::

    python evidence_scoring.py rank --case sar_case_records.json [--case-id ID] [--out ranked.csv]
    python evidence_scoring.py rank --csv clues.csv [--out ranked.csv]
    python evidence_scoring.py validate sar_case_records.json [--schema sar_repository_schema.json]

``validate`` exits 1 if any record fails. ``rank`` exits 1 on any invalid clue.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime

SOURCES = ("A", "B", "C", "D", "E", "F")
CREDIBILITIES = ("1", "2", "3", "4", "5", "6")

SOURCE_LABELS = {
    "A": "Completely reliable",
    "B": "Usually reliable",
    "C": "Fairly reliable",
    "D": "Not usually reliable",
    "E": "Unreliable",
    "F": "Reliability cannot be judged",
}
CREDIBILITY_LABELS = {
    "1": "Confirmed",
    "2": "Probably true",
    "3": "Possibly true",
    "4": "Doubtful",
    "5": "Improbable",
    "6": "Truth cannot be judged",
}

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SCHEMA = os.path.normpath(os.path.join(HERE, "..", "..", "case-files", "general", "sar_repository_schema.json"))


class ScoringError(ValueError):
    """Raised for an invalid source or credibility grade."""


def normalise_source(value) -> str:
    s = str(value).strip().upper() if value is not None else ""
    if s not in SOURCES:
        raise ScoringError(f"source_reliability must be one of A-F, got {value!r}")
    return s


def normalise_credibility(value) -> str:
    if isinstance(value, bool):
        raise ScoringError(f"information_credibility must be one of 1-6, got {value!r}")
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    s = str(value).strip() if value is not None else ""
    if s not in CREDIBILITIES:
        raise ScoringError(f"information_credibility must be one of 1-6, got {value!r}")
    return s


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    s = str(value).strip().lower()
    if s in ("true", "1", "yes", "y", "t"):
        return True
    if s in ("false", "0", "no", "n", "f", ""):
        return False
    raise ScoringError(f"is_physical_anchor must be true/false, got {value!r}")


def geography_gate(source: str, cred: str, is_physical_anchor: bool) -> tuple[bool, str, str]:
    """Return ``(may_set_geography, role, reason)``. See the module docstring."""
    if source in ("E", "F") or cred in ("5", "6"):
        return (
            False,
            "verify-only",
            f"{source}{cred}: E/F source or credibility 5/6 never sets search geography; route to investigators",
        )
    if source == "A" and is_physical_anchor and cred in ("1", "2", "3"):
        return True, "anchor", f"{source}{cred}: A-tier physical anchor may set search geography"
    if source == "A" and is_physical_anchor:
        return False, "resolve-first", f"{source}{cred}: A-tier anchor but doubtful; resolve the contradiction first"
    if is_physical_anchor:
        return (
            False,
            "corroborate-to-anchor",
            f"{source}{cred}: physical anchor from a {source}-tier source; promote only after A-tier corroboration",
        )
    return False, "informs-model", f"{source}{cred}: informs the model but is not a location anchor"


@dataclass
class ScoredClue:
    description: str
    source: str
    credibility: str
    is_physical_anchor: bool
    index: int
    code: str = ""
    may_set_geography: bool = False
    geography_role: str = ""
    gate_reason: str = ""
    verification_status: str = ""
    action: str = ""
    rank: int = 0
    extra: dict = field(default_factory=dict)

    def sort_key(self):
        return (SOURCES.index(self.source), CREDIBILITIES.index(self.credibility), 0 if self.is_physical_anchor else 1)

    def as_row(self) -> dict:
        return {
            "rank": self.rank,
            "code": self.code,
            "source_reliability": self.source,
            "information_credibility": self.credibility,
            "is_physical_anchor": self.is_physical_anchor,
            "may_set_geography": self.may_set_geography,
            "geography_role": self.geography_role,
            "gate_reason": self.gate_reason,
            "verification_status": self.verification_status,
            "description": self.description,
            "action": self.action,
        }


def score_clue(clue: dict, index: int = 0) -> ScoredClue:
    """Validate and score one clue dict (schema ``evidence`` item shape)."""
    if not isinstance(clue, dict):
        raise ScoringError(f"clue {index}: expected an object, got {type(clue).__name__}")
    desc = clue.get("description")
    if not isinstance(desc, str) or not desc.strip():
        raise ScoringError(f"clue {index}: description is required")
    try:
        src = normalise_source(clue.get("source_reliability"))
        cred = normalise_credibility(clue.get("information_credibility"))
        anchor = _as_bool(clue.get("is_physical_anchor", False))
    except ScoringError as exc:
        raise ScoringError(f"clue {index} ({desc[:40]!r}): {exc}") from None
    sc = ScoredClue(description=desc, source=src, credibility=cred, is_physical_anchor=anchor, index=index)
    sc.code = src + cred
    stored = clue.get("code")
    if stored not in (None, "") and str(stored).strip().upper() != sc.code:
        raise ScoringError(f"clue {index} ({desc[:40]!r}): stored code {stored!r} != computed {sc.code!r}")
    sc.may_set_geography, sc.geography_role, sc.gate_reason = geography_gate(src, cred, anchor)
    sc.verification_status = clue.get("verification_status") or ""
    sc.action = clue.get("action") or ""
    return sc


def rank_clues(clues: list) -> list[ScoredClue]:
    """Score and sort clues. Order: source, credibility, physical anchor first, input order."""
    scored = [score_clue(c, i) for i, c in enumerate(clues)]
    scored.sort(key=lambda s: (s.sort_key(), s.index))
    for r, s in enumerate(scored, 1):
        s.rank = r
    return scored


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

_TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "boolean": lambda v: isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "null": lambda v: v is None,
}
SUPPORTED_KEYWORDS = {"type", "required", "properties", "enum", "items", "format", "description"}


def load_schema(path: str = DEFAULT_SCHEMA) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_schema_structure(schema: dict) -> list[str]:
    """Check the repository schema document itself.

    * it has ``case_record`` and ``evidence_scoring_system``;
    * every keyword used anywhere in ``case_record`` is one the built-in
      validator implements (so a silent skip cannot happen);
    * the A-F / 1-6 tables in ``evidence_scoring_system`` match the enums the
      ``evidence`` items use, and every worked example's code is consistent.
    """
    errors = []
    rec = schema.get("case_record")
    ess = schema.get("evidence_scoring_system")
    if not isinstance(rec, dict):
        return ["schema: missing 'case_record' object"]
    if not isinstance(ess, dict):
        errors.append("schema: missing 'evidence_scoring_system' object")

    def walk(node, path):
        if not isinstance(node, dict):
            errors.append(f"schema{path}: sub-schema must be an object")
            return
        for k in node:
            if k not in SUPPORTED_KEYWORDS:
                errors.append(f"schema{path}: keyword {k!r} not supported by the built-in validator")
        t = node.get("type")
        if t is not None and t not in _TYPES:
            errors.append(f"schema{path}: unknown type {t!r}")
        for name, sub in (node.get("properties") or {}).items():
            walk(sub, f"{path}.properties.{name}")
        if "items" in node:
            walk(node["items"], f"{path}.items")
        for r in node.get("required") or []:
            if r not in (node.get("properties") or {}):
                errors.append(f"schema{path}: required {r!r} has no property definition")

    walk(rec, ".case_record")
    try:
        ev_props = rec["properties"]["evidence"]["items"]["properties"]
        src_enum = ev_props["source_reliability"]["enum"]
        cred_enum = ev_props["information_credibility"]["enum"]
    except (KeyError, TypeError):
        errors.append("schema: case_record.properties.evidence.items is missing the grade enums")
        return errors
    if isinstance(ess, dict):
        if sorted(ess.get("source_reliability", {})) != sorted(src_enum):
            errors.append("schema: source_reliability table and evidence enum disagree")
        if sorted(ess.get("information_credibility", {})) != sorted(cred_enum):
            errors.append("schema: information_credibility table and evidence enum disagree")
        for ex in ess.get("worked_examples", []):
            if ex.get("source", "") + ex.get("cred", "") != ex.get("code"):
                errors.append(f"schema: worked example {ex.get('item')!r} code does not match its grades")
    if list(src_enum) != list(SOURCES) or list(cred_enum) != list(CREDIBILITIES):
        errors.append("schema: grade enums differ from this module's A-F / 1-6")
    return errors


def _is_datetime(s: str) -> bool:
    try:
        datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return False
    return "T" in s


def _validate_node(value, sch: dict, path: str, errors: list, warnings: list) -> None:
    t = sch.get("type")
    if t is not None and not _TYPES[t](value):
        errors.append(f"{path}: expected {t}, got {type(value).__name__} ({value!r:.60})")
        return
    if "enum" in sch and value not in sch["enum"]:
        errors.append(f"{path}: {value!r} not in {sch['enum']}")
    if sch.get("format") == "date-time" and isinstance(value, str) and not _is_datetime(value):
        errors.append(f"{path}: {value!r} is not an ISO-8601 date-time")
    if isinstance(value, dict):
        props = sch.get("properties") or {}
        for r in sch.get("required") or []:
            if r not in value:
                errors.append(f"{path}: missing required field {r!r}")
        for k, sub in props.items():
            if k not in value:
                continue
            if value[k] is None and k not in (sch.get("required") or []) and sub.get("type") != "null":
                warnings.append(f"{path}.{k}: null treated as not provided (schema type {sub.get('type')})")
                continue
            _validate_node(value[k], sub, f"{path}.{k}", errors, warnings)
    if isinstance(value, list) and "items" in sch:
        for i, item in enumerate(value):
            _validate_node(item, sch["items"], f"{path}[{i}]", errors, warnings)


def _strip_optional_nulls(value, sch):
    """Copy of value without nulls on non-required properties (for jsonschema)."""
    if isinstance(value, dict) and sch.get("type") == "object":
        req = set(sch.get("required") or [])
        props = sch.get("properties") or {}
        out = {}
        for k, v in value.items():
            if v is None and k not in req and k in props and props[k].get("type") != "null":
                continue
            out[k] = _strip_optional_nulls(v, props.get(k, {}))
        return out
    if isinstance(value, list) and "items" in sch:
        return [_strip_optional_nulls(v, sch["items"]) for v in value]
    return value


def _jsonschema_errors(record: dict, rec_schema: dict):
    try:
        import jsonschema  # optional
    except ImportError:
        return None
    cleaned = _strip_optional_nulls(record, rec_schema)
    v = jsonschema.Draft7Validator(rec_schema, format_checker=jsonschema.FormatChecker())
    return sorted("/".join(str(p) for p in e.absolute_path) + ": " + e.message for e in v.iter_errors(cleaned))


@dataclass
class ValidationResult:
    case_id: str
    ok: bool
    errors: list
    warnings: list
    engine: str


def validate_case(record, schema: dict | None = None, use_jsonschema: bool = True) -> ValidationResult:
    """Validate one case record. ``ok`` is False if either engine reports an error."""
    schema = schema if schema is not None else load_schema()
    rec_schema = schema["case_record"]
    errors: list = []
    warnings: list = []
    case_id = record.get("case_id", "?") if isinstance(record, dict) else "?"
    _validate_node(record, rec_schema, "case", errors, warnings)
    if isinstance(record, dict) and isinstance(record.get("evidence"), list):
        for i, ev in enumerate(record["evidence"]):
            if not isinstance(ev, dict):
                continue
            src, cred, code = ev.get("source_reliability"), ev.get("information_credibility"), ev.get("code")
            if code is not None and src in SOURCES and cred in CREDIBILITIES and code != src + cred:
                errors.append(f"case.evidence[{i}].code: stored {code!r} != {src}{cred}")
    engine = "builtin"
    if use_jsonschema:
        js = _jsonschema_errors(record, rec_schema)
        if js is not None:
            engine = "builtin+jsonschema"
            if js and not errors:
                errors.extend(f"jsonschema: {m}" for m in js)
    return ValidationResult(str(case_id), not errors, errors, warnings, engine)


def load_cases(path: str) -> list:
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    if isinstance(doc, dict) and "cases" in doc:
        return doc["cases"]
    if isinstance(doc, list):
        return doc
    return [doc]


def load_clue_csv(path: str) -> list:
    with open(path, newline="", encoding="utf-8") as f:
        return [dict(r) for r in csv.DictReader(f)]


ROW_FIELDS = [
    "rank",
    "code",
    "source_reliability",
    "information_credibility",
    "is_physical_anchor",
    "may_set_geography",
    "geography_role",
    "gate_reason",
    "verification_status",
    "description",
    "action",
]


def write_rows(rows: list, out_path: str) -> None:
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=ROW_FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def format_table(scored: list) -> str:
    lines = [f"{'#':>2}  {'code':4}  {'anchor':6}  {'geo':5}  {'role':22}  description"]
    for s in scored:
        lines.append(
            f"{s.rank:>2}  {s.code:4}  {'yes' if s.is_physical_anchor else 'no':6}  "
            f"{'YES' if s.may_set_geography else 'no':5}  {s.geography_role:22}  {s.description[:70]}"
        )
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("rank", help="rank clues from a case JSON or a CSV")
    g = r.add_mutually_exclusive_group(required=True)
    g.add_argument("--case", help="case JSON (single record, list, or {'cases': [...]})")
    g.add_argument("--csv", help="CSV with description,source_reliability,information_credibility[,is_physical_anchor]")
    r.add_argument("--case-id", help="pick one case from a multi-case file")
    r.add_argument("--out", help="write the ranked table to this CSV")
    v = sub.add_parser("validate", help="validate case records against the schema")
    v.add_argument("path")
    v.add_argument("--schema", default=DEFAULT_SCHEMA)
    v.add_argument("--no-jsonschema", action="store_true", help="use only the built-in validator")
    a = ap.parse_args(argv)

    if a.cmd == "validate":
        schema = load_schema(a.schema)
        struct = check_schema_structure(schema)
        for e in struct:
            print(f"SCHEMA ERROR {e}")
        bad = bool(struct)
        for rec in load_cases(a.path):
            res = validate_case(rec, schema, use_jsonschema=not a.no_jsonschema)
            print(f"{'PASS' if res.ok else 'FAIL'} {res.case_id} [{res.engine}]")
            for e in res.errors:
                print(f"  error: {e}")
            for w in res.warnings:
                print(f"  warning: {w}")
            bad = bad or not res.ok
        return 1 if bad else 0

    try:
        if a.case:
            cases = load_cases(a.case)
            if a.case_id:
                cases = [c for c in cases if c.get("case_id") == a.case_id]
                if not cases:
                    print(f"no case with case_id {a.case_id!r}", file=sys.stderr)
                    return 1
            groups = [(c.get("case_id", "?"), c.get("evidence", [])) for c in cases]
        else:
            groups = [(os.path.basename(a.csv), load_clue_csv(a.csv))]
        all_rows = []
        for cid, clues in groups:
            scored = rank_clues(clues)
            print(f"== {cid} ==")
            print(format_table(scored))
            all_rows.extend(s.as_row() for s in scored)
    except ScoringError as exc:
        print(f"invalid clue: {exc}", file=sys.stderr)
        return 1
    if a.out:
        write_rows(all_rows, a.out)
        print(f"wrote {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
