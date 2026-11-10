"""Tests for ring_export.py.

Every Ring object is a local fake, so these run without the ring_doorbell
package installed and without network access (Ring's API is unreachable from
CI anyway). The fakes mirror the async API of ring_doorbell 0.9.x:
Auth(user_agent, token, token_updater) with async_fetch_token /
async_refresh_tokens / async_close, Ring(auth).async_update_data(),
ring.devices() with doorbots / stickup_cams / chimes / authorized_doorbots,
device.async_history(limit=, older_than=) and
device.async_recording_download(recording_id).
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ring_export as rx  # noqa: E402

PASSWORD = "hunter2-SUPER-secret-pw"
OTP = "918273"
REFRESH_1 = "refresh-AAAA-1111-initial-token"
REFRESH_2 = "refresh-BBBB-2222-rotated-token"
ACCESS = "access-CCCC-3333-bearer-token"


# --------------------------------------------------------------------------
# Fakes
# --------------------------------------------------------------------------


class RingError(Exception):
    pass


class Requires2FAError(RingError):
    pass


class AuthenticationError(RingError):
    pass


class FakeAuth:
    instances: list["FakeAuth"] = []
    require_2fa = True
    reject_refresh = False

    def __init__(self, user_agent, token=None, token_updater=None, hardware_id=None):
        self.user_agent = user_agent
        self.token = token or {}
        self.token_updater = token_updater
        self.closed = False
        self.fetch_calls = []
        FakeAuth.instances.append(self)

    async def async_fetch_token(self, username, password, otp_code=None):
        self.fetch_calls.append((username, otp_code))
        if password != PASSWORD:
            raise AuthenticationError("bad password")
        if self.require_2fa and otp_code is None:
            raise Requires2FAError()
        if self.require_2fa and otp_code != OTP:
            raise AuthenticationError("bad otp")
        logging.getLogger("ring_doorbell.auth").warning(
            "debug dump password=%s token=%s", password, REFRESH_1
        )
        self.token = {"access_token": ACCESS, "refresh_token": REFRESH_1}
        if self.token_updater:
            self.token_updater(self.token)
        return self.token

    async def async_refresh_tokens(self):
        if self.reject_refresh or self.token.get("refresh_token") != REFRESH_1:
            raise AuthenticationError("invalid_grant")
        # A leaky third-party log line: the redactor must scrub it.
        logging.getLogger("ring_doorbell.auth").warning("refreshed with %s", self.token["refresh_token"])
        self.token = {"access_token": ACCESS, "refresh_token": REFRESH_2}
        if self.token_updater:
            self.token_updater(self.token)
        return self.token

    async def async_close(self):
        self.closed = True


def make_events(device_id, count, start, step_minutes=10, first_id=1000):
    """Newest-first synthetic history, ids descending like Ring's."""
    kinds = ["motion", "ding", "on_demand"]
    out = []
    for i in range(count):
        out.append(
            {
                "id": first_id + count - i,
                "kind": kinds[i % 3],
                "created_at": (start - timedelta(minutes=step_minutes * i)).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "duration": 30 + i,
                "answered": i % 2 == 0,
                "recording": {"status": "ready"},
                "doorbot": {"id": device_id},
            }
        )
    return out


class FakeDevice:
    def __init__(self, dev_id, name, kind, history=(), shared=False, location_id="loc-1", subscribed=True):
        self.id = dev_id
        self.name = name
        self.kind = kind
        self.location_id = location_id
        self.shared = shared
        self._history = list(history)
        self.subscribed = subscribed
        self.history_calls = []
        self.download_calls = []
        self.max_limit = None  # a service-side cap on entries per page (review 2026-10-16)
        self.ignore_older_than = False  # a misbehaving API that repeats the first page (review 2026-10-16)

    async def async_history(self, *, limit=30, older_than=None, **_):
        self.history_calls.append({"limit": limit, "older_than": older_than})
        items = self._history
        if older_than is not None and not self.ignore_older_than:
            items = [e for e in items if e["id"] < older_than]
        # return [dict(e) for e in items[:limit]]
        # Replaced (review 2026-10-16): the fake can now cap the page size like a real service limit.
        if self.max_limit is not None:
            limit = min(limit, self.max_limit)
        return [dict(e) for e in items[:limit]]

    async def async_recording_download(self, recording_id, filename=None, **_):
        self.download_calls.append(recording_id)
        if not self.subscribed:
            return None
        return b"\x00\x00\x00\x18ftypmp42" + str(recording_id).encode() * 50


