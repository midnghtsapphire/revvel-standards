#!/usr/bin/env python3
"""
Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine
---------------------------------------------------------------
Cross-examines unindexed historical archive records (from Stage 0 ingestion)
against verified official police search logs, cleared sectors, and established
case facts before any spatial or predictive pipeline execution.

Ground truth is case-specific. The gate only judges records against the
ground truth it is given (--ground-truth FILE, or --use-shaffer-default for an
archive that holds only Brian Shaffer / Columbus 2006 records). With none, it
abstains: records stay 'unverified' with a reason saying why, so they can be
judged later against the right case.

A keyword only counts as a claim when its clause is affirmative. Mentions in
negated or search-report clauses ("searched the dirt pile and found
nothing") are kept as speculative rather than debunked or corroborated.
"""

import sqlite3
import json
import argparse
import logging
import re
# from typing import Dict, List, Any, Tuple  # original; List was unused
from typing import Dict, Any, Tuple
from datetime import datetime

# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Default Verified Official Search Logs & Cleared Sectors (Brian Shaffer - Columbus PD 2006)
DEFAULT_VERIFIED_GROUND_TRUTH = {
    "case_id": "SHAFFER-2006-OH",
    "cleared_sectors": [
        {
            "sector_id": "GATEWAY_CONSTRUCTION_DIRT_PILES",
            "description": "Dirt piles & graded construction zone behind South Campus Gateway",
            "cleared_date": "2006-04-05",
            "cleared_by": "Columbus Police Department / Det. John Hurst / Don Corbett",
            "methods": ["K-9 Cadaver Sweeps", "Physical Removal of Covers", "Ground Search"],
            "keywords": ["dirt pile", "open pit", "unfinished pit", "construction dirt", "buried in dirt"],
        },
        {
            "sector_id": "PEARL_ALLEY_MUNICIPAL_SEWERS",
            "description": "Pearl Alley sub-surface storm sewer lines & drainage conduits",
            "cleared_date": "2006-04-10",
            "cleared_by": "Columbus PD / City Utility Crews",
            "methods": ["Sewer Line Scope", "Physical Inspection", "Municipal Conduit Check"],
            "keywords": ["storm sewer", "drainage pipe", "sewer line", "inside sewer", "washed into sewer"],
        },
        {
            "sector_id": "UGLY_TUNA_SALOONA_INTERIOR",
            "description": "Ugly Tuna Saloona bar interior, storage, trash chutes, service rooms",
            "cleared_date": "2006-04-02",
            "cleared_by": "Columbus PD / Bar Management",
            "methods": ["100% Room-by-Room Search", "CCTV Review", "K-9 Sweeps"],
            "keywords": ["hidden room", "bar basement", "trash chute", "cooler", "behind the bar"],
        },
    ],
    "verified_unmonitored_gaps": [
        {
            "gap_id": "SERVICE_HALLWAY_CONSTRUCTION_EXIT",
            "description": "Unmonitored service exit leading to rear construction area without direct camera coverage",
            "status": "UNMONITORED_EGRESS_ROUTE",
            # Phrases that name this gap. The original check hard-coded "service door",
            # "construction exit" and "blind spot" for every gap, whatever the gap was.
            "keywords": ["service door", "service exit", "service hallway", "construction exit"],
        }
    ],
}

