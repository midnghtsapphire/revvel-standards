import argparse
import json
from .case001_acquire import acquire

p = argparse.ArgumentParser()
p.add_argument("--output", required=True)
p.add_argument("--number", type=int, default=1546)
p.add_argument("--street", default="HIGH")
p.add_argument("--start", type=int, default=2000)
p.add_argument("--end", type=int, default=2010)
v = p.parse_args()
# Original: print(json.dumps(acquire(v.output, v.number, v.street, v.start, v.end), indent=2))
#   it exited 0 even when acquire() reported retrieval_complete: false.
result = acquire(v.output, v.number, v.street, v.start, v.end)
print(json.dumps(result, indent=2))
raise SystemExit(0 if result["retrieval_complete"] else 2)
