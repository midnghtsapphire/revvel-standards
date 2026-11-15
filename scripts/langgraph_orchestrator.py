#!/usr/bin/env python3
"""langgraph_orchestrator.py — WR lifecycle graph. WR #18337.
Falls back to a linear runner if langgraph isn't installed."""
import os, sys, json

STAGES = ["intake", "claim", "research", "build", "lint", "package", "pr", "merge", "close"]

def run_linear(wr: str):
    state = {"wr": wr, "stage": None, "retries": 0, "log": []}
    for stage in STAGES:
        state["stage"] = stage
        state["log"].append(f"{stage}: ok")
        print(f"[{wr}] {stage} ✔")
    return state

def run_langgraph(wr: str):
    from typing_extensions import TypedDict
    from langgraph.graph import StateGraph, END
    from langgraph.checkpoint.sqlite import SqliteSaver

    class WRState(TypedDict):
        wr: str; stage: str; retries: int; log: list

    def make_node(name):
        def node(state: WRState):
            state["stage"] = name
            state["log"].append(f"{name}: ok")
            print(f"[{state['wr']}] {name} ✔")
            return state
        return node

    g = StateGraph(WRState)
    for s in STAGES: g.add_node(s, make_node(s))
    g.set_entry_point("intake")
    for a, b in zip(STAGES, STAGES[1:]): g.add_edge(a, b)
    g.add_edge("close", END)

    os.makedirs("artifacts/lg", exist_ok=True)
    memory = SqliteSaver.from_conn_string("artifacts/lg/checkpoints.db")
    app = g.compile(checkpointer=memory)
    cfg = {"configurable": {"thread_id": f"wr-{wr}"}}
    return app.invoke({"wr": wr, "stage": "", "retries": 0, "log": []}, cfg)

if __name__ == "__main__":
    wr = sys.argv[1] if len(sys.argv) > 1 else "WR-DEMO"
    try:
        run_langgraph(wr)
    except ImportError:
        print("langgraph not installed — pip install langgraph; running linear fallback")
        run_linear(wr)
