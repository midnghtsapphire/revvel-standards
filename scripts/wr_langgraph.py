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
    builder.add_edge("build", "test")
    builder.add_conditional_edges("test", lambda state: "review" if state["test_passed"]
                                  else "heal" if state["attempts"] < max_attempts else END)
    builder.add_edge("heal", "build")
    builder.add_conditional_edges("review", lambda state: "deploy" if state["approved"] else END)
    builder.add_edge("deploy", END)
    return builder.compile(checkpointer=checkpointer)


@contextmanager
def persistent_workflow(actions: dict[str, Callable], database: str, max_attempts: int = 3):
    """Keep SQLite open for the graph lifetime, including resumed invocations."""
    from langgraph.checkpoint.sqlite import SqliteSaver
    with SqliteSaver.from_conn_string(database) as saver:
        yield build_workflow(actions, saver, max_attempts)
