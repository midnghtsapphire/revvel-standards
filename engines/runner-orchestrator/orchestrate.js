#!/usr/bin/env node
"use strict";

/**
 * Runner Orchestrator CLI — the thin top-level dispatcher (engines/CONTRACT.md).
 *
 * Ties intake -> research -> a schema-valid state.json -> the correct deliver:*
 * label that ship-to-market.yml consumes, in one command:
 *
 *   npm run engine -- --wr intake.json
 *   npm run engine -- --slug cpap-mask-finder --revenue 2000 --output-type sellable-pdf
 *   npm run engine -- --wr intake.json --research          # also run the research engine
 *   npm run engine -- --wr intake.json --dry-run           # plan only, no writes
 *
 * Enforces the CONTRACT hard rules:
 *   - Rule 4: refuse intake with no revenue_target_monthly_usd.
 *   - Rule 3: every state write validates against schemas/state.schema.json.
 *
 * 2026-05-21 (Claude): created to turn engines/CONTRACT.md from prose into a
 * real coordinator wiring the working research-engine + ship-to-market assets.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(REPO_ROOT, "schemas", "state.schema.json");
const RESEARCH_SCRIPT = path.join(REPO_ROOT, "scripts", "research-engine.js");

// output_type (WR form) / shape -> ship-to-market deliver channel.
const SHAPE_TO_CHANNEL = {
  pdf: "pdf",
  booklet: "pdf",
  app: "app",
  "full-app": "app",
  extension: "extension",
  api: "api",
  cli: "cli",
  mcp: "mcp",
  skill: "package",
  token: "package",
  excel: "docs",
};

const OUTPUT_TYPE_TO_CHANNEL = {
  "production-app": "app",
  "desktop-tool": "app",
  "sellable-pdf": "pdf",
  "technical-documentation": "docs",
  "project-management-doc": "docs",
  "internal-script-automation": "cli",
  "cli-product": "cli",
  "mcp-product": "mcp",
  "api-product": "api",
  "client-code-task": "package",
  "invention-flow": "docs",
};

// deliver channel -> the runner that executes it (schema runner_target enum).
const CHANNEL_TO_RUNNER = {
  app: "vercel",
  api: "vercel",
  pdf: "github",
  cli: "github",
  mcp: "github",
  extension: "github",
  docs: "github",
  package: "github",
};

/** Map an intake to a ship-to-market deliver channel. */
function deliverChannelFor({ output_type, shape } = {}) {
  if (shape && SHAPE_TO_CHANNEL[shape]) return SHAPE_TO_CHANNEL[shape];
  if (output_type && OUTPUT_TYPE_TO_CHANNEL[output_type]) return OUTPUT_TYPE_TO_CHANNEL[output_type];
  return "docs"; // safe default: ship docs rather than fail
}

function runnerTargetFor(channel) {
  return CHANNEL_TO_RUNNER[channel] || "github";
}

/** Parse a WR intake from JSON file contents. */
function parseIntake(jsonContent) {
  let raw;
  try {
    raw = JSON.parse(jsonContent);
  } catch (err) {
    throw new Error(`Intake file is not valid JSON: ${err.message}`);
  }
  return normalizeIntake(raw);
}

function normalizeIntake(raw = {}) {
  const intake = { ...raw };
  if (intake.revenue_target_monthly_usd !== undefined && intake.revenue_target_monthly_usd !== null) {
    intake.revenue_target_monthly_usd = Number(intake.revenue_target_monthly_usd);
  }
  const phase = Number(intake.goal_phase);
  intake.goal_phase = [1, 2, 3, 4].includes(phase) ? phase : 1;
  if (!intake.intake_id && intake.product_slug) {
    intake.intake_id = `intake-${intake.product_slug}`;
  }
  return intake;
}

