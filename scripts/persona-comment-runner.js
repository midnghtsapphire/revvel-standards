#!/usr/bin/env node
"use strict";

/**
 * Persona Comment Runner
 *
 * Lets a new issue/PR comment summon a persona on demand:
 *   - "/professor <task>" / "/oaudrey ..." / "/mindmappr ..." / "/openrouter ..."
 *   - "/persona <name> <task>"
 *
 * NOTE: triggers use a leading slash, NOT "@name". GitHub treats "@name" as a
 * mention of the real user account with that username and emails them — so the
 * old "@professor" syntax pinged a stranger who owns the @professor handle on
 * every comment. The slash form never notifies anyone.
 *
 * Two modes:
 *   - ADVISORY (a question): instantiates the persona and posts a text reply.
 *   - EXECUTION (an action verb like build/implement/create/fix/ship): instead of
 *     talking, the persona files a real Work Request issue and triggers the
 *     working coder (openrouter-coder) — so the persona DOES instead of describes.
 *
 * No-ops cleanly when the comment contains no persona trigger.
 *
 * 2026-05-21 (Claude): created for the comment-trigger persona lane.
 * 2026-05-22 (Claude): added EXECUTION mode so action comments produce a real
 * artifact (a Work Request that the pipeline implements), not just a reply.
 * 2026-05-23 (Claude): switched triggers from "@name" to "/name" so summoning a
 * persona no longer notifies the real GitHub user with that username.
 *
 * Env: COMMENT_BODY, ISSUE_NUMBER, REPO (owner/repo), OPENROUTER_API_KEY, GH_TOKEN
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const { instantiate, getPersonaHandles } = require("./openrouter-personas");

// Verbs that mean "do the thing" rather than "tell me about it".
const ACTION_VERBS = ["build", "implement", "create", "fix", "ship", "make", "add"];

function detectAction(task) {
  const m = (task || "").match(/^\s*(build|implement|create|fix|ship|make|add)\b/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Parse a persona trigger out of a comment body.
 *
 * Accepts "/persona <name> <task>" or the "/<name> <task>" shortcut. The "@name"
 * form is intentionally NOT accepted — it would notify the real GitHub user with
 * that username.
 *
 * @param {string} body - The comment body.
 * @returns {{handle: string, task: string, action: (string|null)} | null}
 */
function parsePersonaCommand(body) {
  if (!body || typeof body !== "string") return null;
  const handles = getPersonaHandles(); // openrouter, oaudrey, mindmappr, professor, theprofessor

  // "/persona <name> <task...>"
  const slash = body.match(/\/persona\s+([a-z0-9_-]+)\s*([\s\S]*)/i);
  if (slash) {
    const handle = slash[1].toLowerCase();
    if (handles.includes(handle)) {
      const rest = (slash[2] || "").trim();
      return { handle, task: rest || body.trim(), action: detectAction(rest) };
    }
  }

  // "/<name> <task...>" shortcut (leading slash, so it never pings a real user).
  for (const handle of handles) {
    const shortcut = new RegExp(`(?:^|\\s)/${handle}\\b`, "i");
    if (shortcut.test(body)) {
      const rest = body.replace(shortcut, " ").trim();
      return { handle, task: rest || body.trim(), action: detectAction(rest) };
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

/**
 * EXECUTION mode: file a real Work Request issue and trigger the working coder.
 * Returns the new issue number (or the raw gh output if it can't be parsed).
 */
function openWorkRequest({ repo, handle, action, task, requestedOn }) {
  const title = `[WR] ${task}`.slice(0, 120);
  const body = [
    `Filed by the **${handle}** persona (action: \`${action}\`) from a comment on #${requestedOn}.`,
    "",
    "## Request",
    "",
    task,
    "",
    "_Routed into the build pipeline via labels (`wr:code` → openrouter-coder)._",
    "_The coder will implement this and open a pull request._",
  ].join("\n");
  const tmpFile = "/tmp/persona-workrequest.md";
  fs.writeFileSync(tmpFile, body);
  const out = execFileSync(
    "gh",
    ["issue", "create", "--repo", repo, "--title", title, "--body-file", tmpFile,
     "--label", "work-request", "--label", "openrouter", "--label", "wr:code"],
    { encoding: "utf8" }
  );
  const m = out.match(/\/issues\/(\d+)/);
  return m ? m[1] : out.trim();
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

  // EXECUTION mode: an action verb means "do it", so file real work instead of replying.
  if (command.action) {
    const num = openWorkRequest({
      repo,
      handle: command.handle,
      action: command.action,
      task: command.task,
      requestedOn: issueNumber,
    });
    postComment(
      repo,
      issueNumber,
      `🛠️ **${command.handle}** filed this as Work Request #${num} and triggered the build pipeline ` +
        `(\`wr:code\` → openrouter-coder), which will open an implementation PR. ` +
        `This is real work, not a comment.\n\n_Action: \`${command.action}\`._`
    );
    console.log(`✅ ${command.handle} filed Work Request #${num} for issue #${issueNumber}`);
    return;
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
