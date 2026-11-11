"""Durable WR lifecycle using LangGraph, with bounded healing (#18337).

Actions are supplied by the existing pipeline, rather than creating a second
executor. Deployment is interrupted for a recorded human decision. Actions
must be idempotent: a worker can restart after an external effect but before
the corresponding checkpoint commits.
"""
from __future__ import annotations
from contextlib import contextmanager
from typing import Callable, TypedDict


class WorkState(TypedDict, total=False):
    issue: int
    attempts: int
    test_passed: bool
    approved: bool
    status: str
    failure: str
    action_ok: bool
    receipts: list[dict]


def build_workflow(actions: dict[str, Callable], checkpointer, max_attempts: int = 3):
    from langgraph.graph import StateGraph, START, END
    from langgraph.types import interrupt
    required = {"intake", "research", "build", "test", "heal", "deploy"}
    if required - actions.keys():
        raise ValueError(f"Missing lifecycle actions: {sorted(required - actions.keys())}")
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    builder = StateGraph(WorkState)
    for name in required:
        def execute(state, action=name):
            update = dict(actions[action](dict(state)))
            update["status"] = action
            if action == "build":
                update["attempts"] = state.get("attempts", 0) + 1
            if action == "test" and not isinstance(update.get("test_passed"), bool):
                raise ValueError("test action must return boolean test_passed")
            return update
        builder.add_node(name, execute)

    def review(state):
        approved = interrupt({"issue": state["issue"], "action": "approve-deployment"})
        # A structured/nonboolean response must never accidentally authorize deploy.
        return {"approved": approved is True, "status": "reviewed"}

    builder.add_node("review", review)
    builder.add_edge(START, "intake")
    builder.add_edge("intake", "research")
    builder.add_edge("research", "build")
    # 2026-11-10: preserve legacy unconditional edge; HULL failures must halt.
    # builder.add_edge("build", "test")
    builder.add_conditional_edges("build", lambda state: "test" if state.get("action_ok", True) else END)
    # 2026-11-10: rejected/timed-out HULL tests halt instead of attempting healing.
    # Original: lambda state: "review" if state["test_passed"]
    # else "heal" if state["attempts"] < max_attempts else END
    builder.add_conditional_edges(
        "test", lambda state: END if state.get("failure") else "review" if state["test_passed"]
        else "heal" if state["attempts"] < max_attempts else END)
    # 2026-11-10: a failed/rejected healing command cannot authorize another build.
    # builder.add_edge("heal", "build")
    builder.add_conditional_edges("heal", lambda state: "build" if state.get("action_ok", True) else END)
    builder.add_conditional_edges("review", lambda state: "deploy" if state["approved"] else END)
    builder.add_edge("deploy", END)
    return builder.compile(checkpointer=checkpointer)


@contextmanager
def persistent_workflow(actions: dict[str, Callable], database: str, max_attempts: int = 3):
    """Keep SQLite open for the graph lifetime, including resumed invocations."""
    from langgraph.checkpoint.sqlite import SqliteSaver
    with SqliteSaver.from_conn_string(database) as saver:
        yield build_workflow(actions, saver, max_attempts)


