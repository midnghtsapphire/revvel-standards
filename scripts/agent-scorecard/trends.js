'use strict';

/**
 * Trends — longitudinal view per agent.
 *
 * The scorecard ledger is append-only with per-dimension scores on every event,
 * so we can ask the questions that a single trust number can't answer:
 *   - Is this agent getting BETTER over time, and in which dimensions?
 *     (e.g. hallucination dropping but rashness rising)
 *   - Is it ADDING capability we didn't have — net-new features/modules — vs
 *     only fixing/maintaining? That's credit a pass/fail gate never gives.
 *
 * Pure functions over an agent's ordered score events.
 */

const DIMENSIONS = ['hallucination', 'badCode', 'directions', 'rash', 'ci'];

/**
 * Compare the average of the most recent `window` values against the `window`
 * before it. Returns a direction + signed delta. Needs >= window*2 points to
 * call a trend; otherwise 'flat'/'insufficient'.
 */
function windowedTrend(values, window = 5, epsilon = 0.02) {
  const v = (values || []).filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (v.length < window * 2) {
    return { direction: 'insufficient', delta: 0, n: v.length };
  }
  const recent = v.slice(-window);
  const prior = v.slice(-window * 2, -window);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const delta = +(avg(recent) - avg(prior)).toFixed(3);
  let direction = 'flat';
  if (delta > epsilon) direction = 'up';
  else if (delta < -epsilon) direction = 'down';
  return { direction, delta, n: v.length };
}

const ARROW = { up: '↑', down: '↓', flat: '→', insufficient: '·' };
function arrow(direction) {
  return ARROW[direction] || '·';
}

/**
 * Per-agent trend report from ordered score events.
 *
 * @param {Array} events  this agent's events in chronological order
 * @returns {{quality:object, dimensions:object, builds:number, capabilitiesAdded:number, improving:string[], regressing:string[]}}
 */
function agentTrends(events = []) {
  const scoreEvents = events.filter((e) => e && e.type === 'score');

  const qualitySeries = scoreEvents.map((e) => Number(e.quality));
  const quality = windowedTrend(qualitySeries);

  const dimensions = {};
  const improving = [];
  const regressing = [];
  for (const dim of DIMENSIONS) {
    const series = scoreEvents
      .map((e) => (e.dimensions ? Number(e.dimensions[dim]) : NaN))
      .filter((n) => !Number.isNaN(n));
    const t = windowedTrend(series);
    dimensions[dim] = t;
    if (t.direction === 'up') improving.push(dim);
    if (t.direction === 'down') regressing.push(dim);
  }

  const builds = scoreEvents.filter((e) => e.prType === 'feat').length;
  const capabilitiesAdded = scoreEvents.reduce(
    (sum, e) => sum + (Number(e.newCapabilities) || 0),
    0
  );

  return { quality, dimensions, builds, capabilitiesAdded, improving, regressing };
}

module.exports = { DIMENSIONS, windowedTrend, arrow, agentTrends };