/** Build a schema-valid state.json object from intake (CONTRACT state init). */
function buildState(intake) {
  const now = new Date().toISOString();
  const channel = deliverChannelFor(intake);
  return {
    intake_id: intake.intake_id,
    product_slug: intake.product_slug,
    revenue_target_monthly_usd: intake.revenue_target_monthly_usd,
    goal_phase: intake.goal_phase || 1,
    owner: intake.owner || "midnghtsapphire",
    status: "routed",
    current_engine: "research",
    created_at: now,
    updated_at: now,
    steps: [
      {
        step_id: "intake",
        engine: "runner-orchestrator",
        status: "ok",
        runner_target: null,
        started_at: now,
        finished_at: now,
        artifacts: [],
        evidence: [],
      },
      { step_id: "research", engine: "research-engine", status: "pending", runner_target: null },
      {
        step_id: `deliver-${channel}`,
        engine: "ship-to-market",
        status: "pending",
        runner_target: runnerTargetFor(channel),
      },
    ],
    bom: null,
  };
}

let _validator;
function getValidator() {
  if (!_validator) {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    _validator = ajv.compile(schema);
  }
  return _validator;
}

/** Validate a state object against schemas/state.schema.json (CONTRACT Rule 3). */
function validateState(state) {
  const validate = getValidator();
  const valid = validate(state);
  return { valid, errors: valid ? [] : validate.errors };
}

/**
 * The thin orchestration: refuse → init state → validate → route to deliver.
 * @returns {{state: object, deliverLabel: string, channel: string, outPath: string|null, status: string}}
 */
function orchestrate(intake, opts = {}) {
  // CONTRACT Rule 4 — refuse work with no declared revenue target.
  if (
    intake.revenue_target_monthly_usd === undefined ||
    intake.revenue_target_monthly_usd === null ||
    Number.isNaN(intake.revenue_target_monthly_usd)
  ) {
    throw new Error(
      "Refusing intake: no revenue_target_monthly_usd declared (engines/CONTRACT.md Rule 4)."
    );
  }
  if (!intake.product_slug) {
    throw new Error("Refusing intake: missing product_slug.");
  }

  const state = buildState(intake);

  // CONTRACT Rule 3 — never write state that fails the schema.
  const { valid, errors } = validateState(state);
  if (!valid) {
    throw new Error(`State failed schema validation: ${JSON.stringify(errors)}`);
  }

  const channel = deliverChannelFor(intake);
  const deliverLabel = `deliver:${channel}`;
  const outPath = opts.outPath
    ? path.resolve(opts.outPath)
    : path.join(REPO_ROOT, "projects", "agent-generated", intake.product_slug, "state.json");

  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(state, null, 2) + "\n");
  }

  return { state, deliverLabel, channel, outPath: opts.dryRun ? null : outPath, status: state.status };
}

/**
 * Built-in engines. Each is ({ state, env }) -> result, where result is the
 * CONTRACT engine output: { status, next_engine?, artifacts?, evidence?,
 * runner_target?, bom? }. The orchestrator routes (in orchestrate()); these
 * engines execute and either chain to next_engine or finish/halt.
 */
const DEFAULT_REGISTRY = {
  // Research lane. Requires OPENROUTER_API_KEY; if absent, emit a Procurement
  // BOM and halt instead of failing vaguely (CONTRACT Rule 2).
  research: ({ env }) => {
    if (!env.OPENROUTER_API_KEY) {
      return {
        step_id: "research",
        engine_label: "research-engine",
        status: "needs_procurement",
        bom_ref: "BOM.md",
        bom: {
          items: [
            {
              name: "OpenRouter API key",
              category: "credential",
              cost_usd: 0,
              source: "https://openrouter.ai/keys",
              acquisition: "Create an OpenRouter account, generate a key, and add OPENROUTER_API_KEY to repo secrets.",
              blocking: true,
            },
          ],
        },
      };
    }
    return { step_id: "research", engine_label: "research-engine", status: "ok", next_engine: "deliver" };
  },

  // Deliver lane. Produces the deliver:<channel> label artifact that
  // ship-to-market.yml consumes, then finishes (no next_engine -> done).
  deliver: ({ state }) => {
    const deliverStep = state.steps.find((s) => s.step_id.startsWith("deliver-"));
    const channel = deliverStep ? deliverStep.step_id.slice("deliver-".length) : "docs";
    return {
      step_id: `deliver-${channel}`,
      engine_label: "ship-to-market",
      status: "ok",
      runner_target: runnerTargetFor(channel),
      artifacts: [`deliver:${channel}`],
    };
  },
};

