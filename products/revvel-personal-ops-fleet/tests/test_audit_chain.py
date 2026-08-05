from __future__ import annotations

import json

from revvel_ops.audit import GENESIS_HASH, AuditLog, redact, verify_chain


def test_chain_links_and_verifies(tmp_path):
    log = AuditLog(tmp_path, "run_a")
    assert log.head_hash == GENESIS_HASH
    e1 = log.append("a.started", {"k": 1})
    e2 = log.append("a.finished", {"k": 2})
    assert e2.prev_hash == e1.event_hash
    report = verify_chain(log.path)
    assert report["ok"] is True and report["events"] == 2


def test_append_only_resume_preserves_chain(tmp_path):
    AuditLog(tmp_path, "run_b").append("first", {})
    reopened = AuditLog(tmp_path, "run_b")
    assert reopened.count == 1
    reopened.append("second", {})
    assert verify_chain(reopened.path)["ok"] is True
    assert len(reopened.path.read_text().strip().splitlines()) == 2


def test_tampering_is_detected(tmp_path):
    log = AuditLog(tmp_path, "run_c")
    log.append("x", {"value": 1})
    log.append("y", {"value": 2})
    lines = log.path.read_text().splitlines()
    rec = json.loads(lines[0])
    rec["payload"]["value"] = 999
    lines[0] = json.dumps(rec)
    log.path.write_text("\n".join(lines) + "\n")
    report = verify_chain(log.path)
    assert report["ok"] is False
    assert any("payload_hash mismatch" in e for e in report["errors"])


def test_redaction_removes_content_and_secrets():
    out = redact({"subject": "ok", "body": "private text", "token": "abc", "nested": {"content": "x"}})
    assert out["subject"] == "ok"
    assert out["body"].startswith("redacted:sha256:")
    assert out["token"].startswith("redacted:sha256:")
    assert out["nested"]["content"].startswith("redacted:sha256:")
