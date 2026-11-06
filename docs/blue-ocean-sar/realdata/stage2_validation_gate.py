#!/usr/bin/env python3
"""
Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine
---------------------------------------------------------------
Cross-examines unindexed historical archive records (from Stage 0 ingestion)
against verified official police search logs, cleared sectors, and established
case facts before any spatial or predictive pipeline execution.

Ground truth is case-specific. The gate only judges records against the
ground truth it is given (--ground-truth FILE). With none, it abstains:
records stay 'unverified' with a reason saying why, so they can be judged
later against the right case.

Changes for SYSTEM_REVIEW C4 / M5 (2026-10-16):

* The built-in "verified" Shaffer ground truth is gone (it named real people
  and cited no document). ``DEFAULT_VERIFIED_GROUND_TRUTH`` is now ``None`` and
  ``--use-shaffer-default`` exits 2. Every cleared sector and every verified
  gap in a ground-truth file must carry a ``source`` that names the document
  it comes from (see GROUND-TRUTH FILE below); a file without one is refused.
* The gate never says a tip is debunked. A keyword match against a cleared
  sector is ``mentions_cleared_sector_needs_review``, with the sector, its
  clearance date and its source, for a person to read against the log.
* A clearance date is a time bound. A search on date D says nothing about
  what happened after D. A record that refers to a date after D, or to the
  place being moved, filled, regraded or otherwise changed after the search,
  is ``mentions_cleared_sector_outside_clearance_window``: the clearance does
  not cover it.
* ``--recheck`` (``validate_records(recheck=True)``) re-examines records
  already given a status, e.g. ones an earlier version marked
  ``debunked_by_official_log``.
* Timestamps are timezone-aware UTC (M5).

Statuses. The stage-0 table's ``verification_status`` CHECK constraint
(archive_collector_cli.py) only allows unverified, corroborated_by_log,
debunked_by_official_log and flagged_speculative, so the gate writes the full
status to a ``gate_status`` column and maps it to an allowed value:

    gate_status                                      verification_status
    unverified (no ground truth: abstained)          unverified
    corroborated_by_log                              corroborated_by_log
    mentions_cleared_sector_needs_review             flagged_speculative
    mentions_cleared_sector_outside_clearance_window flagged_speculative
    flagged_speculative                              flagged_speculative

``debunked_by_official_log`` is never written. ``validate_records`` still
returns a ``debunked`` count for callers that read it; it is always 0.

A keyword only counts as a claim when its clause is affirmative. Mentions in
negated or search-report clauses ("searched the dirt pile and found
nothing") are kept as speculative rather than sent for review or corroborated.

GROUND-TRUTH FILE (JSON)::

    {
      "case_id": "CASE-ID",
      "cleared_sectors": [
        {"sector_id": "S1", "description": "...", "cleared_date": "YYYY-MM-DD",
         "cleared_by": "agency / unit as written in the source",
         "methods": ["..."], "keywords": ["phrase", "..."],
         "source": {"document": "report title or file name", "reference": "page / para / URL"}}
      ],
      "verified_unmonitored_gaps": [
        {"gap_id": "G1", "keywords": ["..."], "source": {"document": "...", "reference": "..."}}
      ]
    }

``source`` may also be a non-empty string naming the document.
"""

import sqlite3
import json
import argparse
import logging
import re
import sys
# from typing import Dict, List, Any, Tuple  # original; List was unused
from typing import Dict, Any, Tuple
# from datetime import datetime  # SYSTEM_REVIEW M5: utcnow() is naive; use timezone-aware UTC
from datetime import date, datetime, timezone

# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# SYSTEM_REVIEW C4: the "verified" Shaffer facts below came from AI-generated (NotebookLM / chatbot) output
# with no source document, and they named real people. Lesson: a fact is only "verified" when it cites the
# document it came from, so ground truth now comes only from a file that sources every sector and gap.
# The name is kept, as None, because realtime_validation_listener.py imports it.
# # Default Verified Official Search Logs & Cleared Sectors (Brian Shaffer - Columbus PD 2006)
# DEFAULT_VERIFIED_GROUND_TRUTH = {
#     "case_id": "SHAFFER-2006-OH",
#     "cleared_sectors": [
#         {
#             "sector_id": "GATEWAY_CONSTRUCTION_DIRT_PILES",
#             "description": "Dirt piles & graded construction zone behind South Campus Gateway",
#             "cleared_date": "2006-04-05",
#             "cleared_by": "Columbus Police Department / Det. John Hurst / Don Corbett",
#             "methods": ["K-9 Cadaver Sweeps", "Physical Removal of Covers", "Ground Search"],
#             "keywords": ["dirt pile", "open pit", "unfinished pit", "construction dirt", "buried in dirt"],
#         },
#         {
#             "sector_id": "PEARL_ALLEY_MUNICIPAL_SEWERS",
#             "description": "Pearl Alley sub-surface storm sewer lines & drainage conduits",
#             "cleared_date": "2006-04-10",
#             "cleared_by": "Columbus PD / City Utility Crews",
#             "methods": ["Sewer Line Scope", "Physical Inspection", "Municipal Conduit Check"],
#             "keywords": ["storm sewer", "drainage pipe", "sewer line", "inside sewer", "washed into sewer"],
#         },
#         {
#             "sector_id": "UGLY_TUNA_SALOONA_INTERIOR",
#             "description": "Ugly Tuna Saloona bar interior, storage, trash chutes, service rooms",
#             "cleared_date": "2006-04-02",
#             "cleared_by": "Columbus PD / Bar Management",
#             "methods": ["100% Room-by-Room Search", "CCTV Review", "K-9 Sweeps"],
#             "keywords": ["hidden room", "bar basement", "trash chute", "cooler", "behind the bar"],
#         },
#     ],
#     "verified_unmonitored_gaps": [
#         {
#             "gap_id": "SERVICE_HALLWAY_CONSTRUCTION_EXIT",
#             "description": "Unmonitored service exit leading to rear construction area without direct camera coverage",  # noqa: E501
#             "status": "UNMONITORED_EGRESS_ROUTE",
#             # Phrases that name this gap. The original check hard-coded "service door",
#             # "construction exit" and "blind spot" for every gap, whatever the gap was.
#             "keywords": ["service door", "service exit", "service hallway", "construction exit"],
#         }
#     ],
# }
DEFAULT_VERIFIED_GROUND_TRUTH = None

# ABSTAIN_REASON = (
#     "No case-specific ground truth supplied; not judged. Run the gate with the ground truth for this "
#     "record's case (--ground-truth FILE, or --use-shaffer-default for a Shaffer-only archive)."
# )  # SYSTEM_REVIEW C4: the Shaffer default is gone
ABSTAIN_REASON = (
    "No case-specific ground truth supplied; not judged. Run the gate with the ground truth for this "
    "record's case (--ground-truth FILE, with a source document for every cleared sector and gap)."
)
SHAFFER_DEFAULT_REMOVED = (
    "--use-shaffer-default was removed (SYSTEM_REVIEW C4): the built-in ground truth named real people and cited "
    "no source. Give --ground-truth FILE with a source document for every cleared sector and gap."
)

STATUS_NEEDS_REVIEW = "mentions_cleared_sector_needs_review"
STATUS_OUTSIDE_WINDOW = "mentions_cleared_sector_outside_clearance_window"
# Gate status -> value allowed by the stage-0 verification_status CHECK constraint.
DB_STATUS = {
    "unverified": "unverified",
    "corroborated_by_log": "corroborated_by_log",
    STATUS_NEEDS_REVIEW: "flagged_speculative",
    STATUS_OUTSIDE_WINDOW: "flagged_speculative",
    "flagged_speculative": "flagged_speculative",
}

# Words that say the place changed after it was searched. A clearance on date D
# says nothing about these. Deliberately broad: a false hit only moves a record
# from "needs review" to "not covered by the clearance", and both go to a person.
AFTER_CLEARANCE_RE = re.compile(
    r"\b(?:moved|relocated|re-?buried|dug (?:up|out)|hauled|trucked|filled in|back-?filled|re-?graded|graded over|"
    r"paved(?: over)?|poured|covered over|brought in|removed|replaced|later|afterwards?|since then|"
    r"after (?:the |that |they |police |cops |officers )?(?:search(?:ed)?|sweep|clearance|cleared|police|cops|"
    r"dogs?|k-?9))\b"
)
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november",
     "december"], 1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
