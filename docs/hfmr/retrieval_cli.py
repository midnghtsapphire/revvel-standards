import argparse
import json
from .retrieval import run_queue, queue_from_stac, verify_queue

p = argparse.ArgumentParser(description="HFMR automated public archive retrieval")
s = p.add_subparsers(dest="command", required=True)
a = s.add_parser("queue-stac")
a.add_argument("--inventory", required=True)
a.add_argument("--output", required=True)
a.add_argument("--allow-host", action="append", required=True)
a = s.add_parser("retrieve")
a.add_argument("--queue", required=True)
a.add_argument("--output", required=True)
a.add_argument("--allow-host", action="append", required=True)
a.add_argument("--max-mb", type=int, default=100)
a.add_argument("--max-items", type=int, default=100)
a.add_argument("--retries", type=int, default=2)
a = s.add_parser("verify")
a.add_argument("--output", required=True)
v = p.parse_args()
if v.command == "queue-stac":
    result = {"queued": queue_from_stac(v.inventory, v.output, v.allow_host)}
elif v.command == "retrieve":
    result = run_queue(v.queue, v.output, v.allow_host, v.max_mb * 1024 * 1024, v.max_items, v.retries)
else:
    result = verify_queue(v.output)
print(json.dumps(result, indent=2))
# Exit status reflects the outcome, not just that the command ran: any row that was not
# downloaded or already verified (failed, integrity_failure, stale_manifest) is nonzero,
# as is a verify run that checked nothing or found a mismatch.
if v.command == "retrieve" and any(r["status"] not in ("downloaded", "already_verified") for r in result):
    raise SystemExit(2)
if v.command == "verify" and not (result and all(result.values())):
    raise SystemExit(1)
