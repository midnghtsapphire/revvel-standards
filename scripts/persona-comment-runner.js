#!/usr/bin/env node
"use strict";

/**
 * Persona Comment Runner
 *
 * Lets a new issue/PR comment summon a persona on demand:
 *   - "@professor <task>"  / "@oaudrey ..." / "@mindmappr ..." / "@openrouter ..."
 *   - "/persona <name> <task>"
 *
 * Parses the trigger, instantiates the persona via scripts/openrouter-personas.js
 * (eager mode), and posts the reply back to the thread with gh. No-ops cleanly
 * when the comment contains no persona trigger.
 *
 * 2026-05-21 (Claude): created for the comment-trigger persona lane.
 *
 * Env: COMMENT_BODY, ISSUE_NUMBER, REPO (owner/repo), OPENROUTER_API_KEY, GH_TOKEN
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const { instantiate, getPersonas } = require("./openrouter-personas");

/**
 * Parse a persona trigger out of a comment body.
 *
 * @param {string} body - The comment body.
 * @returns {{handle: string, task: string} | null} Parsed command, or null.
 */
function parsePersonaCommand(body) {
  if (!body || typeof body !== "string") return null;
  const handles = Object.keys(getPersonas()); // openrouter, oaudrey, mindmappr, professor

  // "/persona <name> <task...>"
  const slash = body.match(/\/persona\s+([a-z0-9_-]+)\s*([\s\S]*)/i);
  if (slash) {
    const handle = slash[1].toLowerCase();
    if (handles.includes(handle)) {
      const task = (slash[2] || "").trim();
      return { handle, task: task || body.trim() };
    }
  }

  // "@<handle> <task...>"
  for (const handle of handles) {
    const mention = new RegExp(`@${handle}\\b`, "i");
    if (mention.test(body)) {
      const task = body.replace(mention, "").trim();
      return { handle, task: task || body.trim() };
    }
  }

  return null;
}

function postComment(repo, issueNumber, markdown) {
  const tmpFile = "/tmp/persona-comment-reply.md";
  fs.writeFileSync(tmpFile, markdown);
  execFileSync(
    "gh",
    ["issue", "comment", String(issueNumber), "--repo", repo, "--body-file", tmpFile],
    { encoding: "utf8" }
  );
}

async function main() {
  const body = process.env.COMMENT_BODY || "";
  const repo = process.env.REPO;
  const issueNumber = process.env.ISSUE_NUMBER;

  const command = parsePersonaCommand(body);
  if (!command) {
    console.log("No persona trigger found in comment — nothing to do.");
    return;
  }
  if (!repo || !issueNumber) {
    throw new Error("Missing REPO or ISSUE_NUMBER");
  }

  const task =
    command.task && command.task.length > 0
      ? command.task
      : "Review this thread and advise on the next concrete step.";

  console.log(`🫆 Summoning ${command.handle} (eager) for issue #${issueNumber}...`);
  const result = await instantiate(command.handle, { mode: "eager", task, silent: true });

  const reply = `## ${result.name} ${result.role ? `— ${result.role}` : ""}\n\n${result.text}\n\n---\n_Summoned via comment trigger · model: ${result.modelUsed || "unknown"}_`;
  postComment(repo, issueNumber, reply);
  console.log(`✅ ${result.name} replied on issue #${issueNumber}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = { parsePersonaCommand };