ABSTAIN_REASON = (
    "No case-specific ground truth supplied; not judged. Run the gate with the ground truth for this "
    "record's case (--ground-truth FILE, or --use-shaffer-default for a Shaffer-only archive)."
)
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
            conn.commit()

    def validate_records(self) -> Dict[str, Any]:
        """
        Cross-references all 'unverified' records in stage0_historical_records against
        official cleared search sectors.
        """
        # stats = {"processed": 0, "debunked": 0, "corroborated": 0, "flagged_speculative": 0, "details": []}
        stats = {"processed": 0, "debunked": 0, "corroborated": 0, "flagged_speculative": 0, "abstained": 0,
                 "details": []}

        with self._get_connection() as conn:
            cursor = conn.cursor()
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
                    status, reason = self._examine_content(content)

                if status == "debunked_by_official_log":
                    stats["debunked"] += 1
                elif status == "corroborated_by_log":
                    stats["corroborated"] += 1
                elif status == "unverified":
                    stats["abstained"] += 1
                else:
                    stats["flagged_speculative"] += 1

                now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                cursor.execute(
                    """
                    UPDATE stage0_historical_records
                    SET verification_status = ?,
                        validation_reason = ?,
                        validated_at = ?
                    WHERE record_id = ?
                """,
                    (status, reason, now_iso, rec_id),
                )

                stats["details"].append(
                    {
                        "record_id": rec_id,
                        "source_identifier": record["source_identifier"],
                        "assigned_status": status,
                        "reason": reason,
                    }
                )

            conn.commit()

        logging.info(
            f"Stage 2 Validation Complete: {stats['processed']} records evaluated. ({stats['debunked']} debunked, {stats['flagged_speculative']} speculative, {stats['corroborated']} corroborated, {stats['abstained']} not judged: no ground truth)"  # noqa: E501
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

    def _examine_content(self, content: str) -> Tuple[str, str]:
        """Evaluates content against cleared search sectors and verified facts."""
        ambiguous = []
        # 1. Check against cleared sectors
        # Original: any mention of a keyword counted as a claim, so "searched the dirt
        # pile and found nothing" was stored as debunked.
        # for sector in self.ground_truth.get("cleared_sectors", []):
        #     for kw in sector["keywords"]:
        #         if kw in content:
        for sector in self.ground_truth.get("cleared_sectors", []):
            kw, seen = self._find_claim(content, sector["keywords"])
            if seen and not kw:
                ambiguous.append(seen)
            if kw:
                reason = f"Claims location/method ({kw}) in cleared sector '{sector['sector_id']}', physically inspected and cleared by {sector['cleared_by']} on {sector['cleared_date']}."  # noqa: E501
                return "debunked_by_official_log", reason

        # 2. Check if it references verified gaps without contradicting cleared areas
        # Original: the same three global phrases for every gap, whatever the gap.
        # for gap in self.ground_truth.get("verified_unmonitored_gaps", []):
        #     if "service door" in content or "construction exit" in content or "blind spot" in content:
        for gap in self.ground_truth.get("verified_unmonitored_gaps", []):
            kw, seen = self._find_claim(content, gap.get("keywords", []))
            if seen and not kw:
                ambiguous.append(seen)
            if kw:
                reason = f"References verified unmonitored egress route ({gap['gap_id']}) without contradicting cleared search perimeters."  # noqa: E501
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

            cursor.execute(
                "SELECT record_id, source_origin, source_identifier, author_handle, verification_status, validation_reason, validated_at FROM stage0_historical_records WHERE validation_reason IS NOT NULL"  # noqa: E501
            )
            validated_records = [dict(row) for row in cursor.fetchall()]

            report = {
                "audit_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
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


def load_ground_truth(args):
    if args.ground_truth and args.use_shaffer_default:
        raise SystemExit("use --ground-truth or --use-shaffer-default, not both")
    if args.ground_truth:
        with open(args.ground_truth, encoding="utf-8") as f:
            return json.load(f)
    if args.use_shaffer_default:
        return DEFAULT_VERIFIED_GROUND_TRUTH
    logging.warning("No ground truth given: records are left unverified (see --help).")
    return None


def main():
    parser = argparse.ArgumentParser(description="Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine")
    parser.add_argument("--db", required=True, help="Path to Stage 0 SQLite database")
    parser.add_argument("--run-validation", action="store_true", help="Execute validation pass on unverified records")
    parser.add_argument("--export-report", help="Export audit report to specified JSON file")
    parser.add_argument("--ground-truth", help="JSON file with the case's cleared_sectors / verified_unmonitored_gaps")
    parser.add_argument("--use-shaffer-default", action="store_true",
                        help="judge every unverified record against the built-in Shaffer (Columbus 2006) logs; "
                             "only for an archive holding that case alone")
    args = parser.parse_args()

    # gate = Stage2ValidationGate(db_path=args.db)
    gate = Stage2ValidationGate(db_path=args.db, ground_truth_data=load_ground_truth(args))

    if args.run_validation:
        gate.validate_records()

    if args.export_report:
        gate.export_audit_report(args.export_report)


if __name__ == "__main__":
    main()
