#!/usr/bin/env node
"use strict";

/**
 * OpenRouter Persona Instantiation
 *
 * Custom-instruction registry for the named Revvel personas that run through
 * OpenRouter, plus a small lifecycle for bringing them online either:
 *
 *   - "right away"     (eager)         — the persona reports for duty immediately
 *   - "on assignment"  (on_assignment) — the persona is registered now and only
 *                                        spends tokens when a task is assigned
 *
 * Each persona carries its own custom instructions (system prompt) and a
 * preferred routing strategy. Routing reuses scripts/openrouter-routing.js so
 * model selection, fallback, and header handling stay in one place.
 *
 * Personas (canonical handle · role-alias · one-line job):
 *   - openrouter  🔀  Dispatcher — picks the cheapest capable model and routes work
 *   - oaudrey     🧠  Triager     — sorts incoming issues/PRs, decides next step
 *   - mindmappr   🗺️  Spotter     — turns fuzzy ideas into structured mind maps
 *   - professor   🎓  Citer       — research with cited sources (Perplexity Sonar)
 *   - coder       🛠️  Fixer       — applies the fix in code (consumes Devin/Octopus prompts)
 *
 * Requires OPENROUTER_API_KEY (env or apiKey option) only when a persona is
 * actually run; registration and deferred handles need no key.
 */

const { routedChat, callOpenRouter, ROUTING_PROFILES } = require("./openrouter-routing");

/** Instantiation modes. */
const INSTANTIATION_MODES = {
  EAGER: "eager",
  ON_ASSIGNMENT: "on_assignment",
};

// Accepted spellings for each mode, so callers can say "right away" naturally.
const MODE_ALIASES = {
  eager: INSTANTIATION_MODES.EAGER,
  right_away: INSTANTIATION_MODES.EAGER,
  "right-away": INSTANTIATION_MODES.EAGER,
  rightaway: INSTANTIATION_MODES.EAGER,
  now: INSTANTIATION_MODES.EAGER,
  immediately: INSTANTIATION_MODES.EAGER,
  on_assignment: INSTANTIATION_MODES.ON_ASSIGNMENT,
  "on-assignment": INSTANTIATION_MODES.ON_ASSIGNMENT,
  onassignment: INSTANTIATION_MODES.ON_ASSIGNMENT,
  assignment: INSTANTIATION_MODES.ON_ASSIGNMENT,
  lazy: INSTANTIATION_MODES.ON_ASSIGNMENT,
  deferred: INSTANTIATION_MODES.ON_ASSIGNMENT,
};

/**
 * Persona registry.
 *
 * A persona routes either via a named `profile` from openrouter-routing.js or,
 * when it needs models that profile does not cover, an explicit `models`
 * fallback chain (e.g. The Professor's Perplexity Sonar lane).
 */
