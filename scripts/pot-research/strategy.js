"use strict";

/**
 * Strategy switch for the research orchestrator.
 *
 * `linear` is the default. It is the existing Ralph-loop fan-out
 * (`runRalphLoop` in scripts/research-engine.js) when this module is used
 * from that orchestrator, and a no-backtracking immediate-score walk when it
 * is used on a search problem. `pot` runs MCTS and one GRPO step on a
 * transient adapter, then discards the adapter.
 *
 * An unknown name throws. Falling back to linear on a typo would hide the
 * switch and make a PoT run look like the old orchestrator.
 *
 * This file does not call a model provider. Lane execution, when the
 * orchestrator asks for it, goes through the `runLane` function the caller
 * passes in. That function already lives in research-engine.js, which
 * consults the spend gate before any paid request. If a later change adds a
 * direct provider call in this directory, that call has to consult
 * scripts/llm-spend-gate.js first. What to check if a PoT run fails: the
 * thrown strategy name, then `potTrace.baseHashBefore` versus
 * `potTrace.baseHashAfter` (they must match), then whether the adapter
 * throw says it was already discarded.
 */

const crypto = require("crypto");
const { applyGroupUpdate } = require("./grpo");
const { search } = require("./mcts");
const { StubPolicy } = require("./policy");

const LINEAR = "linear";
const POT = "pot";
const STUB_WEIGHTS = Object.freeze([0.11, 0.23, 0.37, 0.41, 0.53, 0.67, 0.71, 0.83]);

function resolveResearchStrategy(name) {
  if (name === undefined || name === null || String(name).trim() === "") return LINEAR;
  const key = String(name).trim().toLowerCase();
  if (key === LINEAR || key === POT) return key;
  throw new Error(`Unknown research strategy "${name}". Use "linear" or "pot".`);
}

function seedFromText(text) {
  const digest = crypto.createHash("sha256").update(String(text)).digest();
  return digest.readUInt32BE(0) || 1;
}

/**
 * No-backtracking walk. At each state the highest `immediate` score wins.
 * This is the toy counterpart of the orchestrator's linear fan-out: one
 * pass, no tree, no return to a branch that looked worse at the first step.
 */
function runLinearWalk(problem) {
  const path = [];
  let state = problem.root;
  let guard = 0;
  while (!problem.isTerminal(state)) {
    const legal = problem.legalActions(state);
    if (legal.length === 0) {
      throw new Error("Linear walk has no legal action and the state is not terminal.");
    }
    let chosen = legal[0];
    let chosenScore = problem.immediate(state, chosen);
    for (let i = 1; i < legal.length; i += 1) {
      const action = legal[i];
      const score = problem.immediate(state, action);
      if (score > chosenScore || (score === chosenScore && String(action) < String(chosen))) {
        chosen = action;
        chosenScore = score;
      }
    }
    path.push(chosen);
    state = problem.next(state, chosen);
    guard += 1;
    if (guard > 64) throw new Error("Linear walk exceeded 64 steps without a terminal state.");
  }
  return {
    strategy: LINEAR,
    best: { path, reward: problem.reward(state, path), state },
    potTrace: null,
  };
}

function candidateId(path) {
  return path.join(">");
}

/**
 * One problem: open an adapter, search, apply GRPO to that adapter, discard
 * it, and re-hash the base. The adapter object is returned only after
 * `discard()` so callers can assert it is dead.
 */
function runPot(problem, options = {}) {
  const policy = options.policy || new StubPolicy(STUB_WEIGHTS);
  const baseHashBefore = policy.baseHash();
  const adapter = policy.openAdapter(options.adapterIds || []);
  let grpo;
  let found;
  try {
    found = search(problem, {
      iterations: options.iterations,
      exploration: options.exploration,
      selection: options.selection,
      seed: options.seed,
      // A later LoRA policy passes priors here. Dropping this field makes
      // every PUCT prior look uniform, so the first expansion is a coin flip.
      priorFor: options.priorFor,
    });
    const samples = found.trajectories.map((trajectory) => ({
      id: candidateId(trajectory.path),
      reward: trajectory.reward,
    }));
    grpo = applyGroupUpdate(adapter, samples, { learningRate: options.learningRate });
    const baseHashAfterUpdate = policy.baseHash();
    if (baseHashAfterUpdate !== baseHashBefore) {
      throw new Error("Base weights hash changed during the GRPO step.");
    }
  } finally {
    policy.closeAdapter(adapter);
  }
  const baseHashAfter = policy.baseHash();
  return {
    strategy: POT,
    best: found.best,
    potTrace: {
      iterations: found.iterations,
      selection: found.selection,
      trajectories: found.trajectories.length,
      seed: options.seed == null ? null : options.seed,
      advantageSum: grpo.sum,
      advantages: grpo.advantages,
      deltas: grpo.deltas,
      meanReward: grpo.mean,
      stdReward: grpo.std,
      adapterDiscarded: adapter.discarded === true && policy.activeAdapter === null,
      baseHashBefore,
      baseHashAfter,
    },
    adapter,
    policy,
  };
}

