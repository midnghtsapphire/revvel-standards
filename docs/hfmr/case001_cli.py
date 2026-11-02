import argparse
import json
from .case001_live import run

p = argparse.ArgumentParser(description="Case001 public Columbus permit acquisition")
p.add_argument("--output", required=True)
p.add_argument("--number", type=int, default=1546)
p.add_argument("--street", default="HIGH")
p.add_argument("--start", type=int, default=2000)
p.add_argument("--end", type=int, default=2010)
a = p.parse_args()
# Original: print(json.dumps(run(a.output, a.number, a.street, a.start, a.end), indent=2))
#   it exited 0 even when run() reported retrieval_complete: false, so `&&` could not gate verify.
result = run(a.output, a.number, a.street, a.start, a.end)
print(json.dumps(result, indent=2))
raise SystemExit(0 if result["retrieval_complete"] else 2)