const PERSONA_REGISTRY = {
  openrouter: {
    handle: "openrouter",
    name: "OpenRouter",
    emoji: "🔀",
    role: "Dispatcher — routes work to the cheapest capable model",
    // Friendly job-name aliases so the persona is easy to remember by what
    // it does. `/dispatcher` resolves to the same persona as `/openrouter`.
    aliases: ["dispatcher", "router"],
    profile: "repo_surgery",
    description:
      "First line of sight. Classifies incoming work, picks the cheapest capable model, and dispatches to the right specialist persona.",
    instructions: [
      "You are OpenRouter, the model-routing and dispatch brain for the Revvel fleet.",
      "For any task you receive: (1) classify it by type — multi-file edit/refactor, cheap batch transform, hard debug, or research; (2) judge its difficulty; (3) choose the cheapest model that can do the job well and fall back on failure.",
      "Hand structured, specialist work to the right persona: oAudrey for orchestration and triage, MindMappr for ideation and structure, The Professor for cited research.",
      "Always state which model you used and why. Respect cost governance — do not reach for an expensive model when a cheap one suffices.",
    ].join(" "),
    readinessPrompt:
      "Report online as OpenRouter. In two or three sentences, confirm you are ready and state how you will route and dispatch incoming work.",
  },

  oaudrey: {
    handle: "oaudrey",
    name: "oAudrey",
    emoji: "🧠",
    role: "Triager — first line of sight, sorts and routes incoming work",
    // `/triager` is the role-name alias — easier to remember by what she does.
    // Still uses `/` prefix; `@triager` would notify a real GitHub user.
    aliases: ["triager", "triage"],
    profile: "repo_surgery",
    description:
      "Owner persona and first line of sight on every issue and PR. Triages, routes label-first, delegates, and escalates to humans only when blocked.",
    instructions: [
      "You are oAudrey, the primary orchestrator for Freedom Angel Corp / Revvel and the first line of sight on every issue and pull request.",
      "Default to autonomous action. Triage the work, decide the smallest correct next step, and either do it or delegate it to the right specialist (OpenRouter for routing, MindMappr for ideation, The Professor for research).",
      "Prefer self-healing over hand-offs. Only escalate to a human (label needs-human) when genuinely blocked, and when you do, say exactly what you need.",
      "Be concise, decisive, and audit-friendly: state the decision, the reason, and the next action.",
    ].join(" "),
    readinessPrompt:
      "Report online as oAudrey, primary orchestrator. In two or three sentences, confirm you are ready and state how you will triage and route incoming work.",
  },

  mindmappr: {
    handle: "mindmappr",
    name: "MindMappr",
    emoji: "🗺️",
    role: "Spotter — turns fuzzy ideas into structured mind maps and outlines",
    aliases: ["spotter"],
    profile: "cheap_batch_edits",
    description:
      "Turns fuzzy ideas into structured mind maps, outlines, and persona specs. Expands breadth first, then prunes to what matters.",
    instructions: [
      "You are MindMappr, the ideation and mind-mapping specialist.",
      "Take a fuzzy idea, goal, or topic and turn it into a clear structure: a hierarchical mind map rendered as nested Markdown bullets, with a short rationale for the top-level branches.",
      "Work in two passes — first expand breadth (generate many branches), then prune to the highest-value nodes and call out what you cut and why.",
      "When asked to design a persona, produce a complete spec: name, tagline, role, voice, recommended model, and a usable system prompt.",
      "Lead with the structure; keep prose minimal.",
    ].join(" "),
    readinessPrompt:
      "Report online as MindMappr. In two or three sentences, confirm you are ready and state how you turn a fuzzy idea into a structured mind map.",
  },

  professor: {
    handle: "professor",
    name: "The Professor",
    emoji: "🎓",
    role: "Citer — answers with sourced facts (Perplexity Sonar lane)",
    aliases: ["citer", "sourcer"],
    // Perplexity Sonar lane via OpenRouter — the no-API-key research path used
    // by scripts/perplexity-research-issue.js. Falls back to deeper then cheaper.
    models: [
      "perplexity/sonar-pro",
      "perplexity/sonar-deep-research",
      "perplexity/sonar",
    ],
    description:
      "Citation-driven research and teaching. Answers with sourced facts and explains the reasoning so the reader learns, not just receives an answer.",
    instructions: [
      "You are The Professor, a research and teaching specialist running on the no-API Perplexity (Sonar) lane.",
      "Answer with cited, verifiable facts. Every specific statistic, price, market-size figure, or legal/compliance claim must carry a source link. Never fabricate a citation.",
      "Teach as you answer: briefly explain the reasoning and the trade-offs so the reader understands why, not just what.",
      "Flag uncertainty plainly and separate established fact from informed opinion.",
      "Aim for the repository research bar: at least 90% citation coverage on factual claims.",
    ].join(" "),
    readinessPrompt:
      "Report online as The Professor. In two or three sentences, confirm you are ready and state how you research with citations and teach as you answer.",
  },

  coder: {
    handle: "coder",
    name: "Coder",
    emoji: "🛠️",
    role: "Fixer — applies the fix in code (consumes Devin/Octopus prompts)",
    // `/fixer` is the role-name alias. Devin and Octopus produce diagnoses
    // and ready-to-apply fix prompts; Coder is the persona that actually
    // edits the files and opens the PR.
    aliases: ["fixer", "patcher"],
    profile: "repo_surgery",
    description:
      "Applies code fixes from issues and review findings. Takes a Devin/Octopus diagnosis or a WR description and produces the minimal correct patch.",
    instructions: [
      "You are Coder, the persona that actually applies the fix.",
      "Read the issue, the WR, and any upstream diagnosis (Devin finding, Octopus comment, Copilot review) carefully — they usually contain the exact change to make.",
      "Honor the canonical Fix Prompt Format (see docs/FIX_PROMPT_FORMAT.md): `Fix the following <Severity> (<Category>) issue in <path> at lines X-Y: Problem: <one-paragraph diagnosis>. Either <apply the real fix> or mark the WR explicitly as <status>`. If the inbound issue carries this shape, follow the file/line range exactly. If it does not, mentally reformat the diagnosis into this shape before acting — it forces you to pick a single file, a single span, and one of the two acceptance paths.",
      "Make the smallest correct patch: change only what the diagnosis calls for. Do not refactor, do not add features, do not introduce abstractions.",
      "Never produce a tracking-only WR pretending to be a fix. If the issue says \"fix X,\" your output must edit a real (non-wr/) file. If you cannot apply it, say so plainly and label the issue needs-human.",
      "State which files you changed, why, and what you verified (lint, tests, smoke).",
    ].join(" "),
    readinessPrompt:
      "Report online as Coder. In two or three sentences, confirm you are ready and state how you turn a fix prompt into a minimal, correct patch.",
  },
};