MONTHS["sept"] = 9
_MON = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|" \
       r"oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?"
ISO_DATE_RE = re.compile(r"\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b")
US_DATE_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})/((?:19|20)\d{2})\b")
MDY_RE = re.compile(r"\b" + _MON + r"\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2})\b")
DMY_RE = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?" + _MON + r",?\s+((?:19|20)\d{2})\b")
MY_RE = re.compile(r"\b" + _MON + r",?\s+((?:19|20)\d{2})\b")
YEAR_RE = re.compile(r"\b((?:19|20)\d{2})\b")


def _source_ok(src) -> bool:
    if isinstance(src, str):
        return bool(src.strip())
    return isinstance(src, dict) and isinstance(src.get("document"), str) and bool(src["document"].strip())


def validate_ground_truth(gt) -> None:
    """Raise ValueError unless ``gt`` is a ground-truth object in which every
    cleared sector has an ISO cleared_date and every sector and gap has a
    source document (SYSTEM_REVIEW C4)."""
    if not isinstance(gt, dict):
        raise ValueError(f"ground truth must be a JSON object, not {type(gt).__name__}")
    for key, id_field in (("cleared_sectors", "sector_id"), ("verified_unmonitored_gaps", "gap_id")):
        items = gt.get(key, [])
        if not isinstance(items, list):
            raise ValueError(f"ground truth {key!r} must be a list")
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"ground truth {key}[{i}] must be an object")
            label = f"{key}[{i}] ({item.get(id_field, '?')})"
            needed = (id_field, "cleared_date", "cleared_by", "keywords") if key == "cleared_sectors" \
                else (id_field, "keywords")
            missing = [f for f in needed if f not in item]
            if missing:
                raise ValueError(f"ground truth {label} is missing {missing}")
            kws = item["keywords"]
            if not isinstance(kws, list) or not all(isinstance(k, str) and k.strip() for k in kws):
                raise ValueError(f"ground truth {label} keywords must be a list of non-empty strings")
            if not _source_ok(item.get("source")):
                raise ValueError(f"ground truth {label} has no source: give \"source\": {{\"document\": ..., "
                                 "\"reference\": ...}} naming the document this entry comes from")
            if key == "cleared_sectors":
                try:
                    date.fromisoformat(str(item["cleared_date"]))
                except ValueError:
                    raise ValueError(f"ground truth {label} cleared_date must be YYYY-MM-DD, "
                                     f"got {item['cleared_date']!r}") from None


def _source_text(src) -> str:
    if isinstance(src, str):
        return src
    ref = src.get("reference")
    return f"{src['document']}" + (f", {ref}" if ref else "")


def _safe_date(y, m, d):
    try:
        return date(int(y), int(m), int(d))
    except ValueError:
        return None


def dates_after(content: str, cleared: date):
    """Dates (as written) in ``content`` that fall after ``cleared``. Month-only
    and year-only mentions count when the whole month or year is after it."""
    found = []
    spans = []
    for rx, conv in (
        (ISO_DATE_RE, lambda g: _safe_date(g[0], g[1], g[2])),
        (US_DATE_RE, lambda g: _safe_date(g[2], g[0], g[1])),
        (MDY_RE, lambda g: _safe_date(g[2], MONTHS[g[0][:3]], g[1])),
        (DMY_RE, lambda g: _safe_date(g[2], MONTHS[g[1][:3]], g[0])),
    ):
        for m in rx.finditer(content):
            spans.append(m.span())
            d = conv(m.groups())
            if d is not None and d > cleared:
                found.append(m.group(0))

    def free(m):
        return not any(a <= m.start() < b for a, b in spans)

    for m in MY_RE.finditer(content):
        if free(m):
            spans.append(m.span())
            if (int(m.group(2)), MONTHS[m.group(1)[:3]]) > (cleared.year, cleared.month):
                found.append(m.group(0))
    for m in YEAR_RE.finditer(content):
        if free(m) and int(m.group(1)) > cleared.year:
            found.append(m.group(0))
    return found


