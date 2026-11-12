#!/usr/bin/env python3
"""lago_sync.py — push usage events to Lago. WR #18333."""
import os, json, glob, uuid, datetime, urllib.request

LAGO_URL = os.environ.get("LAGO_API_URL", "http://localhost:3000")
KEY = os.environ.get("LAGO_API_KEY", "")

def push(event):
    req = urllib.request.Request(f"{LAGO_URL}/api/v1/events", method="POST",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        data=json.dumps({"event": event}).encode())
    return urllib.request.urlopen(req, timeout=15).status

def main():
    sent = 0
    for f in glob.glob("artifacts/usage/*.jsonl"):
        for line in open(f):
            u = json.loads(line)
            ev = {"transaction_id": u.get("id", str(uuid.uuid4())),
                  "external_customer_id": u.get("project", "internal"),
                  "code": u.get("metric", "llm_call"),
                  "timestamp": u.get("ts", datetime.datetime.utcnow().isoformat() + "Z")}
            if KEY:
                push(ev); sent += 1
            else:
                print("dry-run:", ev)
    print(f"✔ {sent} events pushed")

if __name__ == "__main__": main()