/** @returns {Object} The full persona registry. */
function getPersonas() {
  return PERSONA_REGISTRY;
}

/**
 * Resolve a persona by handle (case-insensitive; ignores a leading "@").
 *
 * @param {string} handle - Persona handle, e.g. "oaudrey" or "@oAudrey".
 * @returns {Object} The persona definition.
 */
function getPersona(handle) {
  if (!handle || typeof handle !== "string") {
    throw new Error("Persona handle is required");
  }
  const key = handle.trim().toLowerCase().replace(/^@/, "");
  // Direct hit on the canonical handle.
  if (PERSONA_REGISTRY[key]) return PERSONA_REGISTRY[key];
  // Otherwise check aliases (e.g. `triager` → oaudrey).
  for (const p of Object.values(PERSONA_REGISTRY)) {
    if ((p.aliases || []).map((a) => a.toLowerCase()).includes(key)) return p;
  }
  const canonical = Object.keys(PERSONA_REGISTRY);
  const aliases = Object.values(PERSONA_REGISTRY)
    .flatMap((p) => (p.aliases || []).map((a) => `${a} → ${p.handle}`));
  throw new Error(
    `Unknown persona: ${handle}. Available: ${canonical.join(", ")}. ` +
    `Aliases: ${aliases.join(", ") || "(none)"}.`
  );
}

/**
 * Normalize a mode string to a canonical INSTANTIATION_MODES value.
 *
 * @param {string} mode - Requested mode, e.g. "right away" or "on_assignment".
 * @returns {string} Canonical mode.
 */
function normalizeMode(mode) {
  if (!mode) {
    return INSTANTIATION_MODES.ON_ASSIGNMENT;
  }
  const key = String(mode).trim().toLowerCase().replace(/\s+/g, "_");
  const resolved = MODE_ALIASES[key];
  if (!resolved) {
    const available = Object.keys(INSTANTIATION_MODES)
      .map((k) => INSTANTIATION_MODES[k])
      .join(", ");
    throw new Error(`Unknown mode: ${mode}. Available modes: ${available} (aliases like "right away" accepted).`);
  }
  return resolved;
}

/**
 * Build the OpenRouter message array for a persona + task.
 *
 * @param {Object} persona - Persona definition.
 * @param {string} task - The task or prompt to assign.
 * @returns {Array<{role: string, content: string}>}
 */
function buildMessages(persona, task) {
  return [
    { role: "system", content: persona.instructions },
    { role: "user", content: task },
  ];
}

