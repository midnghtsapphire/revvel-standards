"use strict";

/**
 * Monte Carlo tree search over reasoning steps.
 *
 * Selection uses UCT (Kocsis and Szepesvári): Q + c * sqrt(ln N_parent / n).
 * The EMNLP / arXiv Policy-of-Thoughts paper selects with PUCT, which mixes
 * in a policy prior. PUCT is available when `selection` is "puct" so a later
 * LoRA policy can pass priors without a second search loop. The default stays
 * UCT, which is what this work request specifies and what the tests lock.
 *
 * Fallback: a problem that never reaches a terminal throws, on purpose.
 * Swallowing that and returning the root would look like a successful empty
 * plan. What to check: `legalActions` / `isTerminal` for the problem, and
 * that `iterations` is at least 1.
 */

const DEFAULT_EXPLORATION = Math.SQRT2;
const MAX_STEPS = 64;

function uctScore(child, exploration) {
  if (child.visits === 0) return Number.POSITIVE_INFINITY;
  const parentVisits = child.parent ? child.parent.visits : child.visits;
  const exploit = child.valueSum / child.visits;
  const explore = exploration * Math.sqrt(Math.log(parentVisits) / child.visits);
  return exploit + explore;
}

/**
 * PUCT as used by the Policy-of-Thoughts paper:
 * Q + c * P * sqrt(N_parent) / (1 + n).
 * Missing priors are treated as uniform (1), not as zero, so an unset prior
 * still explores.
 */
function puctScore(child, exploration) {
  if (child.visits === 0) return Number.POSITIVE_INFINITY;
  const parentVisits = child.parent ? child.parent.visits : 0;
  const prior = child.prior == null ? 1 : child.prior;
  const exploit = child.valueSum / child.visits;
  const explore = exploration * prior * Math.sqrt(parentVisits) / (1 + child.visits);
  return exploit + explore;
}

function scoreChild(child, exploration, selection) {
  if (selection === "puct") return puctScore(child, exploration);
  return uctScore(child, exploration);
}

function fullyExpanded(node, problem) {
  const legal = problem.legalActions(node.state);
  if (legal.length === 0) return true;
  const tried = new Set(node.children.map((child) => child.action));
  return legal.every((action) => tried.has(action));
}

function bestChild(node, exploration, selection) {
  let best = node.children[0];
  let bestScore = scoreChild(best, exploration, selection);
  for (let i = 1; i < node.children.length; i += 1) {
    const child = node.children[i];
    const score = scoreChild(child, exploration, selection);
    const better = score > bestScore + 1e-12;
    // Equal scores keep the earlier child. Children are inserted in
    // legalActions order, so this tie break does not depend on object
    // identity or on heap randomness.
    const tie = Math.abs(score - bestScore) <= 1e-12 && String(child.action) < String(best.action);
    if (better || tie) {
      best = child;
      bestScore = score;
    }
  }
  return best;
}

function select(node, problem, exploration, selection) {
  let cursor = node;
  while (!problem.isTerminal(cursor.state) && fullyExpanded(cursor, problem) && cursor.children.length > 0) {
    cursor = bestChild(cursor, exploration, selection);
  }
  return cursor;
}

function expand(node, problem, priorFor) {
  if (problem.isTerminal(node.state)) return node;
  const tried = new Set(node.children.map((child) => child.action));
  const untried = problem.legalActions(node.state).filter((action) => !tried.has(action));
  if (untried.length === 0) return node;
  const action = untried[0];
  const child = {
    state: problem.next(node.state, action),
    parent: node,
    action,
    prior: priorFor ? priorFor(node.state, action) : null,
    children: [],
    visits: 0,
    valueSum: 0,
  };
  node.children.push(child);
  return child;
}

function actionsToNode(node) {
  const actions = [];
  let cursor = node;
  while (cursor.parent) {
    actions.push(cursor.action);
    cursor = cursor.parent;
  }
  return actions.reverse();
}

function rollout(node, problem) {
  const path = actionsToNode(node);
  let state = node.state;
  let guard = 0;
  while (!problem.isTerminal(state)) {
    const legal = problem.legalActions(state);
    if (legal.length === 0) {
      throw new Error("MCTS rollout has no legal action and the state is not terminal.");
    }
    const action = legal[0];
    path.push(action);
    state = problem.next(state, action);
    guard += 1;
    if (guard > MAX_STEPS) {
      throw new Error("MCTS rollout exceeded 64 steps without a terminal state.");
    }
  }
  return { path, state, reward: problem.reward(state, path) };
}

function backprop(node, reward) {
  let cursor = node;
  while (cursor) {
    cursor.visits += 1;
    cursor.valueSum += reward;
    cursor = cursor.parent;
  }
}

/**
 * Run `iterations` simulations. Returns the highest-reward completed
 * trajectory seen (earliest wins ties) plus every trajectory, which GRPO
 * uses as its group.
 */
function search(problem, options = {}) {
  const iterations = options.iterations == null ? 32 : options.iterations;
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new Error("MCTS iterations must be a positive integer.");
  }
  const exploration = options.exploration == null ? DEFAULT_EXPLORATION : options.exploration;
  const selection = options.selection || "uct";
  if (selection !== "uct" && selection !== "puct") {
    throw new Error(`Unknown MCTS selection "${selection}". Use "uct" or "puct".`);
  }
  const root = {
    state: problem.root,
    parent: null,
    action: null,
    prior: null,
    children: [],
    visits: 0,
    valueSum: 0,
  };
  const trajectories = [];
  let best = null;
  for (let i = 0; i < iterations; i += 1) {
    const selected = select(root, problem, exploration, selection);
    const expanded = expand(selected, problem, options.priorFor);
    const rolled = rollout(expanded, problem);
    backprop(expanded, rolled.reward);
    const trajectory = { path: rolled.path, reward: rolled.reward, state: rolled.state };
    trajectories.push(trajectory);
    if (!best || trajectory.reward > best.reward) best = trajectory;
  }
  if (!best) throw new Error("MCTS finished without a trajectory.");
  return {
    best,
    trajectories,
    iterations,
    selection,
    exploration,
    rootVisits: root.visits,
  };
}

module.exports = {
  DEFAULT_EXPLORATION,
  backprop,
  puctScore,
  search,
  uctScore,
};
