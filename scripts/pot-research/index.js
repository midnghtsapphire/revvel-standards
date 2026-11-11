"use strict";

/**
 * Public entry for the Policy-of-Thoughts engine.
 *
 * Require this module from tests and from later integration. The research
 * orchestrator itself requires `./strategy` so a lane run does not pull the
 * benchmark harness into the hot path.
 *
 * Nothing here loads a checkpoint or contacts a model host. Wire a real
 * LoRA policy by subclassing `Policy` and passing it as `options.policy`.
 * The stub is the default because this tree is CPU-only.
 */

const { applyGroupUpdate, groupRelativeAdvantages } = require("./grpo");
const { search, uctScore, puctScore } = require("./mcts");
const { FrozenBaseWeights, Policy, StubPolicy, TransientAdapter } = require("./policy");
const {
  resolveResearchStrategy,
  runStrategy,
  dispatchResearchStrategy,
  LINEAR,
  POT,
} = require("./strategy");
const { toyTrapProblem } = require("./toy-problem");
const { inspectEvaluationSet } = require("./benchmark");

module.exports = {
  FrozenBaseWeights,
  LINEAR,
  POT,
  Policy,
  StubPolicy,
  TransientAdapter,
  applyGroupUpdate,
  dispatchResearchStrategy,
  groupRelativeAdvantages,
  inspectEvaluationSet,
  puctScore,
  resolveResearchStrategy,
  runStrategy,
  search,
  toyTrapProblem,
  uctScore,
};