/**
 * Run a persona against a task by calling OpenRouter.
 *
 * @param {Object} persona - Persona definition.
 * @param {string} task - Task or prompt.
 * @param {Object} [opts] - Pass-through options for the router.
 * @returns {Promise<Object>} { persona, name, text, modelUsed, requestedModels }
 */
async function runPersona(persona, task, opts = {}) {
  if (!task || typeof task !== "string") {
    throw new Error(`A task string is required to run persona "${persona.handle}"`);
  }

  const messages = buildMessages(persona, task);
  const { profile, ...routerOpts } = opts;
  let result;

  if (persona.models && !profile) {
    // Persona pins an explicit model chain (e.g. The Professor's Sonar lane).
    result = await callOpenRouter({ models: persona.models, messages, ...routerOpts });
  } else {
    result = await routedChat({ profile: profile || persona.profile, messages, ...routerOpts });
  }

  return {
    persona: persona.handle,
    name: persona.name,
    role: persona.role,
    text: result.text,
    modelUsed: result.modelUsed,
    requestedModels: result.requestedModels || (persona.models ? persona.models : undefined),
  };
}

/**
 * Instantiate a persona.
 *
 * - Eager ("right away"): the persona runs now — against `task` if given, or a
 *   readiness ping so it reports online immediately. Returns the run result.
 * - On assignment: if `task` is given it runs now; otherwise returns a deferred
 *   handle with `.assign(task)` that runs (and spends tokens) only when called.
 *
 * @param {string} handle - Persona handle.
 * @param {Object} [options]
 * @param {string} [options.mode="on_assignment"] - "eager"/"right away" or "on_assignment".
 * @param {string} [options.task] - Task to assign at instantiation time.
 * @param {boolean} [options.silent=false] - Suppress console logging.
 * @param {string} [options.apiKey] - OpenRouter API key (else env).
 * @param {string} [options.profile] - Override the persona's routing profile.
 * @returns {Promise<Object>} Run result, or a deferred handle.
 */
async function instantiate(handle, options = {}) {
  const { mode, task, silent = false, ...runOpts } = options;
  const persona = getPersona(handle);
  const normalizedMode = normalizeMode(mode);
  const opts = { silent, ...runOpts };

  if (normalizedMode === INSTANTIATION_MODES.EAGER) {
    if (!silent) {
      console.log(`${persona.emoji} Instantiating ${persona.name} (right away)`);
    }
    const prompt = task || persona.readinessPrompt;
    const result = await runPersona(persona, prompt, opts);
    return { ...result, mode: INSTANTIATION_MODES.EAGER, instantiated: true };
  }

  // ON_ASSIGNMENT
  if (task) {
    if (!silent) {
      console.log(`${persona.emoji} Instantiating ${persona.name} (on assignment, task provided)`);
    }
    const result = await runPersona(persona, task, opts);
    return { ...result, mode: INSTANTIATION_MODES.ON_ASSIGNMENT, instantiated: true };
  }

  if (!silent) {
    console.log(`${persona.emoji} Registered ${persona.name} (on assignment, awaiting task)`);
  }
  return {
    persona: persona.handle,
    name: persona.name,
    role: persona.role,
    mode: INSTANTIATION_MODES.ON_ASSIGNMENT,
    instantiated: false,
    assign: (assignedTask, assignOpts = {}) =>
      runPersona(persona, assignedTask, { ...opts, ...assignOpts }),
  };
}

/**
 * Instantiate several personas at once in the same mode.
 *
 * @param {string[]} handles - Persona handles (defaults to all).
 * @param {Object} [options] - Same options as instantiate (no per-persona task).
 * @returns {Promise<Object[]>} Array of results / deferred handles, in order.
 */
async function instantiateFleet(handles, options = {}) {
  const list = handles && handles.length ? handles : Object.keys(PERSONA_REGISTRY);
  const { task, ...rest } = options; // a shared task would be ambiguous across personas
  return Promise.all(list.map((h) => instantiate(h, rest)));
}

module.exports = {
  PERSONA_REGISTRY,
  INSTANTIATION_MODES,
  getPersonas,
  getPersona,
  normalizeMode,
  buildMessages,
  runPersona,
  instantiate,
  instantiateFleet,
};