class FakeDevices:
    def __init__(self, doorbots=(), stickup_cams=(), chimes=(), authorized_doorbots=(), other=()):
        self.doorbots = list(doorbots)
        self.stickup_cams = list(stickup_cams)
        self.chimes = list(chimes)
        self.authorized_doorbots = list(authorized_doorbots)
        self.other = list(other)


class FakeRing:
    devices_obj = FakeDevices()

    def __init__(self, auth):
        self.auth = auth
        self.updated = False

    async def async_update_data(self):
        self.updated = True

    def devices(self):
        return FakeRing.devices_obj


def fake_lib():
    return {
        "Auth": FakeAuth,
        "Ring": FakeRing,
        "AuthenticationError": AuthenticationError,
        "Requires2FAError": Requires2FAError,
        "RingError": RingError,
    }


class Captured:
    def __init__(self, inputs=(), secrets=()):
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()
        self._inputs = list(inputs)
        self._secrets = list(secrets)
        self.io = rx.IO(self.stdout, self.stderr, self._input, self._getpass)

    def _input(self, prompt=""):
        return self._inputs.pop(0)

    def _getpass(self, prompt=""):
        return self._secrets.pop(0)

    @property
    def text(self):
        return self.stdout.getvalue() + self.stderr.getvalue()


NOW = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.token_file = self.dir / "cfg" / "ring-token.json"
        FakeAuth.instances = []
        FakeAuth.require_2fa = True
        FakeAuth.reject_refresh = False
        self.front = FakeDevice(101, "Front Door", "lpd_v4", make_events(101, 120, NOW, first_id=5000))
        self.yard = FakeDevice(202, "Back Yard", "cocoa_camera", make_events(202, 7, NOW, first_id=9000))
        self.chime = FakeDevice(303, "Hall Chime", "chime")
        self.neighbour = FakeDevice(909, "Neighbour Shared Door", "lpd_v2",
                                    make_events(909, 5, NOW, first_id=7000), shared=True)
        FakeRing.devices_obj = FakeDevices(
            doorbots=[self.front], stickup_cams=[self.yard], chimes=[self.chime],
            authorized_doorbots=[self.neighbour],
        )
        self.sleeps = []

        async def fake_sleep(seconds):
            self.sleeps.append(seconds)

        patcher = mock.patch.object(rx, "_sleep", fake_sleep)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.log_buf = io.StringIO()
        self.log_handler = logging.StreamHandler(self.log_buf)
        root = logging.getLogger()
        root.addHandler(self.log_handler)
        self.addCleanup(root.removeHandler, self.log_handler)
        self.addCleanup(self.tmp.cleanup)

    def run_cli(self, argv, inputs=(), secrets=()):
        cap = Captured(inputs, secrets)
        code = rx.main(argv, io=cap.io, lib=fake_lib())
        return code, cap

    def logged_in(self):
        rx.write_token_file(self.token_file, REFRESH_1)


# --------------------------------------------------------------------------
# Token file
# --------------------------------------------------------------------------


