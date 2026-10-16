import argparse
import json
from .records_followup import write_packet

p = argparse.ArgumentParser(description="Prepare documented construction records follow-up packet")
p.add_argument("--report", required=True)
p.add_argument("--output", required=True)
p.add_argument("--address", default="1546 N High St, Columbus, OH")
p.add_argument("--start", type=int, default=2000)
p.add_argument("--end", type=int, default=2010)
a = p.parse_args()
print(json.dumps(write_packet(a.report, a.output, a.address, a.start, a.end), indent=2))
