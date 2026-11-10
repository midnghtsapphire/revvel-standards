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
from unittest import mock

import authority as A

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 16, 12, 0, tzinfo=UTC)
CASE = "MP-2026-014"
SUBJECT = "Jane Q Example"
PURPOSE = "GLBA:6802(e)(8)"
DOC_SHA = "ab" * 32
ACTOR = "Analyst B. Example"
# Built at run time from plain words so no fixed secret-looking literal sits in the source.
HASH_SALT = "-".join(("unit", "test", "only", "subject", "salt"))
LICENSED_EXPIRES = "2026-12-31"


def lp_fields(**kw):
    f = dict(process_type="warrant", reference="SW-2026-0193", issuer="Example County Court",
             issued="2026-10-01", expires="2026-10-31", scope="Subscriber records for the listed number",
             subjects=[SUBJECT, "+1 555 0100"], requesting_officer="Det. A. Example",
             agency="Example County Sheriff", document_sha256=DOC_SHA, recorded_by=ACTOR)
    f.update(kw)
    return f


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.ledger_path = os.path.join(self.tmp, "ledger.jsonl")
        self.audit_path = os.path.join(self.tmp, "audit.jsonl")
        self.now = NOW
        env = mock.patch.dict(os.environ)
        env.start()
        self.addCleanup(env.stop)
        for k in (A.ENV_ACTOR, A.ENV_SALT, A.ENV_REQUIRE_COUNTERSIGN):
            os.environ.pop(k, None)
        self.gate = A.Gate(self.ledger_path, self.audit_path, salt=HASH_SALT, actor=ACTOR, clock=lambda: self.now)
        self.ledger = self.gate.ledger

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def add_licensed(self, case=CASE, purposes=(PURPOSE,), **kw):
        kw.setdefault("subjects", [SUBJECT])
        kw.setdefault("expires", LICENSED_EXPIRES)
        kw.setdefault("recorded_by", ACTOR)
        return self.ledger.add(A.build_authority(A.LICENSED, case, purposes=purposes, **kw), now=NOW)

    def gate_with(self, **kw):
        kw.setdefault("salt", HASH_SALT)
        kw.setdefault("actor", ACTOR)
        kw.setdefault("clock", lambda: self.now)
        return A.Gate(self.ledger_path, self.audit_path, **kw)

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
        with self.assertRaises(ValueError):
            A.build_authority(A.LICENSED, CASE, subjects=[SUBJECT], expires=LICENSED_EXPIRES, recorded_by=ACTOR)

    def test_licensed_needs_subjects_expiry_and_recorder(self):
        # SYSTEM_REVIEW H2: LICENSED used to need no subjects and no expiry, and the actor was optional.
        ok = dict(purposes=[PURPOSE], subjects=[SUBJECT], expires=LICENSED_EXPIRES, recorded_by=ACTOR)
        A.build_authority(A.LICENSED, CASE, **ok)
        for drop, word in (("subjects", "--subject"), ("expires", "--expires"), ("recorded_by", "recorded_by")):
            with self.subTest(drop=drop), self.assertRaisesRegex(ValueError, word):
                A.build_authority(A.LICENSED, CASE, **dict(ok, **{drop: None}))
        with self.assertRaisesRegex(ValueError, "recorded_by"):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(recorded_by="  "))

    # def test_optional_subject_list_is_enforced(self):  # renamed, SYSTEM_REVIEW H2
    # Lesson: the old name documented "optional" subjects as intended; the subject list is now mandatory.
    def test_subject_list_is_enforced(self):
        self.add_licensed(subjects=[SUBJECT])
        self.assertRefused(A.LICENSED, CASE, "Somebody Else", PURPOSE)
        self.gate.require(A.LICENSED, CASE, SUBJECT, PURPOSE)

    def test_licensed_expires(self):
        self.add_licensed()
        self.now = dt.datetime(2027, 1, 1, 0, 0, 1, tzinfo=UTC)
        self.assertIn("expired", self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE))

    def test_records_from_before_h2_never_cover(self):
        # A ledger written by the old code: no subjects, no expiry, no recorded_by.
        old = {"source_class": A.LICENSED, "case_id": CASE, "purposes": [PURPOSE], "subjects": [], "sources": [],
               "requesting_officer": None, "agency": None, "notes": None, "recorded_by": None,
               "issued": None, "expires": None}
        self.ledger.add(old, now=NOW)
        msg = self.assertRefused(A.LICENSED, CASE, SUBJECT, PURPOSE)
        for word in ("lists no subjects", "no expiry", "who entered it"):
            self.assertIn(word, msg)

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
        with self.assertRaisesRegex(ValueError, "who revoked"):
            self.ledger.revoke(auth["id"], "warrant returned")
        self.ledger.revoke(auth["id"], "warrant returned", "owner")
        self.assertIn("revoked", self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate"))
        with self.assertRaises(ValueError):
            self.ledger.revoke(auth["id"], "again", "owner")

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

    def test_countersign_optional_and_flag_requires_it(self):
        plain = self.add_lp(reference="SW-PLAIN")
        self.assertEqual(self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")["id"], plain["id"])
        strict = self.gate_with(require_countersign=True)
        with self.assertRaises(A.AuthorityError) as cm:
            strict.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")
        self.assertIn("countersign", str(cm.exception))
        with self.assertRaisesRegex(ValueError, "--countersign"):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(), require_countersign=True)
        with self.assertRaisesRegex(ValueError, "second person"):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(countersigned_by="  analyst b.  EXAMPLE"))
        signed = self.add_lp(reference="SW-SIGNED", countersigned_by="Sgt. C. Example")
        self.assertEqual(signed["countersigned_by"], "Sgt. C. Example")
        self.assertEqual(strict.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate")["id"], signed["id"])
        os.environ[A.ENV_REQUIRE_COUNTERSIGN] = "1"
        with self.assertRaisesRegex(ValueError, "--countersign"):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields())
        self.assertTrue(self.gate_with().require_countersign)

    def test_reference_binds_the_call_to_its_authority(self):
        # review 2026-10-16: an authority for one warrant covered a call that cited another reference.
        sw1 = self.add_lp(reference="SW-1")
        msg = self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate", reference="SW-2")
        self.assertIn("reference", msg)
        self.assertRefused(A.LEGAL_PROCESS, CASE, SUBJECT, "locate", reference="  ")
        self.assertEqual(self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate", reference=" sw-1 ")["id"],
                         sw1["id"])
        sw2 = self.add_lp(reference="SW-2")
        self.assertEqual(self.gate.require(A.LEGAL_PROCESS, CASE, SUBJECT, "locate", reference="SW-2")["id"],
                         sw2["id"])

    def test_empty_document_is_not_a_warrant(self):
        with self.assertRaisesRegex(ValueError, "empty"):
            A.build_authority(A.LEGAL_PROCESS, CASE, **lp_fields(document_sha256=A.sha256_bytes(b"")))

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
        self.ledger.revoke(a["id"], "returned", ACTOR)
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
        self.assertNotIn(HASH_SALT, text)
        e = self.audit()[0]
        # self.assertEqual(e["subject_sha256"], A.sha256_bytes(b"jane q example"))  # replaced, SYSTEM_REVIEW H2
        # Lesson: this test pinned the reversible unsalted hash as correct behaviour; a test that asserts a weakness
        # protects it. The salted-hash test that followed built its Gate with a fixed salt literal and no actor.
        self.assertNotIn("subject_sha256", e)  # SYSTEM_REVIEW H2: no reversible unsalted hash
        self.assertNotEqual(e["subject_hmac_sha256"], A.sha256_bytes(b"jane q example"))
        self.assertEqual(e["actor"], ACTOR)
        for k in ("ts", "source_class", "case_id", "purpose", "authority", "reason"):
            self.assertIn(k, e)

    def test_hash_mode_refuses_to_start_without_salt(self):
        for salt in (None, "", "short"):
            with self.subTest(salt=salt), self.assertRaisesRegex(ValueError, A.ENV_SALT):
                A.Gate(self.ledger_path, self.audit_path, salt=salt, actor=ACTOR)
        os.environ[A.ENV_SALT] = HASH_SALT
        self.assertEqual(A.Gate(self.ledger_path, self.audit_path, actor=ACTOR).salt, HASH_SALT)

    def test_plain_mode_is_explicit(self):
        self.add_licensed()
        plain = A.Gate(self.ledger_path, self.audit_path, subject_mode="plain", actor=ACTOR, clock=lambda: NOW)
        plain.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.assertEqual(self.audit()[-1]["subject"], SUBJECT)

    def test_every_gate_call_needs_an_actor(self):
        self.add_licensed()
        anon = self.gate_with(actor=None)
        for args in ((A.LICENSED, CASE, SUBJECT, PURPOSE), (A.PUBLIC, "", None, "")):
            with self.subTest(args=args), self.assertRaisesRegex(A.AuthorityError, "no actor"):
                anon.require(*args)
            self.assertEqual(self.audit()[-1]["event"], "refuse")
        os.environ[A.ENV_ACTOR] = "  Env   Analyst "
        from_env = self.gate_with(actor=None)
        from_env.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        self.assertEqual(self.audit()[-1]["actor"], "Env Analyst")

    def test_fails_closed_when_audit_unwritable(self):
        self.add_licensed()
        os.makedirs(os.path.join(self.tmp, "auditdir"))
        g = A.Gate(self.ledger_path, os.path.join(self.tmp, "auditdir"), salt=HASH_SALT, actor=ACTOR,
                   clock=lambda: NOW)
        with self.assertRaises(A.AuthorityError):
            g.require(A.LICENSED, CASE, SUBJECT, PURPOSE)
        with self.assertRaises(A.AuthorityError):
            g.require(A.PUBLIC, CASE, SUBJECT, PURPOSE)

    def test_module_level_require(self):
        self.add_licensed()
        got = A.require(A.LICENSED, CASE, SUBJECT, PURPOSE, ledger_path=self.ledger_path,
                        audit_path=self.audit_path, salt=HASH_SALT, actor=ACTOR)
        self.assertTrue(got["id"].startswith("AUTH-"))