class TokenFileTests(Base):
    def test_login_writes_refresh_token_only_with_0600(self):
        code, cap = self.run_cli(["login", "--token-file", str(self.token_file)],
                                 inputs=["owner@example.com"], secrets=[PASSWORD, OTP])
        self.assertEqual(code, 0, cap.text)
        mode = stat.S_IMODE(self.token_file.stat().st_mode)
        self.assertEqual(mode, 0o600)
        data = json.loads(self.token_file.read_text())
        self.assertEqual(data, {"refresh_token": REFRESH_1})
        self.assertNotIn(ACCESS, self.token_file.read_text())
        self.assertNotIn(PASSWORD, self.token_file.read_text())
        # 2FA was prompted and then supplied on the second call
        self.assertEqual(FakeAuth.instances[0].fetch_calls, [("owner@example.com", None), ("owner@example.com", OTP)])
        self.assertTrue(FakeAuth.instances[0].closed)

    def test_parent_dir_created_private(self):
        self.logged_in()
        self.assertEqual(stat.S_IMODE(self.token_file.parent.stat().st_mode) & 0o077, 0)

    def test_refresh_callback_rewrites_atomically_with_0600(self):
        self.logged_in()
        inode_before = self.token_file.stat().st_ino
        code, cap = self.run_cli(["devices", "--token-file", str(self.token_file)])
        self.assertEqual(code, 0, cap.text)
        self.assertEqual(json.loads(self.token_file.read_text()), {"refresh_token": REFRESH_2})
        self.assertEqual(stat.S_IMODE(self.token_file.stat().st_mode), 0o600)
        # os.replace => new inode, never an in-place truncate+write
        self.assertNotEqual(self.token_file.stat().st_ino, inode_before)
        leftovers = [p.name for p in self.token_file.parent.iterdir() if p.name != self.token_file.name]
        self.assertEqual(leftovers, [])

    def test_temp_file_is_0600_before_rename(self):
        # No window where the token sits in a world-readable file.
        modes = []
        real_replace = os.replace

        def spy(src, dst):
            modes.append(stat.S_IMODE(os.stat(src).st_mode))
            return real_replace(src, dst)

        with mock.patch.object(rx.os, "replace", side_effect=spy):
            rx.write_token_file(self.token_file, REFRESH_1)
        self.assertEqual(modes, [0o600])

    def test_failed_write_leaves_old_token_intact(self):
        self.logged_in()
        with mock.patch.object(rx.os, "replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                rx.write_token_file(self.token_file, REFRESH_2)
        self.assertEqual(json.loads(self.token_file.read_text()), {"refresh_token": REFRESH_1})
        self.assertEqual(sorted(p.name for p in self.token_file.parent.iterdir()), [self.token_file.name])

    def test_group_readable_token_file_refused(self):
        self.logged_in()
        os.chmod(self.token_file, 0o644)
        code, cap = self.run_cli(["devices", "--token-file", str(self.token_file)])
        self.assertEqual(code, 2)
        self.assertIn("chmod 600", cap.text)

    def test_missing_token_file_is_exit_2(self):
        code, cap = self.run_cli(["devices", "--token-file", str(self.dir / "nope.json")])
        self.assertEqual(code, 2)

    def test_rejected_refresh_token_is_exit_2(self):
        self.logged_in()
        FakeAuth.reject_refresh = True
        code, cap = self.run_cli(["devices", "--token-file", str(self.token_file)])
        self.assertEqual(code, 2)
        self.assertIn("login", cap.text)

    def test_bad_password_is_exit_2_and_no_token_file(self):
        code, cap = self.run_cli(["login", "--token-file", str(self.token_file)],
                                 inputs=["owner@example.com"], secrets=["wrong-password-x", OTP])
        self.assertEqual(code, 2)
        self.assertFalse(self.token_file.exists())


# --------------------------------------------------------------------------
# Secrets
# --------------------------------------------------------------------------


class SecretTests(Base):
    def assert_no_secrets(self, text):
        for secret in (PASSWORD, OTP, REFRESH_1, REFRESH_2, ACCESS):
            self.assertNotIn(secret, text)

    def test_login_never_prints_or_logs_secrets(self):
        code, cap = self.run_cli(["-v", "login", "--token-file", str(self.token_file)],
                                 inputs=["owner@example.com"], secrets=[PASSWORD, OTP])
        self.assertEqual(code, 0, cap.text)
        self.assert_no_secrets(cap.text)
        logs = self.log_buf.getvalue()
        self.assertIn("debug dump", logs)  # the leaky line was emitted ...
        self.assert_no_secrets(logs)       # ... but scrubbed

    def test_session_commands_never_print_or_log_tokens(self):
        self.logged_in()
        out = self.dir / "e.json"
        code, cap = self.run_cli(["-v", "events", "--token-file", str(self.token_file), "--out", str(out),
                                  "--page-delay", "0"])
        self.assertEqual(code, 0, cap.text)
        logs = self.log_buf.getvalue()
        self.assertIn("refreshed with ***", logs)
        self.assert_no_secrets(cap.text + logs + out.read_text())

    def test_argv_password_rejected(self):
        for argv in (
            ["login", "--token-file", "t.json", "--password", PASSWORD],
            ["login", "--token-file", "t.json", f"--password={PASSWORD}"],
            ["devices", "--token-file", "t.json", "--token", REFRESH_1],
            ["events", "--refresh-token", REFRESH_1, "--out", "x.csv"],
            ["login", "-p", PASSWORD, "--token-file", "t.json"],
            ["login", "--token-file", "t.json", "--otp", OTP],
        ):
            with self.subTest(argv=argv[:3]):
                FakeAuth.instances = []
                code, cap = self.run_cli(argv)
                self.assertEqual(code, 2)
                self.assertIn("refusing", cap.text)
                self.assert_no_secrets(cap.text)
                self.assertEqual(FakeAuth.instances, [], "must refuse before any auth happens")

    def test_token_file_flag_still_allowed(self):
        rx.reject_secret_argv(["devices", "--token-file", "x"])
        rx.reject_secret_argv(["devices", "--token-file=x"])


# --------------------------------------------------------------------------
# Devices (ownership boundary)
# --------------------------------------------------------------------------


class DeviceTests(Base):
    def test_lists_only_own_devices(self):
        self.logged_in()
        code, cap = self.run_cli(["devices", "--token-file", str(self.token_file), "--json"])
        self.assertEqual(code, 0, cap.text)
        rows = json.loads(cap.stdout.getvalue())
        self.assertEqual({r["id"] for r in rows}, {"101", "202", "303"})
        self.assertEqual(rows[0], {"id": "101", "name": "Front Door", "kind": "lpd_v4", "location_id": "loc-1"})
        self.assertNotIn("Neighbour", cap.text)

    def test_shared_flag_excluded_even_in_owned_family(self):
        sneaky = FakeDevice(808, "Shared Cam", "cocoa_camera", make_events(808, 3, NOW, first_id=8000), shared=True)
        FakeRing.devices_obj.stickup_cams.append(sneaky)
        self.logged_in()
        code, cap = self.run_cli(["devices", "--token-file", str(self.token_file), "--json"])
        self.assertEqual(code, 0, cap.text)
        self.assertNotIn("808", {r["id"] for r in json.loads(cap.stdout.getvalue())})
        rx.write_token_file(self.token_file, REFRESH_1)
        code, cap = self.run_cli(["download", "--token-file", str(self.token_file), "--ids", "8002",
                                  "--out-dir", str(self.dir / "r")])
        self.assertEqual(code, 1)
        self.assertEqual(sneaky.history_calls, [])
        self.assertEqual(sneaky.download_calls, [])

    def test_shared_device_cannot_be_selected(self):
        self.logged_in()
        code, cap = self.run_cli(["events", "--token-file", str(self.token_file), "--device", "909",
                                  "--out", str(self.dir / "e.csv")])
        self.assertEqual(code, 2)
        self.assertEqual(self.neighbour.history_calls, [])

    def test_no_neighbors_feature(self):
        src = Path(rx.__file__).read_text().lower()
        parser_help = rx.build_parser().format_help().lower()
        for word in ("neighbor", "neighbour", "feed"):
            self.assertNotIn(word, parser_help)
        self.assertNotIn("neighborhood", src.replace("neighbourhood", ""))


# --------------------------------------------------------------------------
# History paging and filters
# --------------------------------------------------------------------------


class EventsTests(Base):
    def events(self, *extra, out="e.json"):
        path = self.dir / out
        code, cap = self.run_cli(["events", "--token-file", str(self.token_file), "--out", str(path),
                                  "--page-size", "25", *extra])
        return code, cap, path

    def test_pages_with_older_than_until_exhausted(self):
        self.logged_in()
        code, cap, path = self.events("--device", "101")
        self.assertEqual(code, 0, cap.text)
        rows = json.loads(path.read_text())
        self.assertEqual(len(rows), 120)
        self.assertEqual(len({r["event_id"] for r in rows}), 120)
        calls = self.front.history_calls
        self.assertIsNone(calls[0]["older_than"])
        # each next page starts strictly older than the last id of the previous page
        self.assertEqual(calls[1]["older_than"], 5000 + 120 - 24)
        # self.assertEqual(len(calls), 5)  # 25+25+25+25+20
        # Replaced (review 2026-10-16): a short page no longer ends paging; only the empty sixth page does.
        self.assertEqual(len(calls), 6)  # 25+25+25+25+20+0
        # rate limiting: slept between pages
        self.assertGreaterEqual(len(self.sleeps), 4)
        self.assertTrue(all(s == 1.0 for s in self.sleeps))

    def test_fields_and_utc(self):
        self.logged_in()
        code, cap, path = self.events("--device", "101")
        first = json.loads(path.read_text())[0]
        self.assertEqual(set(first), set(rx.EVENT_FIELDS))
        self.assertEqual(first["created_at_utc"], "2026-10-01T12:00:00.000Z")
        self.assertEqual(first["device_id"], "101")
        self.assertEqual(first["recording_status"], "ready")
        self.assertEqual(first["duration_s"], 30)
        self.assertIs(first["answered"], True)

    def test_since_until_filter_and_stop_paging_early(self):
        self.logged_in()
        since = (NOW - timedelta(minutes=300)).isoformat()
        until = (NOW - timedelta(minutes=100)).strftime("%Y-%m-%dT%H:%M:%SZ")
        code, cap, path = self.events("--device", "101", "--since", since, "--until", until)
        self.assertEqual(code, 0, cap.text)
        rows = json.loads(path.read_text())
        times = [rx.parse_iso(r["created_at_utc"]) for r in rows]
        self.assertEqual(len(rows), 21)  # minutes 100..300 step 10, inclusive
        self.assertTrue(all(NOW - timedelta(minutes=300) <= t <= NOW - timedelta(minutes=100) for t in times))
        self.assertEqual(len(self.front.history_calls), 2, "must stop once a page crosses --since")

    def test_kind_filter(self):
        self.logged_in()
        code, cap, path = self.events("--kind", "ding")
        rows = json.loads(path.read_text())
        self.assertTrue(rows)
        self.assertEqual({r["kind"] for r in rows}, {"ding"})
        self.assertEqual({r["device_id"] for r in rows}, {"101", "202"})

    def test_csv_output(self):
        self.logged_in()
        code, cap, path = self.events("--device", "202", out="e.csv")
        self.assertEqual(code, 0)
        lines = path.read_text().splitlines()
        self.assertEqual(lines[0], ",".join(rx.EVENT_FIELDS))
        self.assertEqual(len(lines), 8)

    def test_max_pages_reached_is_incomplete_exit_1(self):
        self.logged_in()
        code, cap, path = self.events("--device", "101", "--max-pages", "2")
        self.assertEqual(code, 1)
        self.assertIn("INCOMPLETE", cap.text)
        self.assertEqual(len(json.loads(path.read_text())), 50)

    def test_short_pages_from_a_service_cap_do_not_end_history(self):
        # review 2026-10-16: Ring returning fewer than --page-size entries was taken as the end of history.
        self.logged_in()
        self.front.max_limit = 10
        code, cap, path = self.events("--device", "101")
        self.assertEqual(code, 0, cap.text)
        self.assertEqual(len(json.loads(path.read_text())), 120)

    def test_repeated_page_is_incomplete_without_duplicates(self):
        # review 2026-10-16: a repeated page was processed again and reported as a complete history.
        self.logged_in()
        self.front.ignore_older_than = True
        code, cap, path = self.events("--device", "101")
        self.assertEqual(code, 1, cap.text)
        self.assertIn("INCOMPLETE", cap.text)
        rows = json.loads(path.read_text())
        self.assertEqual(len(rows), 25)
        self.assertEqual(len({r["event_id"] for r in rows}), 25)

    def test_bad_inputs_exit_2(self):
        self.logged_in()
        for extra in (["--since", "yesterday"], ["--kind", "neighbors"],
                      ["--since", "2026-10-02", "--until", "2026-10-01"]):
            with self.subTest(extra=extra):
                code, cap, _ = self.events(*extra)
                self.assertEqual(code, 2)
        code, cap = self.run_cli(["events", "--token-file", str(self.token_file), "--out", str(self.dir / "x.txt")])
        self.assertEqual(code, 2)


# --------------------------------------------------------------------------
# Download, manifest, hash chain, verify
# --------------------------------------------------------------------------


class DownloadTests(Base):
    def download(self, *ids, extra=()):
        out = self.dir / "rec"
        code, cap = self.run_cli(["download", "--token-file", str(self.token_file), "--ids", *ids,
                                  "--out-dir", str(out), "--page-size", "25", *extra])
        return code, cap, out

    def test_download_writes_bytes_and_manifest_chain(self):
        self.logged_in()
        code, cap, out = self.download("5120", "9005,5050")
        self.assertEqual(code, 0, cap.text)
        records = rx.read_manifest(out)
        self.assertEqual([r["event_id"] for r in records], ["5120", "9005", "5050"])
        prev = rx.GENESIS_HASH
        for r in records:
            data = (out / r["file"]).read_bytes()
            expected = b"\x00\x00\x00\x18ftypmp42" + r["event_id"].encode() * 50
            self.assertEqual(data, expected, "byte-for-byte")
            self.assertEqual(r["sha256"], hashlib.sha256(expected).hexdigest())
            self.assertEqual(r["bytes"], len(expected))
            self.assertEqual(r["prev_hash"], prev)
            self.assertTrue(r["created_at_utc"].endswith("Z"))
            self.assertTrue(r["retrieved_at_utc"].endswith("Z"))
            prev = r["chain_hash"]
        self.assertEqual(records[1]["device_id"], "202")
        code, cap = self.run_cli(["verify", "--out-dir", str(out)])
        self.assertEqual(code, 0, cap.text)
        self.assertIn("verify OK: 3", cap.text)

    def test_rerun_appends_and_skips_existing(self):
        self.logged_in()
        self.download("5120")
        rx.write_token_file(self.token_file, REFRESH_1)  # fake only accepts the initial token
        code, cap, out = self.download("5120", "5119")
        self.assertEqual(code, 0, cap.text)
        records = rx.read_manifest(out)
        self.assertEqual([r["event_id"] for r in records], ["5120", "5119"])
        self.assertEqual(self.front.download_calls, [5120, 5119])
        self.assertEqual(rx.verify_dir(out), [])

    def test_unknown_or_foreign_id_is_incomplete(self):
        self.logged_in()
        # 7003 exists only on the neighbour's shared device
        code, cap, out = self.download("5120", "7003")
        self.assertEqual(code, 1)
        self.assertIn("7003: not found in your own devices", cap.text)
        self.assertEqual(self.neighbour.download_calls, [])
        self.assertEqual(self.neighbour.history_calls, [])
        self.assertEqual([r["event_id"] for r in rx.read_manifest(out)], ["5120"])

    def test_no_subscription_is_incomplete(self):
        self.logged_in()
        self.front.subscribed = False
        code, cap, out = self.download("5120")
        self.assertEqual(code, 1)
        self.assertIn("Ring Protect", cap.text)
        self.assertEqual(rx.read_manifest(out), [])

    def test_non_numeric_id_exit_2(self):
        self.logged_in()
        code, cap, _ = self.download("abc")
        self.assertEqual(code, 2)

    def _fresh(self):
        self.logged_in()
        code, cap, out = self.download("5120", "5119", "9005")
        self.assertEqual(code, 0, cap.text)
        return out

    def verify(self, out):
        return self.run_cli(["verify", "--out-dir", str(out)])

    def test_verify_detects_modified_recording(self):
        out = self._fresh()
        f = out / rx.read_manifest(out)[1]["file"]
        data = bytearray(f.read_bytes())
        data[-1] ^= 0x01
        f.write_bytes(bytes(data))
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("sha256 mismatch", cap.text)

    def test_verify_detects_edited_manifest_record(self):
        out = self._fresh()
        mpath = out / rx.MANIFEST_NAME
        lines = mpath.read_text().splitlines()
        rec = json.loads(lines[1])
        rec["created_at_utc"] = "2020-01-01T00:00:00.000Z"
        lines[1] = json.dumps(rec, sort_keys=True)
        mpath.write_text("\n".join(lines) + "\n")
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("chain_hash mismatch", cap.text)

    def test_verify_detects_rehashed_file_and_record(self):
        # attacker swaps the video AND updates sha256/bytes but cannot fix the chain
        out = self._fresh()
        mpath = out / rx.MANIFEST_NAME
        lines = mpath.read_text().splitlines()
        rec = json.loads(lines[0])
        (out / rec["file"]).write_bytes(b"fake video")
        rec["sha256"] = hashlib.sha256(b"fake video").hexdigest()
        rec["bytes"] = 10
        lines[0] = json.dumps(rec, sort_keys=True)
        mpath.write_text("\n".join(lines) + "\n")
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("chain_hash mismatch", cap.text)

    def test_verify_detects_deleted_and_reordered_lines(self):
        out = self._fresh()
        mpath = out / rx.MANIFEST_NAME
        lines = mpath.read_text().splitlines()
        mpath.write_text("\n".join([lines[0], lines[2]]) + "\n")
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("prev_hash", cap.text)
        mpath.write_text("\n".join([lines[1], lines[0], lines[2]]) + "\n")
        self.assertEqual(self.verify(out)[0], 1)

    def test_verify_detects_missing_and_unlisted_files(self):
        out = self._fresh()
        (out / rx.read_manifest(out)[0]["file"]).unlink()
        (out / "sneaky.mp4").write_bytes(b"x")
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("file missing", cap.text)
        self.assertIn("unlisted recording", cap.text)

    def test_verify_empty_dir_fails(self):
        (self.dir / "empty").mkdir()
        self.assertEqual(self.verify(self.dir / "empty")[0], 1)

    def test_download_finds_ids_past_short_capped_pages(self):
        # review 2026-10-16: a short page from a service cap stopped the id search, so the id was "not found".
        self.logged_in()
        self.front.max_limit = 10
        code, cap, out = self.download("5050")
        self.assertEqual(code, 0, cap.text)
        self.assertEqual([r["event_id"] for r in rx.read_manifest(out)], ["5050"])

    def test_download_refuses_orphan_recordings_without_manifest(self):
        # review 2026-10-16: with no manifest, a stray .mp4 let download succeed into a directory verify rejects.
        self.logged_in()
        out = self.dir / "rec"
        out.mkdir()
        (out / "stray.mp4").write_bytes(b"x")
        code, cap, _ = self.download("5120")
        self.assertEqual(code, 1)
        self.assertIn("in no manifest", cap.text)
        self.assertEqual(FakeAuth.instances, [], "refused before Ring is contacted")
        self.assertFalse((out / rx.MANIFEST_NAME).exists())

    def test_verify_reports_non_object_manifest_line(self):
        # review 2026-10-16: a valid JSON line that is not an object crashed verify with AttributeError.
        out = self._fresh()
        mpath = out / rx.MANIFEST_NAME
        mpath.write_text(mpath.read_text() + "[1, 2]\n")
        code, cap = self.verify(out)
        self.assertEqual(code, 1)
        self.assertIn("not a JSON object", cap.text)

    def test_download_refuses_to_extend_broken_chain(self):
        out = self._fresh()
        f = out / rx.read_manifest(out)[0]["file"]
        f.write_bytes(b"tampered")
        rx.write_token_file(self.token_file, REFRESH_1)
        code, cap, _ = self.download("5118")
        self.assertEqual(code, 1)
        self.assertIn("does not verify", cap.text)


class SharedEvidenceLogTests(Base):
    """download/verify --evidence-log: the shared revvel-evidence/1 log (SYSTEM_REVIEW C5/M1)."""

    OPERATOR = "Owner A. Example"

    def setUp(self):
        super().setUp()
        self.core = rx._fetch_module().evidence_core()
        env = mock.patch.dict(os.environ, {})
        env.start()
        self.addCleanup(env.stop)
        os.environ.pop(self.core.ENV_OPERATOR, None)
        self.log = self.dir / "case-log"
        self.key = self.dir / "keys" / "op.key"
        self.pub = self.dir / "keys" / "op.pub"
        self.key.parent.mkdir()
        self.core.generate_keypair(str(self.key), str(self.pub))  # throwaway test key in a temp dir

    def download(self, *ids, extra=()):
        out = self.dir / "rec"
        code, cap = self.run_cli(["download", "--token-file", str(self.token_file), "--ids", *ids,
                                  "--out-dir", str(out), "--page-size", "25", *extra])
        return code, cap, out

    def signed_args(self):
        return ["--evidence-log", str(self.log), "--operator", self.OPERATOR, "--evidence-key", str(self.key)]

    def entries(self):
        return [json.loads(line) for line in (self.log / self.core.LOG_NAME).read_text().splitlines()]

    def verify(self, out, *extra):
        return self.run_cli(["verify", "--out-dir", str(out), "--evidence-log", str(self.log), *extra])

    def test_download_writes_signed_shared_log(self):
        self.logged_in()
        code, cap, out = self.download("5120", "9005", extra=self.signed_args())
        self.assertEqual(code, 0, cap.text)
        manifest = rx.read_manifest(out)
        entries = self.entries()
        self.assertEqual([e["extra"]["event_id"] for e in entries], ["5120", "9005"])
        for rec, e in zip(manifest, entries):
            self.assertEqual(e["sha256"], rec["sha256"])
            self.assertEqual(e["extra"]["legacy_chain_hash"], rec["chain_hash"])
            self.assertEqual(e["kind"], rx.EVIDENCE_KIND)
            self.assertEqual(e["operator"], self.OPERATOR)
            self.assertEqual(e["tool"]["name"], "ring_export")
            self.assertIsNone(e["tls_cert_sha256"])  # ring_doorbell does the HTTPS; we say so instead
            self.assertIn("ring_doorbell", e["extra"]["transport"])
            self.assertIsNotNone(e["signature"])
        head = entries[-1]["entry_hash"]
        self.assertIn(head, cap.text)
        code, cap = self.verify(out, "--public-key", str(self.pub), "--expect-head", head, "--court")
        self.assertEqual(code, 0, cap.text)
        self.assertIn("evidence log OK: 2 entries", cap.text)
        self.assertIn("signed", cap.text)

    def test_metadata_edit_detected_by_verify(self):
        self.logged_in()
        code, cap, out = self.download("5120", extra=self.signed_args())
        self.assertEqual(code, 0, cap.text)
        path = self.log / self.core.LOG_NAME
        entry = self.entries()[0]
        entry["extra"]["created_at_utc"] = "2020-01-01T00:00:00.000Z"
        path.write_bytes(self.core.canonical(entry) + b"\n")
        self.assertEqual(rx.verify_dir(out), [])  # the legacy manifest is untouched...
        code, cap = self.verify(out, "--public-key", str(self.pub))
        self.assertEqual(code, 1)  # ...but the shared log catches the edit
        self.assertIn("entry edited", cap.text)

    def test_operator_required_before_ring_is_contacted(self):
        self.logged_in()
        code, cap, out = self.download("5120", extra=["--evidence-log", str(self.log)])
        self.assertEqual(code, 2)
        self.assertIn("operator", cap.text)
        self.assertEqual(FakeAuth.instances, [])
        self.assertEqual(self.front.download_calls, [])
        os.environ[self.core.ENV_OPERATOR] = self.OPERATOR
        code, cap, out = self.download("5120", extra=["--evidence-log", str(self.log)])
        self.assertEqual(code, 0, cap.text)
        self.assertIsNone(self.entries()[0]["signature"])

    def test_verify_cross_checks_log_against_manifest(self):
        # review 2026-10-16: a valid log of other recordings verified next to an unrelated directory.
        self.logged_in()
        code, cap, out = self.download("5120", extra=self.signed_args())
        self.assertEqual(code, 0, cap.text)
        other = self.dir / "other"
        rx.write_token_file(self.token_file, REFRESH_1)
        code, cap = self.run_cli(["download", "--token-file", str(self.token_file), "--ids", "5119",
                                  "--out-dir", str(other), "--page-size", "25"])
        self.assertEqual(code, 0, cap.text)
        self.assertEqual(rx.verify_dir(other), [])
        code, cap = self.verify(other, "--public-key", str(self.pub))
        self.assertEqual(code, 1, cap.text)
        self.assertIn("not in the evidence log", cap.text)
        self.assertIn("WARN", cap.text)  # the log's 5120 entry is not in this manifest
        code, cap = self.verify(out, "--public-key", str(self.pub))
        self.assertEqual(code, 0, cap.text)
        # a rebuilt manifest for the same event no longer matches the logged chain_hash
        for p in out.iterdir():
            p.unlink()
        with mock.patch.object(rx, "utc_now", lambda: NOW + timedelta(days=1)):
            rx.write_token_file(self.token_file, REFRESH_1)
            code, cap, out = self.download("5120")
        self.assertEqual(code, 0, cap.text)
        code, cap = self.verify(out, "--public-key", str(self.pub))
        self.assertEqual(code, 1, cap.text)
        self.assertIn("disagrees on legacy_chain_hash", cap.text)

    def test_verify_flags_need_evidence_log(self):
        self.logged_in()
        _, _, out = self.download("5120")
        code, cap = self.run_cli(["verify", "--out-dir", str(out), "--court"])
        self.assertEqual(code, 2)


class LibraryShapeTests(unittest.TestCase):
    """Optional: check the fakes still match the real library's signatures."""

    @unittest.skipUnless(
        __import__("importlib").util.find_spec("ring_doorbell") is not None,
        "ring_doorbell not installed",
    )
    def test_real_signatures(self):  # pragma: no cover - environment dependent
        import inspect

        from ring_doorbell import Auth
        from ring_doorbell.doorbot import RingDoorBell
        from ring_doorbell.generic import RingGeneric

        auth_params = list(inspect.signature(Auth.__init__).parameters)
        self.assertEqual(auth_params[1:4], ["user_agent", "token", "token_updater"])
        self.assertIn("otp_code", inspect.signature(Auth.async_fetch_token).parameters)
        self.assertTrue(hasattr(Auth, "async_refresh_tokens"))
        hist = inspect.signature(RingGeneric.async_history).parameters
        self.assertIn("older_than", hist)
        self.assertIn("limit", hist)
        self.assertIn("recording_id", inspect.signature(RingDoorBell.async_recording_download).parameters)


if __name__ == "__main__":
    unittest.main()
