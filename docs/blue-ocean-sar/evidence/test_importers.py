"""Tests for importers.py. Fixtures are written by the real producing modules (loaded read-only
from their files), so the importers are checked against the formats as they exist today.

Run from this folder:  python3 -m unittest -v
"""

import datetime as dt
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SAR = os.path.dirname(HERE)
sys.path.insert(0, SAR)

from evidence import core, importers  # noqa: E402

# A real line written by opendata-rs (evidence.rs) on 2026-10-16 while capturing the camera catalogue.
RUST_LINE = (
    '{"seq":0,"utc":"2026-10-16T19:57:28.703Z","method":"GET","url":"https://raw.githubusercontent.com/'
    'AidanWelch/OpenTrafficCamMap/master/cameras/USA.json","final_url":"https://raw.githubusercontent.com/'
    'AidanWelch/OpenTrafficCamMap/master/cameras/USA.json","status":200,"request_body_sha256":null,'
    '"sha256":"f9b0df5a00373c80104478a2055ac299a61734d96f58ae8fa585cec78ff9dd41","bytes":1591599,'
    '"file":"objects/f9b0df5a00373c80104478a2055ac299a61734d96f58ae8fa585cec78ff9dd41.bin",'
    '"prev_hash":"0000000000000000000000000000000000000000000000000000000000000000",'
    '"entry_hash":"4742443bac512c99dc9dccb9f0cc8c76155041a5e9c99a2571484d338d7e629d"}'
)


def _load(name, relpath):
    path = os.path.normpath(os.path.join(SAR, relpath))
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def lacks(rep):
    return {x["guarantee"] for x in rep["lacks"]}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        for root, _, files in os.walk(self.tmp):
            for name in files:
                os.chmod(os.path.join(root, name), 0o600)
        shutil.rmtree(self.tmp)

    def sub(self, name):
        p = os.path.join(self.tmp, name)
        os.makedirs(p, exist_ok=True)
        return p


class FetchSidecars(Base):
    @classmethod
    def setUpClass(cls):
        cls.fetch = _load("legacy_fetch", "opendata/fetch.py")

    def save(self, d, body, when="2026-10-16T12:00:00Z", url="https://example.org/a"):
        import hashlib
        return self.fetch.save_evidence(d, url=url, final_url=url, method="GET", status=200, headers={},
                                        body=body, sha256=hashlib.sha256(body).hexdigest(), nbytes=len(body),
                                        fetched_at=when)

    def test_same_second_capture_overwrites_and_is_flagged(self):
        d = self.sub("fetch")
        self.save(d, b"same", url="https://example.org/first")
        self.save(d, b"same", url="https://example.org/second")  # same second, same body: same name
        rep = importers.import_fetch_sidecars(d)
        self.assertTrue(rep["verified"], rep["problems"])
        self.assertEqual(rep["count"], 1, "two captures, one survives: the C5 collision")
        self.assertEqual(rep["records"][0]["source"], "https://example.org/second")
        self.assertTrue({"unique_files", "chained", "metadata_hashed", "signed", "trusted_time", "operator",
                         "server_date", "tls_fingerprint"} <= lacks(rep))

    def test_altered_body_and_edited_sidecar(self):
        d = self.sub("fetch")
        side = self.save(d, b"body")
        with open(side, encoding="utf-8") as f:
            meta = json.load(f)
        meta["url"] = "https://example.org/forged"
        with open(side, "w", encoding="utf-8") as f:
            json.dump(meta, f)
        self.assertTrue(importers.import_fetch_sidecars(d)["verified"], "sidecar metadata is not protected")
        with open(os.path.join(d, meta["body_file"]), "wb") as f:
            f.write(b"BODY")
        rep = importers.import_fetch_sidecars(d)
        self.assertFalse(rep["verified"])
        self.assertTrue(any("does not match its sha256" in p for p in rep["problems"]))