class TestCLI(Base):
    def run_cli(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = A.main(["--ledger", self.ledger_path, "--audit-log", self.audit_path, "--actor", ACTOR, *args])
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
        self.assertEqual(rec["recorded_by"], ACTOR)

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
        lic = ("add-authority", "--class", "LICENSED", "--case", CASE, "--purpose", PURPOSE)
        self.assertEqual(self.run_cli(*lic)[0], 2)  # SYSTEM_REVIEW H2: no subject, no expiry
        self.assertEqual(self.run_cli(*lic, "--subject", SUBJECT)[0], 2)
        self.assertEqual(self.run_cli(*lic, "--subject", SUBJECT, "--expires", self.dates()[1])[0], 0)
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

    def test_actor_and_countersign_on_the_cli(self):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = A.main(["--ledger", self.ledger_path, "--audit-log", self.audit_path, "add-authority",
                           "--class", "LICENSED", "--case", CASE, "--purpose", PURPOSE, "--subject", SUBJECT,
                           "--expires", self.dates()[1]])
        self.assertEqual(code, 2)
        self.assertIn("recorded_by", err.getvalue())
        (code, _, err), _ = self.add_lp_cli("--require-countersign")
        self.assertEqual(code, 2, err)
        (code, out, err), _ = self.add_lp_cli("--require-countersign", "--countersign", "Sgt. C. Example")
        self.assertEqual(code, 0, err)
        self.assertEqual(json.loads(out)["countersigned_by"], "Sgt. C. Example")
        (code, _, err), _ = self.add_lp_cli("--countersign", ACTOR)
        self.assertEqual(code, 2, err)

    def test_new_log_directories_are_private(self):
        # review 2026-10-16: makedirs created missing parents of the ledger / audit log with the umask (0755).
        old = os.umask(0o022)
        self.addCleanup(os.umask, old)
        path = os.path.join(self.tmp, "a", "b", "audit.jsonl")
        A.ChainLog(path).append({"event": "x"})
        for d in (os.path.join(self.tmp, "a"), os.path.join(self.tmp, "a", "b")):
            self.assertEqual(os.stat(d).st_mode & 0o777, 0o700, d)

    def test_verify_check_documents_on_tampered_ledger_exit_1(self):
        # review 2026-10-16: folding a tampered 'add' entry raised KeyError (exit 2) instead of reporting exit 1.
        (code, _, err), _ = self.add_lp_cli()
        self.assertEqual(code, 0, err)
        with open(self.ledger_path, encoding="utf-8") as f:
            entry = json.loads(f.read().splitlines()[0])
        del entry["authority"]
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        code, out, err = self.run_cli("verify", "--check-documents", self.tmp)
        self.assertEqual(code, 1, err)
        res = json.loads(out)
        self.assertFalse(res["ledger"]["ok"])
        self.assertIn("skipped", res["documents"])

    def test_verify_detects_tamper_exit_1(self):
        lic = ("--purpose", PURPOSE, "--subject", "x", "--expires", self.dates()[1])
        self.run_cli("add-authority", "--class", "LICENSED", "--case", CASE, *lic)
        self.run_cli("add-authority", "--class", "LICENSED", "--case", "MP-2", *lic)
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
