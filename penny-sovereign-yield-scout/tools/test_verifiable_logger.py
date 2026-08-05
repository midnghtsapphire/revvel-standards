
import unittest
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

# Mock rich before importing verifiable_logger
mock_rich = MagicMock()
sys.modules["rich"] = mock_rich
sys.modules["rich.console"] = mock_rich
sys.modules["rich.table"] = mock_rich
sys.modules["rich.progress"] = mock_rich

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.verifiable_logger import VerifiableLogger

class TestVerifiableLogger(unittest.TestCase):
    def setUp(self):
        self.test_log = Path("test_audit_log.jsonl")
        if self.test_log.exists():
            self.test_log.unlink()

    def tearDown(self):
        if self.test_log.exists():
            self.test_log.unlink()

    def test_read_last_hash_empty_file(self):
        # Create empty file
        self.test_log.touch()
        logger = VerifiableLogger(log_file=self.test_log)
        self.assertEqual(logger._read_last_hash(), "0" * 64)

    def test_read_last_hash_one_entry(self):
        logger = VerifiableLogger(log_file=self.test_log)
        expected_hash = logger.log("EVENT1", {"foo": "bar"})

        # New logger instance to trigger _read_last_hash
        logger2 = VerifiableLogger(log_file=self.test_log)
        self.assertEqual(logger2._read_last_hash(), expected_hash)

    def test_read_last_hash_multiple_entries(self):
        logger = VerifiableLogger(log_file=self.test_log)
        logger.log("EVENT1", {"a": 1})
        expected_hash = logger.log("EVENT2", {"b": 2})

        logger2 = VerifiableLogger(log_file=self.test_log)
        self.assertEqual(logger2._read_last_hash(), expected_hash)

    def test_read_last_hash_with_trailing_newlines(self):
        logger = VerifiableLogger(log_file=self.test_log)
        logger.log("EVENT1", {"a": 1})
        expected_hash = logger.log("EVENT2", {"b": 2})

        with open(self.test_log, "a") as f:
            f.write("\n\n\n")

        logger2 = VerifiableLogger(log_file=self.test_log)
        self.assertEqual(logger2._read_last_hash(), expected_hash)

    def test_read_last_hash_malformed_last_line(self):
        logger = VerifiableLogger(log_file=self.test_log)
        expected_hash = logger.log("EVENT1", {"a": 1})

        with open(self.test_log, "a") as f:
            f.write("NOT_JSON\n")

        logger2 = VerifiableLogger(log_file=self.test_log)
        # Should skip malformed line and find the previous valid one
        self.assertEqual(logger2._read_last_hash(), expected_hash)

    def test_read_last_hash_no_entry_hash_key(self):
        logger = VerifiableLogger(log_file=self.test_log)
        expected_hash = logger.log("EVENT1", {"a": 1})

        with open(self.test_log, "a") as f:
            f.write('{"event": "NO_HASH"}\n')

        logger2 = VerifiableLogger(log_file=self.test_log)
        # Should skip entry without entry_hash and find the previous valid one
        self.assertEqual(logger2._read_last_hash(), expected_hash)

    def test_concurrent_writes_preserve_chain(self):
        """Concurrent log() calls must produce a valid, unbroken hash chain."""
        import threading

        logger = VerifiableLogger(log_file=self.test_log)
        num_threads = 10
        writes_per_thread = 20

        def writer(tid: int) -> None:
            for i in range(writes_per_thread):
                logger.log("EVENT", {"tid": tid, "i": i})

        threads = [threading.Thread(target=writer, args=(t,)) for t in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Verify every line is valid JSON and the prev_hash chain is intact
        prev_hash = "0" * 64
        count = 0
        with open(self.test_log, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                self.assertEqual(entry["prev_hash"], prev_hash)
                prev_hash = entry["entry_hash"]
                count += 1

        self.assertEqual(count, num_threads * writes_per_thread)

if __name__ == "__main__":
    unittest.main()
