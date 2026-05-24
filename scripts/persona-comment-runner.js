#!/usr/bin/env node
"use strict";

/**
 * Persona Comment Runner
 *
 * Lets a new issue/PR comment summon a persona on demand:
 *   - "/professor <task>" / "/oaudrey ..." / "/mindmappr ..." / "/openrouter ..."
 *   - "/radiochaser <task>"
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
 * Persistent memory:
 *   Each persona has a journal file at journals/<handle>.md in the repo root.
 *   Before running, the journal is read and injected as context (last N entries).
 *   After a successful advisory run, a new journal entry is committed to the repo
 *   so the persona accumulates memory across sessions.
 *
 * No-ops cleanly when the comment contains no persona trigger.
 *
 * 2026-05-21 (Claude): created for the comment-trigger persona lane.
 * 2026-05-22 (Claude): added EXECUTION mode so action comments produce a real
 * artifact (a Work Request that the pipeline implements), not just a reply.
 * 2026-05-23 (Claude): switched triggers from "@name" to "/name" so summoning a
 * persona no longer notifies the real GitHub user with that username.
 * 2026-05-24 (Claude): added /radiochaser persona; persistent journal read/write
 * so every persona carries memory across sessions; upgraded workflow permissions.
 *
 * Env: COMMENT_BODY, ISSUE_NUMBER, REPO (owner/repo), OPENROUTER_API_KEY, GH_TOKEN
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { instantiate, getPersonas } = require("./openrouter-personas");

// ---------------------------------------------------------------------------
// Journal helpers — persistent memory across sessions
// ---------------------------------------------------------------------------

const JOURNAL_DIR = path.join(__dirname, "..", "journals");
const JOURNAL_CONTEXT_LINES = 120; // max lines of journal history to inject as context

/**
 * Read the most recent N lines from a persona's journal file.
 * Returns empty string if the journal doesn't exist yet.
 */
function readJournal(handle) {
  const journalPath = path.join(JOURNAL_DIR, `${handle}.md`);
  if (!fs.existsSync(journalPath)) return "";
  const lines = fs.readFileSync(journalPath, "utf8").split("\n");
  // Take the last JOURNAL_CONTEXT_LINES lines (most recent entries are at top after header)
  const recent = lines.slice(0, JOURNAL_CONTEXT_LINES).join("\n");
  return recent;
}

/**
 * Prepend a new journal entry to a persona's journal file.
 * Entries go below the first `---` separator so the header stays at the top.
 */
function writeJournalEntry(handle, entry) {
  const journalPath = path.join(JOURNAL_DIR, `${handle}.md`);
  if (!fs.existsSync(journalPath)) {
    fs.writeFileSync(journalPath, `# ${handle} — Persistent Journal\n\n---\n\n${entry}\n`);
    return;
  }
  const existing = fs.readFileSync(journalPath, "utf8");
  // Insert after the first `---` line so entries are reverse-chronological
  const sepIndex = existing.indexOf("\n---\n");
  if (sepIndex === -1) {
    fs.writeFileSync(journalPath, existing + "\n---\n\n" + entry + "\n");
  } else {
    const before = existing.slice(0, sepIndex + 5); // includes "\n---\n"
    const after = existing.slice(sepIndex + 5);
    fs.writeFileSync(journalPath, before + "\n" + entry + "\n" + after);
  }
}

/**
 * Commit updated journal files to the repo and push so memory persists.
 * Requires contents:write permission (set in persona-comment-trigger.yml).
 * Non-fatal: a push failure logs a warning but does not abort the persona reply.
 */
function commitJournals() {
  try {
    execFileSync("git", ["config", "user.name", "revvel-persona-bot"], { encoding: "utf8" });
    execFileSync("git", ["config", "user.email", "personas@revvel.bot"], { encoding: "utf8" });
    execFileSync("git", ["add", JOURNAL_DIR], { encoding: "utf8" });
    const status = execFileSync("git", ["status", "--porcelain", JOURNAL_DIR], { encoding: "utf8" });
    if (!status.trim()) {
      console.log("ℹ️ No journal changes to commit.");
      return;
    }
    execFileSync("git", ["commit", "-m", "chore: update persona journals [skip ci]"], { encoding: "utf8" });
    execFileSync("git", ["push"], { encoding: "utf8" });
    console.log("✅ Journal committed and pushed.");
  } catch (err) {
    console.warn(`⚠️ Journal commit failed (non-fatal): ${err.message}`);
  }
}

/**
 * Build a journal context block to prepend to the persona's system prompt.
 * Returns empty string when the journal is empty or doesn't exist.
 */
function buildJournalContext(handle) {
  const content = readJournal(handle);
  if (!content || content.trim().length < 50) return "";
  return (
    "## Your Persistent Memory (recent journal entries)\n\n" +
    content +
    "\n\n---\n\n"
  );
}

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
  const handles = Object.keys(getPersonas()); // openrouter, oaudrey, mindmappr, professor

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

/**
 * Neutralize @mentions in any text a bot posts, so a persona reply can never
 * notify a real GitHub user (the persona's LLM output sometimes writes "@Name").
 * Inserts a zero-width space after the "@": it still renders as "@name" but is
 * no longer a valid mention, so GitHub sends no notification. Leaves emails
 * (foo@bar) effectively unchanged in appearance.
 */
function sanitizeMentions(text) {
  return String(text == null ? "" : text).replace(/@(?=[A-Za-z0-9_-])/g, "@​");
}

function postComment(repo, issueNumber, markdown) {
  const tmpFile = "/tmp/persona-comment-reply.md";
  fs.writeFileSync(tmpFile, sanitizeMentions(markdown));
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
  const today = new Date().toISOString().slice(0, 10);

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

    // Log execution actions to the journal too
    const execEntry =
      `### ${today} — Issue #${issueNumber} (execution)\n` +
      `**Action:** \`${command.action}\`  \n` +
      `**Task:** ${command.task.slice(0, 200)}  \n` +
      `**Filed WR:** #${num}\n`;
    writeJournalEntry(command.handle, execEntry);
    commitJournals();

    console.log(`✅ ${command.handle} filed Work Request #${num} for issue #${issueNumber}`);
    return;
  }

  // ADVISORY mode: read journal context, run persona, reply, update journal.
  const journalContext = buildJournalContext(command.handle);
  const task =
    command.task && command.task.length > 0
      ? journalContext + command.task
      : journalContext + "Review this thread and advise on the next concrete step.";

  console.log(`🫆 Summoning ${command.handle} (eager) for issue #${issueNumber}...`);
  const result = await instantiate(command.handle, { mode: "eager", task, silent: true });

  const reply = `## ${result.name} ${result.role ? `— ${result.role}` : ""}\n\n${result.text}\n\n---\n_Summoned via comment trigger · model: ${result.modelUsed || "unknown"} · [journal](../blob/main/journals/${command.handle}.md)_`;
  postComment(repo, issueNumber, reply);
  console.log(`✅ ${result.name} replied on issue #${issueNumber}`);

  // Persist this session to the journal so the persona remembers it next time.
  const summary = result.text.slice(0, 400).replace(/\n{3,}/g, "\n\n");
  const journalEntry =
    `### ${today} — Issue #${issueNumber}\n` +
    `**Task:** ${command.task.slice(0, 200)}  \n` +
    `**Response summary:** ${summary}  \n` +
    `**Model:** ${result.modelUsed || "unknown"}\n`;
  writeJournalEntry(command.handle, journalEntry);
  commitJournals();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = { parsePersonaCommand, sanitizeMentions };