const TERMINAL = new Set(["done", "needs_procurement", "failed"]);

function writeBom(dir, bom) {
  const lines = [
    "# Procurement BOM",
    "",
    "This step is blocked pending the items below (engines/CONTRACT.md Rule 2).",
    "",
    "| Item | Category | Cost (USD) | Source | Acquisition | Blocking |",
    "| --- | --- | --- | --- | --- | --- |",
    ...bom.items.map(
      (i) =>
        `| ${i.name} | ${i.category || ""} | ${i.cost_usd ?? ""} | ${i.source || ""} | ${i.acquisition || ""} | ${i.blocking ? "yes" : "no"} |`
    ),
    "",
  ];
  const bomPath = path.join(dir, "BOM.md");
  fs.writeFileSync(bomPath, lines.join("\n"));
  return bomPath;
}

/**
 * Execute the engine chain: run current_engine, record the step (validated
 * against the schema on every mutation, Rule 3), then chain to next_engine,
 * finish (done), or halt on a Procurement BOM. Pure + re-runnable.
 *
 * @returns {{state: object, status: string, bomPath: string|null}}
 */
function runEngineLoop(state, opts = {}) {
  const registry = opts.registry || DEFAULT_REGISTRY;
  const env = opts.env || process.env;
  const bomDir = opts.bomDir || process.cwd();
  const maxSteps = opts.maxSteps || 12;
  let bomPath = null;
  let guard = 0;

  while (!TERMINAL.has(state.status) && guard < maxSteps) {
    guard += 1;
    const engineName = state.current_engine;
    const engineFn = registry[engineName];
    const now = new Date().toISOString();

    if (typeof engineFn !== "function") {
      state.status = "failed";
      state.updated_at = now;
      break;
    }

    const result = engineFn({ state, env }) || {};
    const stepId = result.step_id || engineName;

    let step = state.steps.find((s) => s.step_id === stepId);
    if (!step) {
      step = { step_id: stepId, engine: result.engine_label || engineName, status: "pending" };
      state.steps.push(step);
    }
    step.engine = result.engine_label || step.engine || engineName;
    step.status = result.status;
    step.finished_at = now;
    step.artifacts = result.artifacts || step.artifacts || [];
    step.evidence = result.evidence || step.evidence || [];
    if (result.runner_target !== undefined) step.runner_target = result.runner_target;
    if (result.error) step.error = result.error;
    if (result.bom_ref) step.bom_ref = result.bom_ref;
    state.updated_at = now;

    // Rule 3: never advance on a state that violates the schema.
    const { valid, errors } = validateState(state);
    if (!valid) {
      throw new Error(`State failed schema validation after ${engineName}: ${JSON.stringify(errors)}`);
    }

    if (result.bom) {
      state.bom = result.bom;
      state.status = "needs_procurement";
      if (!opts.dryRun) bomPath = writeBom(bomDir, result.bom);
      break;
    }
    if (result.status === "failed") {
      state.status = "failed";
      break;
    }
    if (result.next_engine) {
      state.current_engine = result.next_engine;
      continue;
    }
    state.status = "done";
    break;
  }

  return { state, status: state.status, bomPath };
}