class RustManifest(Base):
    def test_real_rust_line_hash_recomputes(self):
        d = self.sub("rs")
        with open(os.path.join(d, "manifest.jsonl"), "w", encoding="utf-8") as f:
            f.write(RUST_LINE + "\n")
        rep = importers.import_rust_manifest(d)
        # The 1.5 MB object is not part of the fixture; only its absence may be reported.
        self.assertEqual([p for p in rep["problems"] if "stored file missing" not in p], [])
        self.assertEqual(rep["head"], json.loads(RUST_LINE)["entry_hash"])
        self.assertTrue({"signed", "trusted_time", "operator", "server_date", "tls_fingerprint",
                         "head_anchor"} <= lacks(rep))
        self.assertNotIn("metadata_hashed", lacks(rep))

    def _build(self, d, bodies):
        os.makedirs(os.path.join(d, "objects"), exist_ok=True)
        prev, lines = importers.GENESIS, []
        for i, body in enumerate(bodies):
            sha = core.sha256_hex(body)
            rel = f"objects/{sha}.bin"
            with open(os.path.join(d, rel), "wb") as f:
                f.write(body)
            e = {"seq": i, "utc": "2026-10-16T12:00:00.000Z", "method": "GET", "url": f"https://h/{i}",
                 "final_url": f"https://h/{i}", "status": 200, "request_body_sha256": None, "sha256": sha,
                 "bytes": len(body), "file": rel, "prev_hash": prev}
            e["entry_hash"] = importers._rust_hash(e)
            prev = e["entry_hash"]
            lines.append(json.dumps(e, separators=(",", ":")))
        with open(os.path.join(d, "manifest.jsonl"), "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        return lines

    def test_edit_and_reorder_detected(self):
        d = self.sub("rs")
        lines = self._build(d, [b"a", b"b", b"c"])
        self.assertTrue(importers.import_rust_manifest(d)["verified"])
        self.assertEqual(importers.detect_format(d), "rust-manifest")
        e = json.loads(lines[1])
        e["status"] = 404
        with open(os.path.join(d, "manifest.jsonl"), "w", encoding="utf-8") as f:
            f.write("\n".join([lines[0], json.dumps(e), lines[2]]) + "\n")
        self.assertTrue(any("entry_hash mismatch" in p for p in importers.import_rust_manifest(d)["problems"]))
        with open(os.path.join(d, "manifest.jsonl"), "w", encoding="utf-8") as f:
            f.write("\n".join([lines[0], lines[2], lines[1]]) + "\n")
        self.assertFalse(importers.import_rust_manifest(d)["verified"])


class AuthorityChain(Base):
    def test_verifies_and_flags_missing_actor_and_signature(self):
        A = _load("legacy_authority", "opendata/authority.py")
        path = os.path.join(self.sub("auth"), "audit.jsonl")
        log = A.ChainLog(path)
        now = dt.datetime(2026, 10, 16, 12, tzinfo=dt.timezone.utc)
        log.append({"event": "lookup", "actor": "Det. A"}, now=now)
        log.append({"event": "lookup"}, now=now)
        rep = importers.import_authority_chain(path)
        self.assertTrue(rep["verified"], rep["problems"])
        self.assertEqual(rep["head"], A.ChainLog(path).verify()["head"])
        self.assertEqual(importers.detect_format(path), "authority-chain")
        self.assertTrue({"operator", "signed", "trusted_time"} <= lacks(rep))
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
        e = json.loads(lines[0])
        e["actor"] = "Someone Else"
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(e) + "\n" + lines[1] + "\n")
        rep = importers.import_authority_chain(path)
        self.assertFalse(rep["verified"])
        self.assertTrue(any("entry edited" in p for p in rep["problems"]))


class RingManifest(Base):
    def make(self, d):
        R = _load("legacy_ring", "opendata/ring_export.py")
        from pathlib import Path
        prev = R.GENESIS_HASH
        for i, body in enumerate([b"video-1", b"video-2"]):
            name = f"evt{i}.mp4"
            with open(os.path.join(d, name), "wb") as f:
                f.write(body)
            digest, size = R.sha256_file(Path(d) / name)
            prev = R.append_manifest(Path(d), {"event_id": str(i), "device_id": "1", "device_name": "Front",
                                               "kind": "motion", "created_at_utc": "2026-10-16T12:00:00Z",
                                               "file": name, "sha256": digest, "bytes": size,
                                               "retrieved_at_utc": "2026-10-16T12:05:00Z"}, prev)
        self.assertEqual(R.verify_dir(Path(d)), [])
        return prev

    def test_verifies_flags_and_detects_unlisted(self):
        d = self.sub("ring")
        head = self.make(d)
        rep = importers.import_ring_manifest(d)
        self.assertTrue(rep["verified"], rep["problems"])
        self.assertEqual(rep["head"], head)
        self.assertEqual(importers.detect_format(d), "ring-manifest")
        self.assertTrue({"signed", "trusted_time", "operator", "head_anchor"} <= lacks(rep))
        with open(os.path.join(d, "planted.mp4"), "wb") as f:
            f.write(b"x")
        self.assertFalse(importers.import_ring_manifest(d)["verified"])

    def test_migrate_into_signed_shared_log(self):
        d = self.sub("ring")
        head = self.make(d)
        priv, pub = os.path.join(self.tmp, "k"), os.path.join(self.tmp, "k.pub")
        core.generate_keypair(priv, pub)
        rep = importers.import_ring_manifest(d)
        target = os.path.join(self.tmp, "shared")
        log = core.EvidenceLog(target, operator="Det. A", private_key=core.load_private_key(priv),
                               clock=lambda: {"ntp_synchronized": "yes"})
        new = importers.to_evidence_log(rep, log)
        self.assertEqual(len(new), 2)
        self.assertEqual(new[0]["kind"], "import:ring-manifest")
        self.assertEqual(new[0]["extra"]["legacy_head"], head)
        self.assertEqual(new[1]["sha256"], core.sha256_hex(b"video-2"))
        self.assertTrue(core.verify_log(target, public_key=core.load_public_key(pub))["ok"])

    def test_migration_refuses_a_broken_set(self):
        d = self.sub("ring")
        self.make(d)
        with open(os.path.join(d, "evt0.mp4"), "wb") as f:
            f.write(b"edited")
        rep = importers.import_ring_manifest(d)
        log = core.EvidenceLog(os.path.join(self.tmp, "shared"), operator="Op")
        with self.assertRaises(core.EvidenceError):
            importers.to_evidence_log(rep, log)