class HullActions:
    """Adapt an existing HULL router; never execute commands outside its policy.

    Skill names and policy are operator configuration, never selected from logs.
    Intake/research record metadata only. Healing is optional and fails closed.
    External effects remain at-least-once across checkpoint commit failures.
    """

    def __init__(self, router, skills: dict[str, str], *, policy_path, receipt_dir):
        from pathlib import Path
        allowed = {"build", "test", "heal", "deploy"}
        if set(skills) - allowed or not {"build", "test", "deploy"} <= skills.keys():
            raise ValueError("Map build, test and deploy; only heal is optional")
        if any(not isinstance(value, str) or not value for value in skills.values()):
            raise ValueError("Skill names must be nonempty strings")
        self.router = router
        self.skills = dict(skills)
        self.policy_path = Path(policy_path)
        self.receipt_dir = Path(receipt_dir)

    def actions(self):
        result = {"intake": lambda state: {}, "research": lambda state: {}}
        for name in ("build", "test", "heal", "deploy"):
            result[name] = self._action(name)
        return result

    def _action(self, name):
        def run(state):
            skill = self.skills.get(name)
            if skill is None:
                return {"action_ok": False, "failure": "No approved healing skill"}
            receipt = self.router.execute_local(
                skill, {"issue": state["issue"], "attempt": state.get("attempts", 0)},
                policy_path=self.policy_path, receipt_dir=self.receipt_dir)
            succeeded = receipt.get("status") == "succeeded"
            # Ordinary test failure can enter bounded healing. Rejection/timeout
            # cannot: neither proves that the approved test actually completed.
            retryable_test = name == "test" and receipt.get("status") == "failed"
            update = {
                "action_ok": succeeded,
                "failure": "" if succeeded or retryable_test else f"HULL {name}: {receipt.get('status')}",
                "receipts": [*state.get("receipts", []), {
                    "action": name, "run_id": receipt["run_id"],
                    "status": receipt["status"], "receipt_path": receipt["receipt_path"],
                }],
            }
            if name == "test":
                update["test_passed"] = succeeded
            return update
        return run


def main(argv=None):
    """Opt-in local CLI; explicit existing HULL source and operator policy only."""
    import argparse
    from contextlib import redirect_stdout
    import importlib
    import json
    import sys
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hull-source', type=Path, required=True)
    parser.add_argument('--skills-dir', type=Path, required=True)
    parser.add_argument('--mapping', type=Path, required=True)
    parser.add_argument('--policy', type=Path, required=True)
    parser.add_argument('--receipts', type=Path, required=True)
    parser.add_argument('--database', required=True)
    parser.add_argument('--thread', required=True)
    parser.add_argument('--max-attempts', type=int, default=3)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--issue', type=int)
    mode.add_argument('--resume', choices=('continue', 'approve', 'deny'))
    args = parser.parse_args(argv)
    source = (args.hull_source / 'orchestrator').resolve(strict=True)
    sys.path.insert(0, str(source))
    module = importlib.import_module('metal_orchestrator.router')
    if not Path(module.__file__).resolve().is_relative_to(source):
        raise ValueError('Imported HULL router differs from explicit source')
    router = module.SkillRouter(args.skills_dir)
    with redirect_stdout(sys.stderr):
        router.discover()
    adapter = HullActions(router, json.loads(args.mapping.read_text(encoding='utf-8')),
                          policy_path=args.policy, receipt_dir=args.receipts)
    config = {'configurable': {'thread_id': args.thread}}
    with persistent_workflow(adapter.actions(), args.database, args.max_attempts) as graph:
        snapshot = graph.get_state(config)
        if args.issue is not None:
            if snapshot.values:
                raise ValueError('Thread already exists; use explicit resume or a fresh thread')
            payload = {'issue': args.issue}
        else:
            if not snapshot.values or not snapshot.next:
                raise ValueError('No unfinished checkpoint to resume')
            interrupted = bool(snapshot.tasks and any(task.interrupts for task in snapshot.tasks))
            if (args.resume != 'continue') != interrupted:
                raise ValueError('Approval/denial requires a pending review; continue requires ordinary recovery')
            from langgraph.types import Command
            payload = Command(resume=args.resume == 'approve') if interrupted else None
        result = graph.invoke(payload, config)
    print(json.dumps({'thread': args.thread, 'status': result.get('status'),
                      'awaiting_review': '__interrupt__' in result,
                      'failure': result.get('failure', ''), 'receipts': result.get('receipts', [])}))
    return 1 if result.get('failure') or result.get('test_passed') is False else 0


if __name__ == '__main__':
    raise SystemExit(main())
