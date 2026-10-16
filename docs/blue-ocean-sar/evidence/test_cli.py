"""CLI exit codes and end-to-end flow (keygen, capture, timestamp, verify, import).

Run from this folder:  python3 -m unittest -v
"""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from evidence import cli, core  # noqa: E402


class CLI(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.log = os.path.join(self.tmp, "case")
        self.priv = os.path.join(self.tmp, "op.key")
        self.pub = os.path.join(self.tmp, "op.pub")
        self.saved_env = os.environ.pop(core.ENV_OPERATOR, None)

    def tearDown(self):
        if self.saved_env is not None:
            os.environ[core.ENV_OPERATOR] = self.saved_env
        for root, _, files in os.walk(self.tmp):
            for name in files:
                os.chmod(os.path.join(root, name), 0o600)
        shutil.rmtree(self.tmp)

    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        code = cli.main(list(argv), out=out, err=err)
        return code, out.getvalue(), err.getvalue()

    def file(self, name, data):
        p = os.path.join(self.tmp, name)
        with open(p, "wb") as f:
            f.write(data)
        return p

    def keygen(self):
        code, out, _ = self.run_cli("keygen", "--private", self.priv, "--public", self.pub)
        self.assertEqual(code, 0, out)

    def capture(self, data=b"report bytes", *extra):
        return self.run_cli("capture", "--log", self.log, "--operator", "Det. A. Example", "--key", self.priv,
                            "--file", self.file("in.bin", data), "--kind", "records-response", *extra)

    def test_signed_capture_and_verify(self):
        self.keygen()
        self.assertEqual(self.capture()[0], 0)
        self.assertEqual(self.capture(b"second")[0], 0)
        code, out, _ = self.run_cli("verify", "--log", self.log, "--public-key", self.pub)
        self.assertEqual(code, 0, out)
        self.assertIn("OK: 2 entries", out)

    def test_tamper_gives_exit_1(self):
        self.keygen()
        self.capture()
        path = os.path.join(self.log, core.LOG_NAME)
        with open(path, "rb") as f:
            text = f.read()
        with open(path, "wb") as f:
            f.write(text.replace(b"Det. A. Example", b"Det. B. Example"))
        code, out, _ = self.run_cli("verify", "--log", self.log, "--public-key", self.pub)
        self.assertEqual(code, 1)
        self.assertIn("problem:", out)

    def test_bad_input_gives_exit_2(self):
        self.assertEqual(self.run_cli("verify", "--log", os.path.join(self.tmp, "nope"))[0], 2)
        self.assertEqual(self.run_cli("verify")[0], 2)
        self.assertEqual(self.run_cli("verify", "--log", self.tmp, "--expect-head", "xyz")[0], 2)
        self.assertEqual(self.run_cli("capture", "--log", self.log, "--stdin", "--kind", "k")[0], 2,
                         "no operator")
        self.keygen()
        self.assertEqual(self.run_cli("verify", "--log", self.log, "--public-key", self.priv)[0], 2)

    def test_operator_from_environment(self):
        os.environ[core.ENV_OPERATOR] = "Env Operator"
        code, _, err = self.run_cli("capture", "--log", self.log, "--file", self.file("a", b"a"), "--kind", "k")
        self.assertEqual(code, 0, err)
        self.assertEqual(core.EvidenceLog(self.log).read_entries()[0]["operator"], "Env Operator")

    def test_court_mode_exit_codes(self):
        self.keygen()
        self.capture()
        code, out, _ = self.run_cli("verify", "--log", self.log, "--public-key", self.pub, "--court")
        self.assertEqual(code, 1)
        self.assertIn("court mode needs", out)
        code, out, _ = self.run_cli("head", "--log", self.log)
        head = out.split("head ")[1].strip()
        code, out, _ = self.run_cli("verify", "--log", self.log, "--public-key", self.pub, "--court",
                                    "--expect-head", head, "--json")
        self.assertEqual(code, 0, out)
        self.assertTrue(json.loads(out)["ok"])

    def test_passphrase_file(self):
        pw = self.file("pw", b"long passphrase\n")
        code, _, _ = self.run_cli("keygen", "--private", self.priv, "--public", self.pub, "--passphrase-file", pw)
        self.assertEqual(code, 0)
        self.assertEqual(self.capture()[0], 2, "encrypted key without passphrase is bad input")
        self.assertEqual(self.capture(b"x", "--passphrase-file", pw)[0], 0)

    def test_timestamp_with_no_reachable_tsa_is_exit_1(self):
        self.keygen()
        self.capture()
        code, out, _ = self.run_cli("timestamp", "--log", self.log, "--tsa", "http://127.0.0.1:9/tsr",
                                    "--timeout", "2")
        self.assertEqual(code, 1)
        self.assertIn("timestamp failed", out)

    def test_import_reports_lacks(self):
        led = os.path.join(self.tmp, "ledger.jsonl")
        rec = {"sequence": 0, "previous_hash": "0" * 64, "event": {"x": 1}}
        rec["entry_hash"] = core.sha256_hex(json.dumps(rec, sort_keys=True, separators=(",", ":")).encode())
        with open(led, "w") as f:
            f.write(json.dumps(rec) + "\n")
        code, out, _ = self.run_cli("import", led)
        self.assertEqual(code, 0, out)
        self.assertIn("VERIFIED", out)
        self.assertIn("lacks signed", out)
        code, out, err = self.run_cli("import", led, "--into", self.log, "--operator", "Analyst")
        self.assertEqual(code, 0, out + err)
        self.assertEqual(len(core.EvidenceLog(self.log).read_entries()), 1)

    def test_runs_as_module_and_as_script(self):
        env = dict(os.environ, PYTHONPATH="")
        script = os.path.join(HERE, "cli.py")
        for argv in ([sys.executable, "-m", "evidence", "--help"], [sys.executable, script, "--help"]):
            p = subprocess.run(argv, cwd=os.path.dirname(HERE), capture_output=True, text=True, env=env, check=False)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("verify", p.stdout)


if __name__ == "__main__":
    unittest.main()
