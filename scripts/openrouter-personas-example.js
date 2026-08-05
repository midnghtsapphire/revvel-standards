#!/usr/bin/env node
"use strict";

/**
 * OpenRouter Persona Instantiation Example CLI
 *
 * Bring a named persona online through OpenRouter, either right away or on
 * assignment.
 *
 * Usage:
 *   export OPENROUTER_API_KEY="your-key-here"
 *   node scripts/openrouter-personas-example.js <persona> <mode> [task...]
 *
 * Examples:
 *   # Right away (eager) — reports online immediately, no task needed
 *   node scripts/openrouter-personas-example.js oaudrey "right away"
 *
 *   # Right away with a task — runs it now
 *   node scripts/openrouter-personas-example.js professor "right away" "What is the TAM for self-hosted AI chat?"
 *
 *   # On assignment — registers the persona, then assigns a task to it
 *   node scripts/openrouter-personas-example.js mindmappr "on assignment" "Outline a launch plan for MindMappr"
 *
 *   node scripts/openrouter-personas-example.js --list
 */

const { instantiate, getPersonas, INSTANTIATION_MODES } = require("./openrouter-personas");

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  if (args.includes("--list") || args.includes("-l")) {
    showPersonas();
    process.exit(0);
  }

  const [persona, mode, ...taskParts] = args;
  const task = taskParts.join(" ").trim() || undefined;

  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY environment variable is not set");
    console.error("\nSet it by running:");
    console.error("  export OPENROUTER_API_KEY='your-key-here'\n");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("OpenRouter Persona Instantiation");
  console.log("=".repeat(80));
  console.log();

  try {
    const result = await instantiate(persona, { mode, task });

    // On-assignment with no task returns a deferred handle.
    if (result.instantiated === false) {
      console.log();
      console.log(`Registered ${result.name} on assignment. Awaiting a task.`);
      console.log("Provide a task argument to run it now, e.g.:");
      console.log(`  node scripts/openrouter-personas-example.js ${persona} "on assignment" "your task here"`);
      console.log();
      return;
    }

    console.log();
    console.log("=".repeat(80));
    console.log("Response");
    console.log("=".repeat(80));
    console.log();
    console.log(result.text);
    console.log();
    console.log("=".repeat(80));
    console.log("Metadata");
    console.log("=".repeat(80));
    console.log(`Persona: ${result.name} (${result.persona}) — ${result.role}`);
    console.log(`Mode: ${result.mode}`);
    if (result.requestedModels) {
      console.log(`Requested models: ${result.requestedModels.join(" → ")}`);
    }
    console.log(`Model used: ${result.modelUsed || "unknown"}`);
    console.log("=".repeat(80));
  } catch (err) {
    console.error();
    console.error("❌ Error:", err.message);
    console.error();
    process.exit(1);
  }
}

function showUsage() {
  console.log("Usage: node scripts/openrouter-personas-example.js <persona> <mode> [task...]");
  console.log();
  console.log("Modes:");
  console.log('  "right away"      Instantiate eagerly — persona reports online now');
  console.log('  "on assignment"   Register now; runs only when a task is assigned');
  console.log();
  console.log("Options:");
  console.log("  -h, --help   Show this help message");
  console.log("  -l, --list   List available personas");
  console.log();
  console.log("Environment variables:");
  console.log("  OPENROUTER_API_KEY   Required. Your OpenRouter API key");
  console.log();
  console.log("Examples:");
  console.log('  node scripts/openrouter-personas-example.js oaudrey "right away"');
  console.log('  node scripts/openrouter-personas-example.js professor "right away" "TAM for self-hosted AI chat?"');
  console.log('  node scripts/openrouter-personas-example.js mindmappr "on assignment" "Outline a MindMappr launch plan"');
  console.log();
}

function showPersonas() {
  const personas = getPersonas();
  console.log("Available personas:");
  console.log();
  for (const p of Object.values(personas)) {
    console.log(`  ${p.emoji} ${p.handle} — ${p.name} (${p.role})`);
    console.log(`     ${p.description}`);
    const route = p.models ? p.models.join(" → ") : `profile: ${p.profile}`;
    console.log(`     Routing: ${route}`);
    console.log();
  }
  console.log(`Modes: ${INSTANTIATION_MODES.EAGER} ("right away"), ${INSTANTIATION_MODES.ON_ASSIGNMENT} ("on assignment")`);
  console.log();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { main };
