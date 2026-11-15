"use strict";

/**
 * Group Relative Policy Optimization, applied to a transient adapter.
 *
 * Shao et al. (DeepSeekMath, 2024) normalize a group's rewards by that
 * group's own mean and standard deviation, then use those advantages as the
 * policy-gradient weights. Centering on the group mean is what makes the
 * advantages sum to ~0. Dividing by the standard deviation does not change
 * the sum. A group whose rewards are identical has std 0; advantages stay 0
 * so we do not divide by a vanishing number and kick the adapter with NaN.
 *
 * The update adds `learningRate * advantage` to the adapter bias of that
 * candidate. It never receives the base-weight object. A positive advantage
 * (reward above the group mean) increases that candidate's bias.
 *
 * Fallback: an empty group throws. A caller that caught that and applied a
 * zero update would hide a search that produced no candidates. What to
 * check: the trajectory list from MCTS, and that every reward is finite.
 */

const STD_FLOOR = 1e-8;

function groupRelativeAdvantages(rewards) {
  if (!Array.isArray(rewards) || rewards.length === 0) {
    throw new Error("GRPO needs a non-empty reward group.");
  }
  let mean = 0;
  for (let i = 0; i < rewards.length; i += 1) {
    const reward = rewards[i];
    if (typeof reward !== "number" || !Number.isFinite(reward)) {
      throw new Error(`GRPO reward[${i}] is not a finite number.`);
    }
    mean += reward;
  }
  mean /= rewards.length;
  let variance = 0;
  for (const reward of rewards) variance += (reward - mean) ** 2;
  // Population std (divide by n). A group of one then has std 0 and we take
  // the no-signal path below instead of a sample-std divide-by-zero.
  variance /= rewards.length;
  const std = Math.sqrt(variance);
  if (std < STD_FLOOR) {
    return { mean, std, advantages: rewards.map(() => 0) };
  }
  return {
    mean,
    std,
    advantages: rewards.map((reward) => (reward - mean) / std),
  };
}

function advantageSum(advantages) {
  return advantages.reduce((sum, value) => sum + value, 0);
}

/**
 * Apply one GRPO step. `samples` is `{ id, reward }[]`. Only `adapter` is
 * written. Returns the advantages and the per-candidate deltas so a test can
 * see the direction after the adapter has been discarded.
 */
function applyGroupUpdate(adapter, samples, options = {}) {
  if (!adapter || typeof adapter.add !== "function") {
    throw new Error("GRPO needs a transient adapter.");
  }
  const learningRate = options.learningRate == null ? 0.1 : options.learningRate;
  if (!Number.isFinite(learningRate) || learningRate < 0) {
    throw new Error("GRPO learningRate must be a finite number >= 0.");
  }
  const rewards = samples.map((sample) => sample.reward);
  const { mean, std, advantages } = groupRelativeAdvantages(rewards);
  const deltas = samples.map((sample, index) => {
    const delta = learningRate * advantages[index];
    adapter.add(sample.id, delta);
    return {
      id: sample.id,
      reward: sample.reward,
      advantage: advantages[index],
      delta,
    };
  });
  return { mean, std, advantages, sum: advantageSum(advantages), deltas, learningRate };
}

module.exports = {
  STD_FLOOR,
  advantageSum,
  applyGroupUpdate,
  groupRelativeAdvantages,
};