# A keyword in a sentence with one of these is not an affirmative claim about the place.
NEGATION_RE = re.compile(r"\b(no|not|never|nothing|none|nobody|neither|nor|cannot|ruled out|searched|cleared)\b|n't\b")
SENTENCE_RE = re.compile(r"[.!?;\n]+")
# Negation is judged per clause, so a cue in a contrasting clause ("the police
# searched the bar but he is in the dirt pile") does not cancel a claim. Only
# contrastive words split: a comma alone ("he was not, they say, in the dirt
# pile") keeps the cue in scope.
CLAUSE_RE = re.compile(r"\b(?:but|although|though|whereas)\b")
# Phrases that contain a cue word but describe distance or amount, not a denial.
NOT_A_NEGATION_RE = re.compile(
    r"\bnot (?:too |so |very )?far (?:away )?from\b|\bno (?:more|further|farther) than\b|\bnot long (?:after|before)\b"
)


class Stage2ValidationGate:
    def __init__(self, db_path: str, ground_truth_data: Dict[str, Any] = None):
        self.db_path = db_path
        # Original: every gate fell back to the Shaffer logs, so records from any
        # other case were judged against Columbus 2006 search sectors.
        # self.ground_truth = ground_truth_data or DEFAULT_VERIFIED_GROUND_TRUTH
        # SYSTEM_REVIEW C4: ground truth must name a source for every sector and gap.
        if ground_truth_data is not None:
            validate_ground_truth(ground_truth_data)
        self.ground_truth = ground_truth_data
        self._init_validation_table()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_validation_table(self):
        """Ensures Stage 0 DB has necessary validation logging columns."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(stage0_historical_records)")
            columns = [column["name"] for column in cursor.fetchall()]
            if "validation_reason" not in columns:
                cursor.execute("ALTER TABLE stage0_historical_records ADD COLUMN validation_reason TEXT")
            if "validated_at" not in columns:
                cursor.execute("ALTER TABLE stage0_historical_records ADD COLUMN validated_at TEXT")
            # SYSTEM_REVIEW C4: the full gate status; verification_status's CHECK constraint cannot hold it.
            if "gate_status" not in columns:
                cursor.execute("ALTER TABLE stage0_historical_records ADD COLUMN gate_status TEXT")
            conn.commit()

    # def validate_records(self) -> Dict[str, Any]:  # SYSTEM_REVIEW C4: add recheck
    def validate_records(self, recheck: bool = False) -> Dict[str, Any]:
        """
        Cross-references all 'unverified' records in stage0_historical_records against
        official cleared search sectors. With ``recheck=True``, every record is
        examined again, including ones an earlier run already gave a status.
        A recheck needs ground truth: without it every judged record would be
        reset to 'unverified', so it raises ValueError instead.
        """
        if recheck and self.ground_truth is None:
            raise ValueError("--recheck needs --ground-truth: without it every judged record would be reset")
        # stats = {"processed": 0, "debunked": 0, "corroborated": 0, "flagged_speculative": 0, "details": []}
        # stats = {"processed": 0, "debunked": 0, "corroborated": 0, "flagged_speculative": 0, "abstained": 0,
        #          "details": []}  # SYSTEM_REVIEW C4: review counts added; "debunked" stays 0 for old callers
        stats = {"processed": 0, "debunked": 0, "corroborated": 0, "flagged_speculative": 0, "abstained": 0,
                 "needs_review": 0, "outside_clearance_window": 0, "recheck": bool(recheck), "details": []}

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # cursor.execute("SELECT * FROM stage0_historical_records WHERE verification_status = 'unverified'")
            # SYSTEM_REVIEW C4: --recheck re-examines records an earlier run already judged.
            if recheck:
                cursor.execute("SELECT * FROM stage0_historical_records")
            else:
                cursor.execute("SELECT * FROM stage0_historical_records WHERE verification_status = 'unverified'")
            records = cursor.fetchall()

            for record in records:
                stats["processed"] += 1
                rec_id = record["record_id"]
                content = record["raw_content"].lower()
                # status, reason = self._examine_content(content)
                if self.ground_truth is None:
                    status, reason = "unverified", ABSTAIN_REASON
                else:
                    # status, reason = self._examine_content(content)  # SYSTEM_REVIEW C4: time bound needs date
                    status, reason = self._examine_content(content, record["archive_timestamp"])

                # if status == "debunked_by_official_log":  # SYSTEM_REVIEW C4: never emitted now
                if status == "debunked_by_official_log":
                    stats["debunked"] += 1
                elif status == STATUS_NEEDS_REVIEW:
                    stats["needs_review"] += 1
                elif status == STATUS_OUTSIDE_WINDOW:
                    stats["outside_clearance_window"] += 1
                elif status == "corroborated_by_log":
                    stats["corroborated"] += 1
                elif status == "unverified":
                    stats["abstained"] += 1
                else:
                    stats["flagged_speculative"] += 1

                # SYSTEM_REVIEW M5: utcnow() returns a naive datetime (no zone attached) and is deprecated in 3.12;
                # evidence timestamps should carry their zone explicitly.
                # now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                # SYSTEM_REVIEW C4: gate_status holds the full status; verification_status a CHECK-allowed one.
                # cursor.execute(
                #     """
                #     UPDATE stage0_historical_records
                #     SET verification_status = ?,
                #         validation_reason = ?,
                #         validated_at = ?
                #     WHERE record_id = ?
                # """,
                #     (status, reason, now_iso, rec_id),
                # )
                cursor.execute(
                    """
                    UPDATE stage0_historical_records
                    SET verification_status = ?,
                        gate_status = ?,
                        validation_reason = ?,
                        validated_at = ?
                    WHERE record_id = ?
                """,
                    (DB_STATUS[status], status, reason, now_iso, rec_id),
                )

                stats["details"].append(
                    {
                        "record_id": rec_id,
                        "source_identifier": record["source_identifier"],
                        "assigned_status": status,
                        "previous_status": record["verification_status"],
                        "reason": reason,
                    }
                )

            conn.commit()

        # logging.info(
        #     f"Stage 2 Validation Complete: {stats['processed']} records evaluated. ({stats['debunked']} debunked, {stats['flagged_speculative']} speculative, {stats['corroborated']} corroborated, {stats['abstained']} not judged: no ground truth)"  # noqa: E501
        # )  # SYSTEM_REVIEW C4: nothing is debunked any more
        logging.info(
            f"Stage 2 Validation Complete: {stats['processed']} records evaluated. ({stats['needs_review']} mention a cleared sector: needs review, {stats['outside_clearance_window']} outside a clearance window, {stats['flagged_speculative']} speculative, {stats['corroborated']} corroborated, {stats['abstained']} not judged: no ground truth)"  # noqa: E501
        )
        return stats

    @staticmethod
    def _find_claim(content: str, phrases) -> Tuple[str, str]:
        """(affirmative_phrase, mentioned_phrase): the first phrase used in a
        sentence with no negation/search-report cue, and the first phrase seen
        at all. Either may be None."""
        mentioned = None
        # Original: a cue anywhere in the sentence (even "not far from the dirt
        # pile") made every keyword in it a non-claim.
        # for sentence in SENTENCE_RE.split(content):
        #     for kw in phrases:
        #         if kw.lower() in sentence:
        #             if not NEGATION_RE.search(sentence):
        #                 return kw, kw
        #             mentioned = mentioned or kw
        for sentence in SENTENCE_RE.split(content):
            for clause in CLAUSE_RE.split(sentence):
                for kw in phrases:
                    if kw.lower() in clause:
                        if not NEGATION_RE.search(NOT_A_NEGATION_RE.sub(" ", clause)):
                            return kw, kw
                        mentioned = mentioned or kw
        return None, mentioned

    # def _examine_content(self, content: str) -> Tuple[str, str]:  # SYSTEM_REVIEW C4: archive time added
    def _examine_content(self, content: str, archive_timestamp: str = None) -> Tuple[str, str]:
        """Evaluates content against cleared search sectors and verified facts.

        A claim about a cleared sector is never "debunked": it is sent for review
        with the sector, clearance date and source, or, when it concerns events or
        change after the clearance date, marked as outside the clearance window."""
        ambiguous = []
        in_window, outside = [], []
        # 1. Check against cleared sectors
        # Original: any mention of a keyword counted as a claim, so "searched the dirt
        # pile and found nothing" was stored as debunked.
        # for sector in self.ground_truth.get("cleared_sectors", []):
        #     for kw in sector["keywords"]:
        #         if kw in content:
        # for sector in self.ground_truth.get("cleared_sectors", []):
        #     kw, seen = self._find_claim(content, sector["keywords"])
        #     if seen and not kw:
        #         ambiguous.append(seen)
        #     if kw:
        #         reason = f"Claims location/method ({kw}) in cleared sector '{sector['sector_id']}', physically inspected and cleared by {sector['cleared_by']} on {sector['cleared_date']}."  # noqa: E501
        #         return "debunked_by_official_log", reason
        # SYSTEM_REVIEW C4: keyword matching was presented as verification, and a tip about the dirt being moved
        # after the search was "debunked" by that search. Lesson: a phrase match only says "read this against the
        # log", and a clearance only speaks for the place up to its date.
        for sector in self.ground_truth.get("cleared_sectors", []):
            kw, seen = self._find_claim(content, sector["keywords"])
            if seen and not kw:
                ambiguous.append(seen)
            if not kw:
                continue
            cleared = date.fromisoformat(str(sector["cleared_date"]))
            later_dates = dates_after(content, cleared)
            change = sorted({m.group(0) for m in AFTER_CLEARANCE_RE.finditer(content)})
            head = (f"Mentions '{kw}' in cleared sector '{sector['sector_id']}' (cleared {sector['cleared_date']} "
                    f"by {sector['cleared_by']}; source: {_source_text(sector['source'])})")
            if later_dates or change:
                why = []
                if later_dates:
                    why.append(f"dates after the clearance: {', '.join(later_dates)}")
                if change:
                    why.append(f"words about change after the search: {', '.join(change)}")
                outside.append(f"{head}, but refers to {'; '.join(why)}. The {sector['cleared_date']} clearance "
                               "does not cover events or changes after that date.")
            else:
                note = ""
                if archive_timestamp and str(archive_timestamp)[:10] > str(sector["cleared_date"]):
                    note = (f" The record is dated {str(archive_timestamp)[:10]}, after the clearance: check "
                            "whether it describes the place as it was before the search.")
                in_window.append(f"{head}. Not debunked: compare with the search log.{note}")
        if in_window:
            return STATUS_NEEDS_REVIEW, " ".join(in_window + outside)
        if outside:
            return STATUS_OUTSIDE_WINDOW, " ".join(outside)

        # 2. Check if it references verified gaps without contradicting cleared areas
        # Original: the same three global phrases for every gap, whatever the gap.
        # for gap in self.ground_truth.get("verified_unmonitored_gaps", []):
        #     if "service door" in content or "construction exit" in content or "blind spot" in content:
        for gap in self.ground_truth.get("verified_unmonitored_gaps", []):
            kw, seen = self._find_claim(content, gap.get("keywords", []))
            if seen and not kw:
                ambiguous.append(seen)
            if kw:
                # reason = f"References verified unmonitored egress route ({gap['gap_id']}) without contradicting cleared search perimeters."  # noqa: E501
                # SYSTEM_REVIEW C4: name the gap's source document.
                reason = f"References verified unmonitored egress route ({gap['gap_id']}; source: {_source_text(gap['source'])}) without contradicting cleared search perimeters."  # noqa: E501
                return "corroborated_by_log", reason

        if ambiguous:
            return (
                "flagged_speculative",
                f"Mentions {', '.join(ambiguous)} only in a negated or search-report sentence; not read as a claim.",
            )
        # 3. Default for unverified historical claims
        return (
            "flagged_speculative",
            "Contains speculative or unverified historical claims not directly contradicted or corroborated by official search logs.",  # noqa: E501
        )

    def export_audit_report(self, output_file: str):
        """Exports a full Stage 2 Validation Audit Report in JSON format."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT verification_status, count(*) as count FROM stage0_historical_records GROUP BY verification_status"  # noqa: E501
            )
            status_counts = {row["verification_status"]: row["count"] for row in cursor.fetchall()}

            # cursor.execute(
            #     "SELECT record_id, source_origin, source_identifier, author_handle, verification_status, validation_reason, validated_at FROM stage0_historical_records WHERE validation_reason IS NOT NULL"  # noqa: E501
            # )  # SYSTEM_REVIEW C4: include gate_status
            cursor.execute(
                "SELECT record_id, source_origin, source_identifier, author_handle, verification_status, gate_status, validation_reason, validated_at FROM stage0_historical_records WHERE validation_reason IS NOT NULL"  # noqa: E501
            )
            validated_records = [dict(row) for row in cursor.fetchall()]

            report = {
                # "audit_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),  # SYSTEM_REVIEW M5
                "audit_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                # Original crashed with AttributeError when the gate had no ground truth:
                # "ground_truth_case_id": self.ground_truth.get("case_id"),
                "ground_truth_case_id": self.ground_truth.get("case_id") if self.ground_truth else None,
                "status_breakdown": status_counts,
                "validated_records_count": len(validated_records),
                "records": validated_records,
            }

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)

            logging.info(f"Audit report saved to {output_file}")


# def load_ground_truth(args):
#     if args.ground_truth and args.use_shaffer_default:
#         raise SystemExit("use --ground-truth or --use-shaffer-default, not both")
#     if args.ground_truth:
#         with open(args.ground_truth, encoding="utf-8") as f:
#             return json.load(f)
#     if args.use_shaffer_default:
#         return DEFAULT_VERIFIED_GROUND_TRUTH
#     logging.warning("No ground truth given: records are left unverified (see --help).")
#     return None
# SYSTEM_REVIEW C4: the Shaffer default is gone and a ground-truth file must source every entry.
def load_ground_truth(args):
    """Ground truth from --ground-truth FILE, validated, or None. Raises ValueError."""
    if args.use_shaffer_default:
        raise ValueError(SHAFFER_DEFAULT_REMOVED)
    if args.ground_truth is not None:
        try:
            with open(args.ground_truth, encoding="utf-8") as f:
                gt = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            raise ValueError(f"--ground-truth {args.ground_truth}: {e}") from None
        validate_ground_truth(gt)
        return gt
    logging.warning("No ground truth given: records are left unverified (see --help).")
    return None


# def main():  # SYSTEM_REVIEW C4: argv for tests, --recheck, exit 2 on bad input
def main(argv=None):
    parser = argparse.ArgumentParser(description="Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine")
    parser.add_argument("--db", required=True, help="Path to Stage 0 SQLite database")
    parser.add_argument("--run-validation", action="store_true", help="Execute validation pass on unverified records")
    parser.add_argument("--export-report", help="Export audit report to specified JSON file")
    parser.add_argument("--ground-truth", help="JSON file with the case's cleared_sectors / verified_unmonitored_gaps")
    # parser.add_argument("--use-shaffer-default", action="store_true",
    #                     help="judge every unverified record against the built-in Shaffer (Columbus 2006) logs; "
    #                          "only for an archive holding that case alone")
    parser.add_argument("--use-shaffer-default", action="store_true",
                        help="REMOVED (SYSTEM_REVIEW C4): exits 2; use --ground-truth FILE")
    parser.add_argument("--recheck", action="store_true",
                        help="re-examine every record, including ones an earlier run already judged")
    # args = parser.parse_args()
    args = parser.parse_args(argv)

    # gate = Stage2ValidationGate(db_path=args.db)
    # gate = Stage2ValidationGate(db_path=args.db, ground_truth_data=load_ground_truth(args))
    try:
        gate = Stage2ValidationGate(db_path=args.db, ground_truth_data=load_ground_truth(args))
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    if args.recheck and not args.run_validation:
        print("error: --recheck only applies with --run-validation", file=sys.stderr)
        return 2
    if args.run_validation:
        # gate.validate_records()
        try:
            gate.validate_records(recheck=args.recheck)
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 2

    if args.export_report:
        gate.export_audit_report(args.export_report)
    return 0


if __name__ == "__main__":
    # main()
    sys.exit(main())
