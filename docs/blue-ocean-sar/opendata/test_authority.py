"""Tests for authority.py: the authority ledger, the require() gate and the audit log.

Run from this folder:  python3 -m unittest test_authority -v
"""

import contextlib
import datetime as dt
import io
import json
import os
import shutil
import tempfile
import unittest

import authority as A

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 16, 12, 0, tzinfo=UTC)
CASE = "MP-2026-014"
SUBJECT = "Jane Q Example"
PURPOSE = "GLBA:6802(e)(8)"
DOC_SHA = "ab" * 32


def lp_fields(**kw):
    f = dict(process_type="warrant", reference="SW-2026-0193", issuer="Example County Court",
             issued="2026-10-01", expires="2026-10-31", scope="Subscriber records for the listed number",
             subjects=[SUBJECT, "+1 555 0100"], requesting_officer="Det. A. Example",
             agency="Example County Sheriff", document_sha256=DOC_SHA)
    f.update(kw)
    return f


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.ledger_path = os.path.join(self.tmp, "ledger.jsonl")
        self.audit_path = os.path.join(self.tmp, "audit.jsonl")
        self.now = NOW
        self.gate = A.Gate(self.ledger_path, self.audit_path, clock=lambda: self.now)
        self.ledger = self.gate.ledger

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def add_licensed(self, case=CASE, purposes=(PURPOSE,), **kw):
        return self.ledger.add(A.build_authority(A.LICENSED, case, purposes=purposes, **kw), now=NOW)

    def add_lp(self, case=CASE, **kw):
        return self.ledger.add(A.build_authority(A.LEGAL_PROCESS, case, **lp_fields(**kw)), now=NOW)

    def audit(self):
        return A.ChainLog(self.audit_path).entries()

    def assertRefused(self, *args, **kw):
        with self.assertRaises(A.AuthorityError) as cm:
            self.gate.require(*args, **kw)
        self.assertEqual(self.audit()[-1]["event"], "refuse")
        return str(cm.exception)


class TestPublic(Base):
    def test_public_always_passes_and_is_logged(self):
        res = self.gate.require(A.PUBLIC, "", None, "")
        self.assertEqual(res["source_class"], A.PUBLIC)
        e = self.audit()[-1]
        self.assertEqual((e["event"], e["source_class"], e["authority"]), ("allow", A.PUBLIC, None))

    def test_unknown_class_refused(self):
        self.assertRefused("SECRET", CASE, SUBJECT, PURPOSE)


class TestLicensed(Base):
    def test_refused_with_no_authority(self):
        msg = self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.assertIn("no LICENSED authority", msg)

    def test_refused_without_purpose_allowed_with(self):
        auth = self.add_licensed()
        self.assertRefused(A.LICENSED, CASE, SUBJECT, "")
        self.assertRefused(A.LICENSED, CASE, SUBJECT, "marketing")
        got = self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.assertEqual(got["id"], auth["id"])
        e = self.audit()[-1]
        self.assertEqual(e["event"], "allow")
        self.assertEqual(e["authority"]["authority_id"], auth["id"])
        self.assertEqual(e["purpose"], PURPOSE)

    def test_purpose_compare_ignores_case_and_spacing(self):
        self.add_licensed()
        self.gate.require(A.LICENSED, CASE, SUBJECT, "  glba:6802(E)(8) ")

    def test_wrong_case_refused(self):
        self.add_licensed()
        self.assertIn("for case", self.assertRefused(A.LICENSED, "MP-OTHER", SUBJECT, PURPOSE))

    def test_endpoint_allowed_purposes_enforced(self):
        self.add_licensed()
        self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE, allowed_purposes=["DPPA:2721(b)(1)"])
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE, allowed_purposes=[PURPOSE])

    def test_licensed_needs_purpose_to_record(self):
        with self.assertRaises(ValueError):
            A.build_authority(A.LICENSED, CASE)

    def test_optional_subject_list_is_enforced(self):
        self.add_licensed(subjects=[SUBJECT])
        self.assertRefused(A.LICENSED, CASE, "Somebody Else", PURPOSE)
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)

    def test_source_scope(self):
        self.add_licensed(sources=["example-vendor"])
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE, source_name="example-vendor:people_search")
        self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE, source_name="other-vendor:people_search")
        self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE, source_name="example-vendor-2:x")
        self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE)


