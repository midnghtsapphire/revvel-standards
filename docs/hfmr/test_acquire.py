# unused (flake8 F401), kept for reference: import hashlib
# unused (flake8 F401), kept for reference: import json
import tempfile
import unittest
import urllib.request
from pathlib import Path
from unittest import mock
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

    def test_default_opener_checks_redirects_before_following(self):
        # urlopen follows redirects before returning, so the target must be checked in the
        # redirect handler, not afterwards from response.geturl().
        handlers = []

        class FakeOpener:
            # Original: def open(self, req, timeout=None):
            #   OpenerDirector.open also takes data; checked_urlopen now forwards it like urlopen.
            def open(self, req, data=None, timeout=None):
                return FakeResponse(req.full_url)

        def fake_build_opener(*args):
            handlers.extend(args)
            return FakeOpener()

        with tempfile.TemporaryDirectory() as t, mock.patch("urllib.request.build_opener", fake_build_opener):
            fetch("https://example.org/file", Path(t) / "a.bin", ["example.org"])
        redirect = [h for h in handlers if isinstance(h, urllib.request.HTTPRedirectHandler)]
        self.assertEqual(len(redirect), 1)
        req = urllib.request.Request("https://example.org/file")
        with self.assertRaises(ValueError):
            redirect[0].redirect_request(req, None, 302, "Found", {}, "https://169.254.169.254/latest")
        self.assertIsNotNone(redirect[0].redirect_request(req, None, 302, "Found", {}, "https://example.org/b"))

    def test_module3_readme_limits_redirect_claim_to_default_opener(self):
        # fetch only installs the checked redirect handler when no opener is passed.
        text = (Path(__file__).parent / "modules" / "MODULE3_README.md").read_text()
        self.assertIn("With the default opener, redirects are validated before they are followed", text)
        self.assertIn("must enforce the same policy itself", text)
        with mock.patch("urllib.request.build_opener") as build, tempfile.TemporaryDirectory() as t:
            fetch(
                "https://example.org/f",
                Path(t) / "f",
                ["example.org"],
                opener=lambda r, timeout: FakeResponse(r.full_url),
            )
        build.assert_not_called()

    def test_checked_urlopen_matches_urlopen_signature(self):
        import socket
        from .safe_redirect import checked_urlopen

        calls = []

        class FakeOpener:
            def open(self, url, data=None, timeout=None):
                calls.append((url, data, timeout))

        with mock.patch("urllib.request.build_opener", lambda *handlers: FakeOpener()):
            _open = checked_urlopen(lambda target: None)
        _open("https://example.org/a")
        _open("https://example.org/b", b"payload", 5)
        _open("https://example.org/c", data=b"x", timeout=7)
        self.assertEqual(
            calls,
            [
                ("https://example.org/a", None, socket._GLOBAL_DEFAULT_TIMEOUT),
                ("https://example.org/b", b"payload", 5),
                ("https://example.org/c", b"x", 7),
            ],
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