class Columbus(Base):
    def make(self, d):
        C = _load("legacy_columbus", "realdata/columbus_records.py")
        log = C.EvidenceLog(d)
        log.write("001_building_metadata.json", b'{"fields": []}', role="raw_response", layer="building",
                  kind="metadata", url="https://gis.columbus.gov/x", status=200, retrieved_utc="2026-10-16T12:00:00Z")
        log.write("002_building_summary.json", b'{"records": 0}', role="parsed_summary", layer="building")
        manifest = {"manifest_version": C.MANIFEST_VERSION, "chain_algorithm": C.CHAIN_ALGORITHM,
                    "genesis": C.GENESIS, "files": log.entries, "file_count": len(log.entries),
                    "chain_head": log.head, "complete": True, "query": {"number": 1546}}
        with open(os.path.join(d, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, sort_keys=True)
        self.assertEqual(C.verify(d), [])
        return C, log.head

    def test_metadata_edit_passes_legacy_verify_and_is_flagged(self):
        d = self.sub("run")
        C, head = self.make(d)
        mpath = os.path.join(d, "manifest.json")
        with open(mpath, encoding="utf-8") as f:
            manifest = json.load(f)
        manifest["files"][0]["url"] = "https://gis.columbus.gov/forged"
        manifest["complete"] = False
        with open(mpath, "w", encoding="utf-8") as f:
            json.dump(manifest, f)
        self.assertEqual(C.verify(d), [], "the legacy verifier misses this edit (finding C5)")
        rep = importers.import_columbus(d, expect_head=head)
        self.assertTrue(rep["verified"])
        self.assertEqual(importers.detect_format(d), "columbus")
        weak = {x["guarantee"]: x["detail"] for x in rep["lacks"]}
        self.assertIn("metadata_hashed", weak)
        self.assertIn("'url'", weak["metadata_hashed"])
        self.assertIn("'complete'", weak["metadata_hashed"])
        self.assertTrue({"signed", "trusted_time", "operator"} <= set(weak))

    def test_content_and_chain_problems(self):
        d = self.sub("run")
        _, head = self.make(d)
        os.chmod(os.path.join(d, "002_building_summary.json"), 0o600)
        with open(os.path.join(d, "002_building_summary.json"), "wb") as f:
            f.write(b"{}")
        rep = importers.import_columbus(d)
        self.assertFalse(rep["verified"])
        self.assertTrue(any("sha256" in p for p in rep["problems"]))
        self.assertFalse(importers.import_columbus(d, expect_head="1" * 64)["verified"])


class HFMR(Base):
    def test_verifies_and_flags_missing_time_and_operator(self):
        H = _load("legacy_hfmr", "../hfmr/hfmr.py")
        path = os.path.join(self.sub("hfmr"), "ledger.jsonl")
        led = H.Ledger(path)
        led.append({"decision": "posterior", "input_hashes": ["a" * 64]})
        head = led.append({"decision": "abstain", "note": "café"})
        rep = importers.import_hfmr_ledger(path)
        self.assertTrue(rep["verified"], rep["problems"])
        self.assertEqual(rep["head"], head)
        self.assertEqual(importers.detect_format(path), "hfmr-ledger")
        self.assertTrue({"capture_time", "operator", "signed", "trusted_time"} <= lacks(rep))
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
        with open(path, "w", encoding="utf-8") as f:
            f.write(lines[1] + "\n")
        self.assertFalse(importers.import_hfmr_ledger(path)["verified"])

    def test_record_only_entries_migrate_as_canonical_json(self):
        H = _load("legacy_hfmr", "../hfmr/hfmr.py")
        path = os.path.join(self.sub("hfmr"), "ledger.jsonl")
        H.Ledger(path).append({"decision": "abstain"})
        rep = importers.import_any(path)
        log = core.EvidenceLog(os.path.join(self.tmp, "shared"), operator="Analyst",
                               clock=lambda: {"ntp_synchronized": "unknown"})
        new = importers.to_evidence_log(rep, log)
        self.assertEqual(new[0]["kind"], "import:hfmr-ledger:record")
        self.assertEqual(new[0]["sha256"], core.sha256_hex(core.canonical(rep["records"][0]["legacy"])))


class Dispatch(Base):
    def test_unknown_format(self):
        p = os.path.join(self.tmp, "x.txt")
        with open(p, "w") as f:
            f.write("hello\n")
        with self.assertRaises(core.EvidenceError):
            importers.import_any(p)

    def test_every_format_has_an_importer(self):
        self.assertEqual(set(importers.FORMATS), set(importers.IMPORTERS))
        for fmt in importers.FORMATS:
            self.assertTrue(callable(importers.IMPORTERS[fmt]))


if __name__ == "__main__":
    unittest.main()
