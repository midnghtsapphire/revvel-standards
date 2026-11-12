#!/usr/bin/env python3
"""a2a_bus.py — file-backed A2A message bus. WR #18340.
Usage: a2a_bus.py send --from scout --to scribe --skill write.chapter --payload '{}' 
       a2a_bus.py poll --agent scribe | ack <task_id> --state completed | replay"""
import json, sys, os, uuid, argparse, datetime

BUS = os.environ.get("A2A_BUS", "artifacts/a2a_bus.jsonl")

def append(ev):
    os.makedirs(os.path.dirname(BUS), exist_ok=True)
    with open(BUS, "a") as f: f.write(json.dumps(ev) + "\n")

def load():
    if not os.path.exists(BUS): return []
    return [json.loads(l) for l in open(BUS) if l.strip()]

def cmd_send(a):
    ev = {"task_id": str(uuid.uuid4()), "from": a.src, "to": a.to, "skill": a.skill,
          "payload": json.loads(a.payload), "state": "submitted",
          "trace": a.trace, "ts": datetime.datetime.utcnow().isoformat() + "Z"}
    append(ev); print(ev["task_id"])

def cmd_poll(a):
    tasks = {}
    for ev in load():
        if ev.get("to") == a.agent or ev.get("from") == a.agent:
            tasks[ev["task_id"]] = ev  # last write wins
    mine = [t for t in tasks.values() if t["to"] == a.agent and t["state"] == "submitted"]
    print(json.dumps(mine, indent=2))

def cmd_ack(a):
    append({"task_id": a.task_id, "state": a.state, "note": a.note or "",
            "ts": datetime.datetime.utcnow().isoformat() + "Z"})

def cmd_replay(_):
    for ev in load(): print(json.dumps(ev))

p = argparse.ArgumentParser(); sub = p.add_subparsers(dest="cmd", required=True)
s = sub.add_parser("send"); s.add_argument("--from", dest="src", required=True)
s.add_argument("--to", required=True); s.add_argument("--skill", required=True)
s.add_argument("--payload", default="{}"); s.add_argument("--trace", default="manual")
s.set_defaults(f=cmd_send)
s = sub.add_parser("poll"); s.add_argument("--agent", required=True); s.set_defaults(f=cmd_poll)
s = sub.add_parser("ack"); s.add_argument("task_id"); s.add_argument("--state", default="completed")
s.add_argument("--note", default=""); s.set_defaults(f=cmd_ack)
s = sub.add_parser("replay"); s.set_defaults(f=cmd_replay)
a = p.parse_args(); a.f(a)
