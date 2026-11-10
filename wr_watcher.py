# RETIRED 2026-11-10 by Codex - #18313 - preserved simulator; use oaudrey HULL SkillRouter local execution.
# This demo advanced through sleep() stages and marked work done without running tests or delivery.
# Every original line is preserved below as a comment. No simulated completion runs from this root file.
# #!/usr/bin/env python3
# """
# WR Watcher — bridges GitHub Work Requests to the live fleet.
# Scans wr/ for unclaimed WR-*.md files, claims them (rename to .processing),
# reports the whole lifecycle to fleet-status.json so the oaudrey.com
# dashboard shows a WR moving through the fleet in real time.
#
# Interview mode: create a WR file (or GitHub Issue labeled 'wr'), run this
# watcher, point the browser at the fleet page. The room watches it work.
#
# States:  WR-xxx.md (queued) -> WR-xxx.md.processing (fleet has it)
#          -> WR-xxx.md.done.YYYY-MM-DD (complete, report attached)
# """
#
# import json
# import re
# import time
# from pathlib import Path
#
# WORKSPACE_DIR = Path("./manuscript_workspace")
# WR_DIR = Path("./wr")
# STATUS_PATH = WORKSPACE_DIR / "fleet-status.json"
# POLL_SECONDS = 10
#
# FLEET_STAGES = [
#     ("scout", "triaging requirements"),
#     ("scribe", "drafting deliverable"),
#     ("linter", "running regression checks"),
#     ("packager", "packaging artifact"),
#     ("courier", "committing + syncing"),
# ]
#
#
# def load_status() -> dict:
#     if STATUS_PATH.exists():
#         try:
#             return json.loads(STATUS_PATH.read_text())
#         except Exception:
#             pass
#     return {"agents": [], "last_cycle": {}}
#
#
# def set_wr_stage(wr_id: str, title: str, stage_idx: int, state="working"):
#     """Write the WR's current stage into fleet-status.json."""
#     status = load_status()
#     agents = {a["id"]: a for a in status.get("agents", [])}
#     # everyone else idle during WR focus
#     for a in agents.values():
#         a["state"], a["task"] = "idle", ""
#     if 0 <= stage_idx < len(FLEET_STAGES):
#         agent_id, task = FLEET_STAGES[stage_idx]
#         if agent_id in agents:
#             agents[agent_id]["state"] = state
#             agents[agent_id]["task"] = f"{wr_id}: {task}"
#     status["agents"] = list(agents.values())
#     status["updated"] = time.strftime("%H:%M %Z")
#     status["active_wr"] = {"id": wr_id, "title": title,
#                            "stage": FLEET_STAGES[stage_idx][0] if 0 <= stage_idx < len(FLEET_STAGES) else "done"}
#     STATUS_PATH.write_text(json.dumps(status, indent=2))
#
#
# def parse_wr(path: Path) -> tuple:
#     """Extract WR id + title from a WR file."""
#     text = path.read_text(errors="replace")
#     wr_id = path.stem.split(".")[0]
#     m = re.search(r"^#\s*(?:Title[:\s]*)?(.+)$", text, re.M)
#     title = m.group(1).strip()[:60] if m else wr_id
#     return wr_id, title
#
#
# def process_wr(path: Path):
#     wr_id, title = parse_wr(path)
#     claimed = path.with_name(path.name + ".processing")
#     path.rename(claimed)
#     print(f"[*] WR claimed: {wr_id} — {title}")
#     for i in range(len(FLEET_STAGES)):
#         set_wr_stage(wr_id, title, i)
#         time.sleep(4)  # in production, each stage is a real daemon step
#     done = claimed.with_name(
#         claimed.name.replace(".processing", f".done.{time.strftime('%Y-%m-%d')}"))
#     claimed.rename(done)
#     set_wr_stage(wr_id, title, -1, state="idle")
#     print(f"[+] WR complete: {wr_id} -> {done.name}")
#
#
# def main():
#     print(f"[*] WR watcher online — scanning {WR_DIR}/ every {POLL_SECONDS}s")
#     print("[*] Drop WR-*.md files (or use GitHub Issues labeled 'wr') to dispatch the fleet.")
#     while True:
#         if WR_DIR.exists():
#             for p in sorted(WR_DIR.glob("WR-*.md")):
#                 if not p.name.endswith((".processing",)) and ".done." not in p.name:
#                     try:
#                         process_wr(p)
#                     except Exception as e:
#                         print(f"[-] WR failed {p.name}: {e}")
#         time.sleep(POLL_SECONDS)
#
#
# if __name__ == "__main__":
#     main()