class TestLegalProcess(Base):
    def test_allowed_when_in_scope(self):
        auth = self.add_lp()
        got = self.gate.require(A.LEGAL_PROCESS, CASE, "  jane   q EXAMPLE ", "locate missing person")
        self.assertEqual(got["id"], auth["id"])
        self.assertEqual(self.audit()[-1]["authority"]["reference"], "SW-2026-0193")

    def test_refused_when_expired(self):
        self.add_lp()
        self.now = dt.datetime(2026, 10, 31, 23, 59, 0, tzinfo=UTC)
        self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")  # last day still valid (UTC)
        self.now = dt.datetime(2026, 11, 1, 0, 0, 1, tzinfo=UTC)
        self.assertIn("expired", self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate"))

    def test_refused_before_issue(self):
        self.add_lp()
        self.now = dt.datetime(2026, 9, 30, tzinfo=UTC)
        self.assertIn("not yet valid", self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate"))

    def test_refused_when_revoked(self):
        auth = self.add_lp()
        self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")
        self.ledger.revoke(auth["id"], "warrant returned", "owner")
        self.assertIn("revoked", self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate"))
        with self.assertRaises(ValueError):
            self.ledger.revoke(auth["id"], "again")

    def test_out_of_scope_subject_refused_even_when_case_matches(self):
        self.add_lp()
        msg = self.assertRefused(A.LEGAL_PROCESS, CASE, "John Not Named", "locate")
        self.assertIn("not in the authority's scope", msg)

    def test_wrong_case_refused(self):
        self.add_lp()
        self.assertRefused(A.LEGAL_PROCESS, "MP-OTHER", SUBJECT, "locate")

    def test_licensed_authority_does_not_cover_legal_process(self):
        self.add_licensed(subjects=[SUBJECT])
        self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, PURPOSE)

    def test_one_valid_authority_among_several(self):
        old = self.add_lp(reference="SW-OLD", issued="2026-01-01", expires="2026-02-01")
        new = self.add_lp(reference="SW-NEW")
        self.assertNotEqual(old["id"], new["id"])
        self.assertEqual(self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")["id"], new["id"])

    def test_required_fields(self):
        for drop in ("process_type", "reference", "issuer", "issued", "expires", "scope",
                     "requesting_officer", "agency", "document_sha256"):
            with self.subTest(drop=drop), self.assertRaises(ValueError):
                A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(**{drop: None}))
        with self.assertRaises(ValueError):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(subjects=[]))
        with self.assertRaises(ValueError):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(document_sha256="nothex"))
        with self.assertRaises(ValueError):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(expires="2026-09-01"))
        with self.assertRaises(ValueError):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(expires="2026-10-31T10:00:00"))
        with self.assertRaises(ValueError):
            A.build_authority(A.PUBLIC, CASE)


class TestHashChains(Base):
    def _rewrite(self, path, fn):
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
        lines = fn(lines)
        with open(path, "w", encoding="utf-8") as f:
            f.write("".join(ln + "\n" for ln in lines))

    def test_clean_chains_verify(self):
        self.add_licensed()
        self.add_lp()
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        for p in (self.ledger_path, self.audit_path):
            v = A.ChainLog(p).verify()
            self.assertTrue(v["ok"], v["problems"])

    def test_ledger_edit_detected_and_gate_refuses(self):
        self.add_lp(expires="2026-10-10")
        self.add_licensed()

        def extend(lines):
            e = json.loads(lines[0])
            e["authority"]["expires"] = "2027-12-31T23:59:59Z"
            lines[0] = json.dumps(e)
            return lines
        self._rewrite(self.ledger_path, extend)
        v = A.ChainLog(self.ledger_path).verify()
        self.assertFalse(v["ok"])
        self.assertTrue(any("edited" in p for p in v["problems"]))
        msg = self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")
        self.assertIn("ledger", msg)

    def test_ledger_deletion_detected(self):
        a = self.add_lp()
        self.ledger.revoke(a["id"], "returned")
        self.add_licensed()
        self._rewrite(self.ledger_path, lambda lines: [lines[0], lines[2]])  # drop the revocation
        v = A.ChainLog(self.ledger_path).verify()
        self.assertFalse(v["ok"])
        self.assertTrue(any("deleted" in p for p in v["problems"]))

    def test_tail_truncation_needs_anchor(self):
        self.add_licensed()
        self.add_lp()
        v = A.ChainLog(self.ledger_path).verify()
        self._rewrite(self.ledger_path, lambda lines: lines[:1])
        self.assertTrue(A.ChainLog(self.ledger_path).verify()["ok"])  # a chain alone cannot see this
        self.assertFalse(A.ChainLog(self.ledger_path).verify(expect_head=v["head"])["ok"])
        self.assertFalse(A.ChainLog(self.ledger_path).verify(expect_count=v["count"])["ok"])

    def test_audit_edit_detected(self):
        with self.assertRaises(A.AuthorityError):
            self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.gate.require(A.PUBLIC, CASE, SUBJECT, "x")

        def flip(lines):
            e = json.loads(lines[0])
            e["event"] = "allow"
            lines[0] = json.dumps(e)
            return lines
        self._rewrite(self.audit_path, flip)
        self.assertFalse(A.ChainLog(self.audit_path).verify()["ok"])

    def test_audit_reorder_detected(self):
        for _ in range(3):
            self.gate.require(A.PUBLIC, CASE, SUBJECT, "x")
        self._rewrite(self.audit_path, lambda lines: [lines[1], lines[0], lines[2]])
        self.assertFalse(A.ChainLog(self.audit_path).verify()["ok"])

    def test_files_are_private(self):
        self.add_licensed()
        self.gate.require(A.PUBLIC, CASE, SUBJECT, "x")
        for p in (self.ledger_path, self.audit_path):
            self.assertEqual(os.stat(p).st_mode & 0o077, 0, p)


