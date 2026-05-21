#!/usr/bin/env node
"use strict";

let engine;
try {
  engine = require("./research-engine.js");
} catch (error) {
  const compatError = new Error(`Unable to load scripts/research-engine.js: ${error.message}`);
  compatError.cause = error;
  throw compatError;
}

function getRequiredCompatEnvVar(name, env = process.env) {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set ${name} before running scripts/research-module.js.`,
    );
  }
  return value.trim();
}

function getCompatOptions(env = process.env) {
  const question = getRequiredCompatEnvVar("QUESTION", env);
  const outputFile = getRequiredCompatEnvVar("OUTPUT_FILE", env);
  const options = engine.getOptionsFromEnv({
    ...env,
    RESEARCH_QUERY: env.RESEARCH_QUERY || question,
    OUTPUT_FILE: outputFile,
    RESEARCH_DEPTH: env.RESEARCH_DEPTH || env.RESEARCH_MODE || "triangulated",
    ISSUE_TITLE: env.ISSUE_TITLE || question,
  });

  return {
    ...options,
    query: question,
    outputFile,
  };
}

async function runCompatibilityResearch(env = process.env, runner = engine.runResearchEngine) {
  const options = getCompatOptions(env);
  return await runner(options);
}

async function main(env = process.env, runner = engine.runResearchEngine) {
  const result = await runCompatibilityResearch(env, runner);

  console.log("Revvel Research Module (compatibility mode)");
  console.log("Delegated to: scripts/research-engine.js");
  console.log(`Query: ${result.context.query}`);
  console.log(`Depth: ${result.context.depth}`);
  console.log(`Status: ${result.status}`);
  console.log(`Wrote: ${result.outputPath}`);
  if (result.status !== "complete") {
    console.log("Research module finished with a visible blocked packet.");
  }

  return result;
}

if (require.main === module) {
  main().catch((error) => {
    const truncate =
      engine && typeof engine.truncateForComment === "function"
        ? engine.truncateForComment
        : (value) => String(value || "");
    console.error(`Research module failed: ${truncate(error.stack || error.message)}`);
    process.exit(1);
  });
}

module.exports = {
  getCompatOptions,
  getRequiredCompatEnvVar,
  main,
  runCompatibilityResearch,
};