function runResearch(intake) {
  const env = {
    ...process.env,
    RESEARCH_QUERY: intake.query || intake.product_slug,
    ISSUE_TITLE: intake.title || intake.product_slug,
    ISSUE_BODY: intake.body || "",
  };
  const result = spawnSync("node", [RESEARCH_SCRIPT], { env, stdio: "inherit" });
  return result.status === 0;
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "run" || key === "research" || key === "dry-run" || key === "help") {
      flags[key] = true;
    } else {
      flags[key] = argv[i + 1];
      i += 1;
    }
  }
  return flags;
}

function intakeFromFlags(flags) {
  const intake = {};
  if (flags.wr) {
    Object.assign(intake, parseIntake(fs.readFileSync(path.resolve(flags.wr), "utf8")));
  }
  if (flags.slug) intake.product_slug = flags.slug;
  if (flags.revenue) intake.revenue_target_monthly_usd = flags.revenue;
  if (flags["output-type"]) intake.output_type = flags["output-type"];
  if (flags.shape) intake.shape = flags.shape;
  if (flags["goal-phase"]) intake.goal_phase = flags["goal-phase"];
  if (flags["intake-id"]) intake.intake_id = flags["intake-id"];
  if (flags.owner) intake.owner = flags.owner;
  if (flags.query) intake.query = flags.query;
  return normalizeIntake(intake);
}

const HELP = `Runner Orchestrator — npm run engine

Usage:
  npm run engine -- --wr <intake.json>
  npm run engine -- --slug <slug> --revenue <usd> --output-type <type> [--shape <shape>]

Flags:
  --wr <path>          JSON intake file
  --slug <slug>        product_slug
  --revenue <usd>      revenue_target_monthly_usd (required by CONTRACT Rule 4)
  --output-type <t>    WR Output Type (e.g. sellable-pdf, api-product, cli-product)
  --shape <s>          delivery shape (pdf, app, api, cli, mcp, extension, ...)
  --goal-phase <1-4>   goal phase (default 1)
  --intake-id <id>     intake id (default intake-<slug>)
  --owner <name>       owner (default midnghtsapphire)
  --out <path>         where to write state.json
  --run                execute the engine loop (research -> deliver, BOM-halt)
  --research           also run scripts/research-engine.js
  --dry-run            print the plan without writing/spawning
  --help               show this help`;

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(HELP);
    return;
  }
  const intake = intakeFromFlags(flags);
  const result = orchestrate(intake, { outPath: flags.out, dryRun: flags["dry-run"] });

  console.log(`🎯 intake: ${intake.product_slug} · $${intake.revenue_target_monthly_usd}/mo · phase ${intake.goal_phase}`);
  console.log(`📦 deliver channel: ${result.channel} → label ${result.deliverLabel}`);
  if (result.outPath) console.log(`💾 state.json: ${path.relative(REPO_ROOT, result.outPath)}`);
  else console.log("💡 dry-run: no files written");
  console.log(`➡️  next: apply ${result.deliverLabel} to the PR (ship-to-market.yml will ship it)`);

  if (flags.run) {
    const { state, status, bomPath } = runEngineLoop(result.state, {
      env: process.env,
      bomDir: result.outPath ? path.dirname(result.outPath) : process.cwd(),
      dryRun: Boolean(flags["dry-run"]),
    });
    if (result.outPath) fs.writeFileSync(result.outPath, JSON.stringify(state, null, 2) + "\n");
    const trail = state.steps.map((s) => `${s.step_id}:${s.status}`).join(" → ");
    console.log(`🔁 engine loop: ${trail}`);
    console.log(`🏁 status: ${status}`);
    if (bomPath) console.log(`🧾 procurement BOM written: ${path.relative(REPO_ROOT, bomPath)}`);
  }

  if (flags.research && !flags["dry-run"]) {
    console.log("🔬 running research engine...");
    const ok = runResearch(intake);
    console.log(ok ? "✅ research complete" : "⚠️ research engine exited non-zero");
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  deliverChannelFor,
  runnerTargetFor,
  parseIntake,
  normalizeIntake,
  buildState,
  validateState,
  orchestrate,
  runEngineLoop,
  writeBom,
  DEFAULT_REGISTRY,
};