class TestAuditContent(Base):
    def test_subject_hashed_by_default(self):
        self.add_licensed()
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        with self.assertRaises(A.AuthorityError):
            self.gate.require(A.LICENSED, CASE, SUBJECT, "bad purpose")
        with open(self.audit_path, encoding="utf-8") as f:
            text = f.read()
        self.assertNotIn("Jane", text)
        self.assertNotIn("jane", text)
        e = self.audit()[0]
        self.assertEqual(e["subject_sha256"], A.sha256_bytes(b"jane q example"))
        for k in ("ts", "source_class", "case_id", "purpose", "authority", "reason"):
            self.assertIn(k, e)

    def test_salted_hash_and_plain_mode(self):
        self.add_licensed()
        salted = A.Gate(self.ledger_path, self.audit_path, salt="s3cret-salt", clock=lambda: NOW)
        salted.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        e = self.audit()[-1]
        self.assertIn("subject_hmac_sha256", e)
        self.assertNotEqual(e["subject_hmac_sha256"], A.sha256_bytes(b"jane q example"))
        plain = A.Gate(self.ledger_path, self.audit_path, subject_mode="plain", clock=lambda: NOW)
        plain.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.assertEqual(self.audit()[-1]["subject"], SUBJECT)
        with open(self.audit_path, encoding="utf-8") as f:
            self.assertNotIn("s3cret-salt", f.read())

    def test_fails_closed_when_audit_unwritable(self):
        self.add_licensed()
        os.makedirs(os.path.join(self.tmp, "auditdir"))
        g = A.Gate(self.ledger_path, os.path.join(self.tmp, "auditdir"), clock=lambda: NOW)
        with self.assertRaises(A.AuthorityError):
            g.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        with self.assertRaises(A.AuthorityError):
            g.require(A.PUBLIC, CASE, SUBJECT, PURPOSE)

    def test_module_level_require(self):
        self.add_licensed()
        got = A.require(A.LICENSED, CASE, SUBJECT, PURPOSE, ledger_path=self.ledger_path,
                        audit_path=self.audit_path)
        self.assertTrue(got["id"].startswith("AUTH-"))


