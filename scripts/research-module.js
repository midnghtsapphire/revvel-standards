#!/usr/bin/env node
"use strict";

/**
 * Compatibility entrypoint for the Revvel Search Research Engine.
 *
 * Existing workflows and docs historically called this file. The full layered
 * implementation now lives in scripts/research-engine.js so it can be tested
 * and imported without triggering environment validation at require time.
 */

const engine = require("./research-engine.js");

if (require.main === module) {
  engine.main().catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = engine;
