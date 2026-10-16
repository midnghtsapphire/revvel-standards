# unused (flake8 F401), kept for reference: import hashlib
# unused (flake8 F401), kept for reference: import json
import tempfile
import unittest
from pathlib import Path
from .acquire import validate_url, fetch, save_manifest, verify_manifest, timeline


class FakeResponse:
    def __init__(self, url, data=b"example"):
        self.url = url
        self.data = data
        self.pos = 0
        self.headers = {"Last-Modified": "Thu, 01 Jan 2009 00:00:00 GMT"}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def geturl(self):
        return self.url

    def read(self, n):
        d = self.data[self.pos:self.pos + n]  # noqa: E203
        self.pos += len(d)
        return d


class TestAcquire(unittest.TestCase):
    def test_hosts(self):
        for u in ["http://example.org/a", "https://evil.org/a", "file:///etc/passwd", "https://user:pw@example.org/a"]:
            with self.assertRaises(ValueError):
                validate_url(u, ["example.org"])

    def test_fetch_verify_tamper(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "a.bin"
            m = fetch(
                "https://example.org/file", p, ["example.org"], opener=lambda req, timeout: FakeResponse(req.full_url)
            )
            self.assertIsNone(m["acquisition_date"])
            self.assertTrue(p.exists())
            manifest = Path(t) / "m.json"
            save_manifest(m, manifest)
            self.assertTrue(verify_manifest(manifest))
            p.write_bytes(b"tampered")
            self.assertFalse(verify_manifest(manifest))
            with self.assertRaises(FileExistsError):
                fetch(
                    "https://example.org/file",
                    p,
                    ["example.org"],
                    opener=lambda req, timeout: FakeResponse(req.full_url),
                )

    def test_oversize_cleanup(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "a.bin"
            with self.assertRaises(ValueError):
                fetch(
                    "https://example.org/a",
                    p,
                    ["example.org"],
                    max_bytes=2,
                    opener=lambda req, timeout: FakeResponse(req.full_url, b"12345"),
                )
            self.assertFalse(p.exists())

    def test_redirect_host(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(ValueError):
                fetch(
                    "https://example.org/a",
                    Path(t) / "a",
                    ["example.org"],
                    opener=lambda req, timeout: FakeResponse("https://evil.org/a"),
                )

    def test_timeline(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "r.csv"
            p.write_text(
                "source_id,modality,acquisition_window,source_url,validation_needed\nX,SAR,2006,https://example.org,verify\n"  # noqa: E501
            )
            self.assertFalse(timeline(p)[0]["acquisition_verified"])


if __name__ == "__main__":
    unittest.main()