class TestCLI(Base):
    def run_cli(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = A.main(["--ledger", self.ledger_path, "--audit-log", self.audit_path, *args])
        return code, out.getvalue(), err.getvalue()

    def dates(self):
        today = dt.datetime.now(UTC).date()
        return str(today - dt.timedelta(days=1)), str(today + dt.timedelta(days=30))

    def add_lp_cli(self, *extra):
        doc = os.path.join(self.tmp, "SW-1.pdf")
        with open(doc, "wb") as f:
            f.write(b"%PDF-1.4 scanned warrant")
        issued, expires = self.dates()
        return self.run_cli("add-authority", "--class", "LEGAL_PROCESS", "--case", CASE,
                            "--process-type", "warrant", "--reference", "SW-1", "--issuer", "Example Court",
                            "--issued", issued, "--expires", expires, "--scope", "records",
                            "--subject", SUBJECT, "--officer", "Det. A", "--agency", "Example SO",
                            "--document", doc, *extra), doc

    def test_add_check_revoke_verify(self):
        (code, out, err), doc = self.add_lp_cli()
        self.assertEqual(code, 0, err)
        rec = json.loads(out)
        self.assertEqual(rec["document_sha256"], A.sha256_file(doc))
        self.assertEqual(rec["document_name"], "SW-1.pdf")

        code, out, _ = self.run_cli("check", "--source", "LEGAL_PROCESS", "--case", CASE, "--subject", SUBJECT)
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out)["authority"]["id"], rec["id"])
        code, out, _ = self.run_cli("check", "--source", "LEGAL_PROCESS", "--case", CASE, "--subject", "Other")
        self.assertEqual(code, 3)
        self.assertFalse(json.loads(out)["covered"])

        code, out, _ = self.run_cli("list", "--case", CASE)
        self.assertEqual([r["id"] for r in json.loads(out)], [rec["id"]])

        self.assertEqual(self.run_cli("revoke", "--id", rec["id"], "--reason", "returned")[0], 0)
        self.assertEqual(self.run_cli("check", "--source", "LEGAL_PROCESS", "--case", CASE,
                                      "--subject", SUBJECT)[0], 3)
        code, out, _ = self.run_cli("list", "--case", CASE, "--all")
        self.assertEqual(json.loads(out)[0]["status"], "revoked")

        code, out, _ = self.run_cli("verify", "--check-documents", self.tmp)
        self.assertEqual(code, 0, out)
        res = json.loads(out)
        self.assertTrue(res["documents"][0]["ok"])
        head = res["ledger"]["head"]
        self.assertEqual(self.run_cli("verify", "--expect-ledger-head", head)[0], 0)
        self.assertEqual(self.run_cli("verify", "--expect-ledger-head", "0" * 64)[0], 1)

        with open(doc, "ab") as f:
            f.write(b"altered")
        self.assertEqual(self.run_cli("verify", "--check-documents", self.tmp)[0], 1)

    def test_check_public_and_licensed(self):
        self.assertEqual(self.run_cli("check", "--source", "PUBLIC", "--subject", "x")[0], 0)
        self.assertEqual(self.run_cli("add-authority", "--class", "LICENSED", "--case", CASE,
                                      "--purpose", PURPOSE)[0], 0)
        self.assertEqual(self.run_cli("check", "--source", "LICENSED", "--case", CASE, "--subject", SUBJECT)[0], 3)
        self.assertEqual(self.run_cli("check", "--source", "LICENSED", "--case", CASE, "--subject", SUBJECT,
                                      "--purpose", PURPOSE)[0], 0)

    def test_bad_input_exit_2(self):
        self.assertEqual(self.run_cli("add-authority", "--class", "LEGAL_PROCESS", "--case", CASE)[0], 2)
        self.assertEqual(self.run_cli("add-authority", "--class", "LICENSED", "--case", CASE)[0], 2)
        self.assertEqual(self.run_cli("check", "--source", "NOPE", "--subject", "x")[0], 2)
        self.assertEqual(self.run_cli("check", "--source", "LICENSED", "--subject", "x")[0], 2)
        self.assertEqual(self.run_cli("revoke", "--id", "AUTH-missing", "--reason", "x")[0], 2)
        (code, _, err), _ = self.add_lp_cli("--expires", "2020-01-01")
        self.assertEqual(code, 2, err)

    def test_verify_detects_tamper_exit_1(self):
        self.run_cli("add-authority", "--class", "LICENSED", "--case", CASE, "--purpose", PURPOSE)
        self.run_cli("add-authority", "--class", "LICENSED", "--case", "MP-2", "--purpose", PURPOSE)
        self.assertEqual(self.run_cli("verify")[0], 0)
        with open(self.ledger_path, encoding="utf-8") as f:
            lines = f.read().splitlines()
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            f.write(lines[1] + "\n")
        code, out, _ = self.run_cli("verify")
        self.assertEqual(code, 1)
        self.assertFalse(json.loads(out)["ledger"]["ok"])
        self.assertEqual(self.run_cli("check", "--source", "LICENSED", "--case", "MP-2", "--subject", "x",
                                      "--purpose", PURPOSE)[0], 1)


if __name__ == "__main__":
    unittest.main()
