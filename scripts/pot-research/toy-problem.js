"use strict";

/**
 * A two-step trap used to prove search, not to stand in for a research
 * benchmark.
 *
 * The left branch looks better one step ahead (immediate 5 vs 1) and ends at
 * reward 7. The right branch looks worse one step ahead and ends at reward
 * 21. A linear walk that trusts the immediate score commits to the left
 * branch and never comes back. MCTS, scoring terminals, can come back.
 *
 * The optimum is part of the problem definition so tests and the linear walk
 * share one source. It is not a measured research result.
 */

function toyTrapProblem() {
  const graph = {
    S: [
      { id: "L", immediate: 5 },
      { id: "R", immediate: 1 },
    ],
    L: [
      { id: "L1", immediate: 1 },
      { id: "L2", immediate: 2 },
    ],
    R: [
      { id: "R1", immediate: 20 },
      { id: "R2", immediate: 0 },
    ],
  };
  const terminalReward = { L1: 6, L2: 7, R1: 21, R2: 1 };
  return {
    id: "toy-trap",
    root: "S",
    optimum: { path: ["R", "R1"], reward: 21 },
    linearTrap: { path: ["L", "L2"], reward: 7 },
    legalActions(state) {
      const row = graph[state];
      return row ? row.map((action) => action.id) : [];
    },
    immediate(state, action) {
      const row = graph[state] || [];
      const found = row.find((item) => item.id === action);
      return found ? found.immediate : 0;
    },
    next(_state, action) {
      return action;
    },
    isTerminal(state) {
      return Object.prototype.hasOwnProperty.call(terminalReward, state);
    },
    reward(state) {
      if (!Object.prototype.hasOwnProperty.call(terminalReward, state)) {
        throw new Error(`toy trap has no terminal reward for state ${state}`);
      }
      return terminalReward[state];
    },
  };
}

module.exports = { toyTrapProblem };
