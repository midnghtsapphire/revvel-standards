#!/usr/bin/env python3
"""
Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine
---------------------------------------------------------------
Cross-examines unindexed historical archive records (from Stage 0 ingestion)
against verified official police search logs, cleared sectors, and established
case facts before any spatial or predictive pipeline execution.
"""

import sqlite3
import json
import argparse
import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

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
            "keywords": ["dirt pile", "open pit", "unfinished pit", "construction dirt", "buried in dirt"]
        },
        {
            "sector_id": "PEARL_ALLEY_MUNICIPAL_SEWERS",
            "description": "Pearl Alley sub-surface storm sewer lines & drainage conduits",
            "cleared_date": "2006-04-10",
            "cleared_by": "Columbus PD / City Utility Crews",
            "methods": ["Sewer Line Scope", "Physical Inspection", "Municipal Conduit Check"],
            "keywords": ["storm sewer", "drainage pipe", "sewer line", "inside sewer", "washed into sewer"]
        },
        {
            "sector_id": "UGLY_TUNA_SALOONA_INTERIOR",
            "description": "Ugly Tuna Saloona bar interior, storage, trash chutes, service rooms",
            "cleared_date": "2006-04-02",
            "cleared_by": "Columbus PD / Bar Management",
            "methods": ["100% Room-by-Room Search", "CCTV Review", "K-9 Sweeps"],
            "keywords": ["hidden room", "bar basement", "trash chute", "cooler", "behind the bar"]
        }
    ],
    "verified_unmonitored_gaps": [
        {
            "gap_id": "SERVICE_HALLWAY_CONSTRUCTION_EXIT",
            "description": "Unmonitored service exit leading to rear construction area without direct camera coverage",
            "status": "UNMONITORED_EGRESS_ROUTE"
        }
    ]
}

class Stage2ValidationGate:
    def __init__(self, db_path: str, ground_truth_data: Dict[str, Any] = None):
        self.db_path = db_path
        self.ground_truth = ground_truth_data or DEFAULT_VERIFIED_GROUND_TRUTH
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
            columns = [column['name'] for column in cursor.fetchall()]
            if 'validation_reason' not in columns:
                cursor.execute("ALTER TABLE stage0_historical_records ADD COLUMN validation_reason TEXT")
            if 'validated_at' not in columns:
                cursor.execute("ALTER TABLE stage0_historical_records ADD COLUMN validated_at TEXT")
            conn.commit()

    def validate_records(self) -> Dict[str, Any]:
        """
        Cross-references all 'unverified' records in stage0_historical_records against
        official cleared search sectors.
        """
        stats = {
            "processed": 0,
            "debunked": 0,
            "corroborated": 0,
            "flagged_speculative": 0,
            "details": []
        }

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM stage0_historical_records WHERE verification_status = 'unverified'")
            records = cursor.fetchall()

            for record in records:
                stats["processed"] += 1
                rec_id = record["record_id"]
                content = record["raw_content"].lower()
                status, reason = self._examine_content(content)

                if status == "debunked_by_official_log":
                    stats["debunked"] += 1
                elif status == "corroborated_by_log":
                    stats["corroborated"] += 1
                else:
                    stats["flagged_speculative"] += 1

                now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                cursor.execute("""
                    UPDATE stage0_historical_records
                    SET verification_status = ?,
                        validation_reason = ?,
                        validated_at = ?
                    WHERE record_id = ?
                """, (status, reason, now_iso, rec_id))

                stats["details"].append({
                    "record_id": rec_id,
                    "source_identifier": record["source_identifier"],
                    "assigned_status": status,
                    "reason": reason
                })

            conn.commit()

        logging.info(f"Stage 2 Validation Complete: {stats['processed']} records evaluated. ({stats['debunked']} debunked, {stats['flagged_speculative']} speculative, {stats['corroborated']} corroborated)")
        return stats

    def _examine_content(self, content: str) -> Tuple[str, str]:
        """Evaluates content against cleared search sectors and verified facts."""
        # 1. Check against cleared sectors
        for sector in self.ground_truth.get("cleared_sectors", []):
            for kw in sector["keywords"]:
                if kw in content:
                    reason = f"Claims location/method ({kw}) in cleared sector '{sector['sector_id']}', physically inspected and cleared by {sector['cleared_by']} on {sector['cleared_date']}."
                    return "debunked_by_official_log", reason

        # 2. Check if it references verified gaps without contradicting cleared areas
        for gap in self.ground_truth.get("verified_unmonitored_gaps", []):
            if "service door" in content or "construction exit" in content or "blind spot" in content:
                reason = f"References verified unmonitored egress route ({gap['gap_id']}) without contradicting cleared search perimeters."
                return "corroborated_by_log", reason

        # 3. Default for unverified historical claims
        return "flagged_speculative", "Contains speculative or unverified historical claims not directly contradicted or corroborated by official search logs."

    def export_audit_report(self, output_file: str):
        """Exports a full Stage 2 Validation Audit Report in JSON format."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT verification_status, count(*) as count FROM stage0_historical_records GROUP BY verification_status")
            status_counts = {row["verification_status"]: row["count"] for row in cursor.fetchall()}

            cursor.execute("SELECT record_id, source_origin, source_identifier, author_handle, verification_status, validation_reason, validated_at FROM stage0_historical_records WHERE validation_reason IS NOT NULL")
            validated_records = [dict(row) for row in cursor.fetchall()]

            report = {
                "audit_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "ground_truth_case_id": self.ground_truth.get("case_id"),
                "status_breakdown": status_counts,
                "validated_records_count": len(validated_records),
                "records": validated_records
            }

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2)

            logging.info(f"Audit report saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Stage 2 Validation Gate: Ground-Truth Cross-Examination Engine")
    parser.add_argument("--db", required=True, help="Path to Stage 0 SQLite database")
    parser.add_argument("--run-validation", action="store_true", help="Execute validation pass on unverified records")
    parser.add_argument("--export-report", help="Export audit report to specified JSON file")
    args = parser.parse_args()

    gate = Stage2ValidationGate(db_path=args.db)

    if args.run_validation:
        gate.validate_records()

    if args.export_report:
        gate.export_audit_report(args.export_report)

if __name__ == "__main__":
    main()
