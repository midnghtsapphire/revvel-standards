#!/usr/bin/env node
"use strict";

/**
 * OpenRouter Routing Example CLI
 * 
 * Demonstrates how to use the OpenRouter routing module with different profiles.
 * 
 * Usage:
 *   export OPENROUTER_API_KEY="your-key-here"
 *   node scripts/openrouter-routing-example.js <profile> <prompt>
 * 
 * Examples:
 *   node scripts/openrouter-routing-example.js repo_surgery "Fix the bug in user authentication"
 *   node scripts/openrouter-routing-example.js cheap_batch_edits "Generate unit tests for utils.js"
 *   node scripts/openrouter-routing-example.js hard_debug "Why is the database connection timing out?"
 */

const { routedChat, getProfiles } = require("./openrouter-routing");

async function main() {
  const args = process.argv.slice(2);
  
  // Show usage if no arguments provided
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  // Show available profiles
  if (args.includes("--list-profiles") || args.includes("-l")) {
    showProfiles();
    process.exit(0);
  }

  const [profile, ...promptParts] = args;
  const prompt = promptParts.join(" ");

  if (!prompt) {
    console.error("❌ Error: Prompt is required\n");
    showUsage();
    process.exit(1);
  }

  // Validate API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY environment variable is not set");
    console.error("\nSet it by running:");
    console.error("  export OPENROUTER_API_KEY='your-key-here'\n");
    process.exit(1);
  }

  // Validate profile
  const profiles = getProfiles();
  if (!profiles[profile]) {
    console.error(`❌ Error: Unknown profile '${profile}'`);
    console.error(`\nAvailable profiles: ${Object.keys(profiles).join(", ")}\n`);
    showProfiles();
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("OpenRouter Routing Example");
  console.log("=".repeat(80));
  console.log();

  try {
    const result = await routedChat({
      profile,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    console.log();
    console.log("=" .repeat(80));
    console.log("Response");
    console.log("=" .repeat(80));
    console.log();
    console.log(result.text);
    console.log();
    console.log("=" .repeat(80));
    console.log("Metadata");
    console.log("=" .repeat(80));
    console.log(`Profile: ${result.profile}`);
    console.log(`Description: ${result.profileDescription}`);
    console.log(`Requested models: ${result.requestedModels.join(" → ")}`);
    console.log(`Model used: ${result.modelUsed || "unknown"}`);
    console.log("=" .repeat(80));

  } catch (err) {
    console.error();
    console.error("❌ Error:", err.message);
    console.error();
    process.exit(1);
  }
}

function showUsage() {
  console.log("Usage: node scripts/openrouter-routing-example.js <profile> <prompt>");
  console.log();
  console.log("Options:");
  console.log("  -h, --help           Show this help message");
  console.log("  -l, --list-profiles  List available routing profiles");
  console.log();
  console.log("Environment variables:");
  console.log("  OPENROUTER_API_KEY   Required. Your OpenRouter API key");
  console.log();
  console.log("Examples:");
  console.log("  node scripts/openrouter-routing-example.js repo_surgery \"Fix the bug in user authentication\"");
  console.log("  node scripts/openrouter-routing-example.js cheap_batch_edits \"Generate unit tests for utils.js\"");
  console.log("  node scripts/openrouter-routing-example.js hard_debug \"Why is the database connection timing out?\"");
  console.log();
}

function showProfiles() {
  const profiles = getProfiles();
  console.log("Available routing profiles:");
  console.log();
  
  for (const [name, config] of Object.entries(profiles)) {
    console.log(`  ${name}:`);
    console.log(`    Description: ${config.description}`);
    console.log(`    Models: ${config.models.join(" → ")}`);
    console.log();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { main };
