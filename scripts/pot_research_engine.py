#!/usr/bin/env python3
"""pot_research_engine.py — PoT research engine with MCTS + GRPO. WR #18341.
Offline-capable skeleton: real LLM calls when LLM_API_KEY set, else deterministic
dry-run so CI can validate the tree logic."""
import os, math, json, random, datetime, urllib.request

MAX_CALLS = 64
calls = {"n": 0}

def llm(prompt: str) -> str:
    calls["n"] += 1
    if calls["n"] > MAX_CALLS: raise RuntimeError("budget exceeded")
    key = os.environ.get("LLM_API_KEY")
    if not key:
        random.seed(hash(prompt) & 0xffffffff)
        return f"[dry-run answer {random.randint(1000,9999)}]"
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        data=json.dumps({"model": "anthropic/claude-sonnet-4-6",
                         "messages": [{"role": "user", "content": prompt}]}).encode())
    return json.load(urllib.request.urlopen(req, timeout=60))["choices"][0]["message"]["content"]

class Node:
    def __init__(self, question, parent=None):
        self.question, self.parent = question, parent
        self.children, self.visits, self.value = [], 0, 0.0
        self.answer = None

def uct(node, c=1.41):
    if node.visits == 0: return float("inf")
    return node.value / node.visits + c * math.sqrt(math.log(node.parent.visits or 1) / node.visits)

def mcts(root, iterations=16):
    for _ in range(iterations):
        node = root
        while node.children: node = max(node.children, key=uct)          # select
        if node.visits > 0:                                              # expand
            subs = [s.strip("- ") for s in llm(f"Break into 4 sub-questions: {node.question}").splitlines() if s.strip()][:4]
            for s in subs: node.children.append(Node(s, node))
            if node.children: node = node.children[0]
        node.answer = llm(f"Answer concisely with evidence: {node.question}")  # simulate
        score = min(1.0, len(node.answer) / 500.0)                       # rubric proxy
        while node:                                                      # backprop
            node.visits += 1; node.value += score; node = node.parent

def grpo_update(node, group=4):
    """Group-relative scoring of candidate continuations (policy signal)."""
    if not node.children: return
    cands = [llm(f"Refine: {c.question}") for c in node.children[:group]]
    scores = [min(1.0, len(c) / 500.0) for c in cands]
    mean = sum(scores) / len(scores)
    for c, s in zip(node.children[:group], scores):
        c.value += (s - mean)  # group-relative advantage
    return {"mean": mean, "n": len(cands)}

def run(seed: str):
    root = Node(seed)
    mcts(root)
    updates = []
    def walk(n, d=0):
        if d < 3:
            upd = grpo_update(n)
            if upd: updates.append({"node": n.question[:60], **upd})
            for c in n.children: walk(c, d + 1)
    walk(root)
    os.makedirs("artifacts/pot", exist_ok=True)
    out = f"artifacts/pot/{datetime.date.today()}-research.json"
    def ser(n): return {"q": n.question, "visits": n.visits, "value": round(n.value, 3),
                        "answer": (n.answer or "")[:200], "children": [ser(c) for c in n.children]}
    json.dump({"seed": seed, "tree": ser(root), "grpo": updates, "llm_calls": calls["n"]},
              open(out, "w"), indent=2)
    print(f"✔ tree explored ({calls['n']} LLM calls) → {out}")

if __name__ == "__main__":
    import sys
    run(sys.argv[1] if len(sys.argv) > 1 else "What should the fleet research next?")