function runStrategy(name, problem, options = {}) {
  const strategy = resolveResearchStrategy(name);
  if (strategy === LINEAR) return runLinearWalk(problem);
  return runPot(problem, options);
}

function buildLaneProblem(lanes, rewardOf) {
  const ids = lanes.map((lane) => lane.id);
  return {
    id: "lane-order",
    root: "",
    laneIds: ids,
    legalActions(state) {
      const chosen = state ? state.split("|") : [];
      return ids.filter((id) => !chosen.includes(id));
    },
    immediate(_state, action) {
      // Definition order is the linear preference. Earlier lanes score higher,
      // so the no-backtracking walk reproduces the historical lane order.
      const index = ids.indexOf(action);
      return ids.length - index;
    },
    next(state, action) {
      return state ? `${state}|${action}` : action;
    },
    isTerminal(state) {
      if (!state) return false;
      return state.split("|").filter(Boolean).length === ids.length;
    },
    reward(state) {
      const path = state ? state.split("|").filter(Boolean) : [];
      return rewardOf(path);
    },
  };
}

/**
 * PoT over the orchestrator's lanes. The search itself is CPU-only.
 *
 * Without `context.potReward` every terminal scores 0. GRPO then sees a
 * zero-width group and writes a zero update, and the earliest seeded sample
 * wins. That sample is stable for the query seed. It is not the historical
 * lane order, and it is not a quality ranking. `potTrace.rewardConfigured`
 * is false. `orderMatchesDefinition` reports whether that sample happened
 * to match definition order. A caller that passes `potReward` gets the path
 * MCTS prefers.
 *
 * After the order is chosen, lane execution matches the linear fan-out:
 * `Promise.all` in that order (the result array stays in path order), then
 * the same dry-run-skipped retry and merge as `runRalphLoop`.
 * `context.iterationHistory` is set the same way so synthesis can see the
 * passes. What to check if a pot run looks identical to linear: `potReward`
 * was not passed, so `rewardConfigured` is false.
 */
async function runPotOverLanes(context, caller, deps) {
  const lanes = deps.lanes;
  const rewardConfigured = typeof context.potReward === "function";
  const rewardOf = rewardConfigured ? context.potReward : () => 0;
  const problem = buildLaneProblem(lanes, rewardOf);
  const seed = context.seed == null ? seedFromText(context.query || "") : context.seed;
  const pot = runPot(problem, {
    iterations: context.potIterations == null ? 24 : context.potIterations,
    seed,
    learningRate: context.potLearningRate,
    selection: context.potSelection,
    priorFor: context.potPriorFor,
  });
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const ordered = pot.best.path.map((id) => {
    const lane = laneById.get(id);
    if (!lane) throw new Error(`PoT selected unknown lane "${id}".`);
    return lane;
  });
  // Promise.all keeps `ordered`'s sequence in the results. Awaiting each
  // lane in a for-loop would stretch the same work out by the lane count
  // and would drop the overlap the linear fan-out already has.
  let laneReports = await Promise.all(ordered.map((lane) => deps.runLane(lane, context, caller)));
  const iterationHistory = [laneReports];
  const maxIterations = deps.maxIterations == null ? 1 : deps.maxIterations;
  if (!context.dryRun && deps.checkLanesNeedRetry && deps.mergeLaneReports) {
    for (let iter = 1; iter < maxIterations; iter += 1) {
      const retryLanes = deps.checkLanesNeedRetry(laneReports);
      if (retryLanes.length === 0) break;
      const freshReports = await Promise.all(
        retryLanes.map((lane) => deps.runLane(lane, context, caller)),
      );
      laneReports = deps.mergeLaneReports(laneReports, freshReports);
      iterationHistory.push(freshReports);
    }
  }
  context.iterationHistory = iterationHistory;
  const definitionIds = lanes.map((lane) => lane.id);
  const chosenLaneIds = pot.best.path.slice();
  return {
    strategy: POT,
    laneReports,
    potTrace: {
      ...pot.potTrace,
      chosenLaneIds,
      seed,
      rewardConfigured,
      orderMatchesDefinition: chosenLaneIds.every((id, index) => id === definitionIds[index]),
    },
  };
}

async function dispatchResearchStrategy(context, caller, deps) {
  const strategy = resolveResearchStrategy(context && context.strategy);
  if (strategy === LINEAR) {
    const laneReports = await deps.runLinear(context, caller);
    return { strategy, laneReports, potTrace: null };
  }
  return runPotOverLanes(context, caller, deps);
}

module.exports = {
  LINEAR,
  POT,
  STUB_WEIGHTS,
  buildLaneProblem,
  dispatchResearchStrategy,
  resolveResearchStrategy,
  runLinearWalk,
  runPot,
  runPotOverLanes,
  runStrategy,
  seedFromText,
};
