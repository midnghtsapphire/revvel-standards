#!/usr/bin/env node
"use strict";

/**
 * Persona Comment Runner
 *
 * Lets a new issue/PR comment summon a persona on demand:
 *   - "/professor <task>" / "/oaudrey ..." / "/mindmappr ..." / "/openrouter ..."
 *   - "/persona <name> <task>"
 *   - "/dragnet <error context>"  — deduplicates against open WR/PR, then files a perm-fix WR
 *
 * NOTE: triggers use a leading slash, NOT "@name". GitHub treats "@name" as a
 * mention of the real user account with that username and emails them — so the
 * old "@professor" syntax pinged a stranger who owns the @professor handle on
 * every comment. The slash form never notifies anyone.
 *
 * Two modes:
 *   - ADVISORY (a question): instantiates the persona and posts a text reply.
 *   - EXECUTION (an action verb like build/implement/create/fix/ship/do): instead of
 *     talking, the persona files a real Work Request issue and triggers the
 *     working coder (openrouter-coder) — so the persona DOES instead of describes.
 *
 * DRAGNET special behavior (EXECUTION mode):
 *   Before filing a new WR, DRAGNET searches open issues (label: work-request) and
 *   open PRs for an existing match. If a duplicate is found it links to it and
 *   skips creation; otherwise it files a permanent-fix WR.
 *
 * No-ops cleanly when the comment contains no persona trigger.
 *
 * 2026-05-21 (Claude): created for the comment-trigger persona lane.
 * 2026-05-22 (Claude): added EXECUTION mode so action comments produce a real
 *   artifact (a Work Request that the pipeline implements), not just a reply.
 * 2026-05-23 (Claude): switched triggers from "@name" to "/name" so summoning a
 *   persona no longer notifies the real GitHub user with that username.
 * 2026-06-20 (Claude): added /dragnet persona with WR/PR dedup-before-create logic
 *   and "do" as an execution verb so "do a perm fix" enters EXECUTION mode.
 *
 * Env: COMMENT_BODY, ISSUE_NUMBER, REPO (owner/repo), OPENROUTER_API_KEY, GH_TOKEN
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const { instantiate, getPersonas } = require("./openrouter-personas");

// Verbs that mean "do the thing" rather than "tell me about it".
// "do" is included so "/dragnet do a perm fix" and "/dragnet please do a fix"
// enter EXECUTION mode without requiring a more explicit verb.
const ACTION_VERBS = ["build", "implement", "create", "fix", "ship", "make", "add", "do"];

function detectAction(task) {
  const m = (task || "").match(/^\s*(build|implement|create|fix|ship|make|add|do)\b/i);
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
  const registry = getPersonas();
  const canonical = Object.keys(registry); // openrouter, oaudrey, mindmappr, professor
  // Collect every trigger token (canonical handles + role aliases like
  // `triager`, `citer`, `spotter`) and map back to the canonical handle so
  // the rest of the runner is unchanged.
  const triggerToHandle = {};
  for (const h of canonical) {
    triggerToHandle[h] = h;
    for (const alias of registry[h].aliases || []) {
      triggerToHandle[alias.toLowerCase()] = h;
    }
  }
  const triggers = Object.keys(triggerToHandle);

  // "/persona <name> <task...>" — canonical or alias both work.
  const slash = body.match(/\/persona\s+([a-z0-9_-]+)\s*([\s\S]*)/i);
  if (slash) {
    const requested = slash[1].toLowerCase();
    const handle = triggerToHandle[requested];
    if (handle) {
      const rest = (slash[2] || "").trim();
      return { handle, task: rest || body.trim(), action: detectAction(rest) };
    }
  }

  // "/<name> <task...>" shortcut. Leading slash so it never pings a real
  // GitHub user — `@triager` would notify whoever owns that username; the
  // slash form notifies no one.
  for (const trigger of triggers) {
    const shortcut = new RegExp(`(?:^|\\s)/${trigger}\\b`, "i");
    if (shortcut.test(body)) {
      const rest = body.replace(shortcut, " ").trim();
      return {
        handle: triggerToHandle[trigger],
        task: rest || body.trim(),
        action: detectAction(rest),
      };
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
 * Best-effort PR/issue context fetch. Personas have been answering "share the
 * repo URL and PR number" because the runner only passed them the comment
 * text. With this, the persona sees the title, body, labels, mergeability,
 * the most recent CI failures, and (for PRs) a head of the diff — enough to
 * actually diagnose without asking. All gh calls are soft-failed so a
 * permissions or network hiccup never blocks the reply.
 *
 * Returns a markdown block ready to prepend to the persona's task, or "" on
 * total failure.
 */
function gatherContext(repo, issueNumber) {
  const MAX_DIFF_CHARS = 6000;
  const sh = (args) => {
    try {
      return execFileSync("gh", args, { encoding: "utf8" }).trim();
    } catch (_err) {
      return "";
    }
  };

  // Both issues and PRs are addressable as `gh issue view` — but `gh pr view`
  // works only for PRs. Probe with `gh pr view` first; if it errors, it's an
  // issue.
  const prJson = sh([
    "pr",
    "view",
    String(issueNumber),
    "--repo",
    repo,
    "--json",
    "number,title,body,state,mergeable,mergeStateStatus,headRefOid,headRefName,baseRefName,additions,deletions,changedFiles,labels,isDraft,url",
  ]);

  if (prJson) {
    let pr = {};
    try {
      pr = JSON.parse(prJson);
    } catch (_e) {
      pr = {};
    }
    const labels = (pr.labels || []).map((l) => l.name).join(", ");

    // Most recent failed check runs on the head SHA.
    let failingChecks = "";
    if (pr.headRefOid) {
      const checksJson = sh([
        "api",
        `repos/${repo}/commits/${pr.headRefOid}/check-runs`,
        "--jq",
        '[.check_runs[] | select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out") | {name, conclusion, url: .html_url}] | .[0:8]',
      ]);
      if (checksJson && checksJson !== "[]") {
        failingChecks = checksJson;
      }
    }

    // First N chars of the diff so the persona can reason about *what changed*.
    let diffHead = "";
    if (pr.changedFiles && pr.changedFiles <= 50) {
      const diff = sh(["pr", "diff", String(issueNumber), "--repo", repo]);
      diffHead = diff.slice(0, MAX_DIFF_CHARS);
      if (diff.length > MAX_DIFF_CHARS) {
        diffHead += `\n\n[diff truncated at ${MAX_DIFF_CHARS} chars; full diff has ${diff.length} chars total]`;
      }
    } else if (pr.changedFiles) {
      diffHead = `[diff omitted — ${pr.changedFiles} changed files exceeds the 50-file cap; ask explicitly if needed]`;
    }

    return [
      "## PR Context",
      `- **Repository:** \`${repo}\``,
      `- **PR:** #${pr.number} — ${pr.title}`,
      `- **URL:** ${pr.url || `https://github.com/${repo}/pull/${pr.number}`}`,
      `- **State:** ${pr.state}${pr.isDraft ? " (draft)" : ""}`,
      `- **Mergeable:** ${pr.mergeable || "?"} / ${pr.mergeStateStatus || "?"}`,
      `- **Branches:** \`${pr.headRefName}\` → \`${pr.baseRefName}\``,
      `- **Diff size:** +${pr.additions || 0} / −${pr.deletions || 0} across ${pr.changedFiles || 0} file(s)`,
      `- **Labels:** ${labels || "(none)"}`,
      "",
      "### PR description",
      "```",
      (pr.body || "(empty)").slice(0, 2000),
      "```",
      "",
      "### Failing checks (latest)",
      failingChecks ? "```json\n" + failingChecks + "\n```" : "_(none failing)_",
      "",
      "### Diff head",
      diffHead ? "```diff\n" + diffHead + "\n```" : "_(no diff captured)_",
      "",
      "---",
      "",
    ].join("\n");
  }

  // Fall back to issue context.
  const issueJson = sh([
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repo,
    "--json",
    "number,title,body,state,labels,url",
  ]);
  if (!issueJson) return "";

  let issue = {};
  try {
    issue = JSON.parse(issueJson);
  } catch (_e) {
    return "";
  }
  const labels = (issue.labels || []).map((l) => l.name).join(", ");
  return [
    "## Issue Context",
    `- **Repository:** \`${repo}\``,
    `- **Issue:** #${issue.number} — ${issue.title}`,
    `- **URL:** ${issue.url || `https://github.com/${repo}/issues/${issue.number}`}`,
    `- **State:** ${issue.state}`,
    `- **Labels:** ${labels || "(none)"}`,
    "",
    "### Issue body",
    "```",
    (issue.body || "(empty)").slice(0, 4000),
    "```",
    "",
    "---",
    "",
  ].join("\n");
}

/**
 * Extract the most distinctive keywords from a free-text error description.
 * Returns up to 6 tokens that are likely to appear in a matching WR/PR title.
 *
 * @param {string} text - Free-text error description or comment body.
 * @returns {string[]}
 */
function errorKeywords(text) {
  return (text || "")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 3)
    .filter((t) => !["please", "that", "this", "with", "from", "perm", "including", "checking", "there", "already"].includes(t))
    .slice(0, 6);
}

/**
 * Search open issues (with label work-request) and open PRs for an existing
 * item that likely targets the same error. Returns the first match object
 * `{type: "issue"|"pr", number, title, url}` or `null` when nothing is found.
 *
 * Uses `gh search` so it works without extra credentials — falls through
 * gracefully on any CLI error so a search failure never blocks WR creation.
 *
 * @param {string} repo   - "owner/repo"
 * @param {string[]} kws  - Keywords to search for.
 * @returns {{type: string, number: number, title: string, url: string} | null}
 */
function findExistingWrOrPr(repo, kws) {
  if (!kws || kws.length === 0) return null;
  const query = kws.join(" ");
  try {
    // Search open WR issues first.
    const issueOut = execFileSync(
      "gh",
      [
        "search", "issues",
        `${query} repo:${repo} label:work-request is:issue is:open`,
        "--json", "number,title,url",
        "--limit", "5",
      ],
      { encoding: "utf8" }
    );
    const issues = JSON.parse(issueOut || "[]");
    if (issues.length > 0) {
      return { type: "issue", ...issues[0] };
    }
  } catch (_) {
    // gh search unavailable or returned no match — fall through to PR check.
  }
  try {
    // Search open PRs.
    const prOut = execFileSync(
      "gh",
      [
        "search", "prs",
        `${query} repo:${repo} is:pr is:open`,
        "--json", "number,title,url",
        "--limit", "5",
      ],
      { encoding: "utf8" }
    );
    const prs = JSON.parse(prOut || "[]");
    if (prs.length > 0) {
      return { type: "pr", ...prs[0] };
    }
  } catch (_) {
    // gh search unavailable — fall through.
  }
  return null;
}

/**
 * DRAGNET EXECUTION mode: check for an existing WR/PR before filing a new one.
 *
 * Returns an object `{action: "linked"|"created", ref: string, url?: string}`
 * so the caller can post an appropriate comment.
 *
 * @param {Object} opts
 * @param {string} opts.repo         - "owner/repo"
 * @param {string} opts.task         - The full DRAGNET task string.
 * @param {number|string} opts.requestedOn - Issue/PR number the command came from.
 * @returns {{action: string, ref: string, url: string | undefined}}
 */
function dragnetFixRequest({ repo, task, requestedOn }) {
  const kws = errorKeywords(task);
  const existing = findExistingWrOrPr(repo, kws);

  if (existing) {
    // A duplicate WR or PR already covers this error — link to it instead.
    return {
      action: "linked",
      ref: `#${existing.number}`,
      url: existing.url,
      type: existing.type,
      title: existing.title,
    };
  }

  // No duplicate — file a fresh permanent-fix WR.
  const title = `[WR][perm-fix] ${task}`.slice(0, 120);
  const body = [
    `Permanent-fix Work Request filed by the **DRAGNET** persona from a comment on #${requestedOn}.`,
    "",
    "## Error / Problem",
    "",
    task,
    "",
    "## Requirements",
    "",
    "- Root cause must be identified (not symptom-patching).",
    "- Fix must be permanent — no workarounds, no feature flags that mask the error.",
    "- Include regression test or CI assertion that would have caught this.",
    "",
    "_Duplicate check performed before filing: no matching open WR or PR was found._",
    "_Routed into the build pipeline via labels (`wr:code` → openrouter-coder)._",
    "_The coder will implement this and open a pull request._",
  ].join("\n");
  const tmpFile = "/tmp/dragnet-workrequest.md";
  fs.writeFileSync(tmpFile, body);
  const out = execFileSync(
    "gh",
    [
      "issue", "create",
      "--repo", repo,
      "--title", title,
      "--body-file", tmpFile,
      "--label", "work-request",
      "--label", "openrouter",
      "--label", "wr:code",
      "--label", "perm-fix",
    ],
    { encoding: "utf8" }
  );
  const m = out.match(/\/issues\/(\d+)/);
  const num = m ? m[1] : out.trim();
  return { action: "created", ref: `#${num}`, url: out.trim().split(/\s+/).find((t) => t.startsWith("http")) };
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
    // DRAGNET special path: deduplicate against open WRs and PRs before filing.
    if (command.handle === "dragnet") {
      const result = dragnetFixRequest({
        repo,
        task: command.task,
        requestedOn: issueNumber,
      });
      if (result.action === "linked") {
        postComment(
          repo,
          issueNumber,
          `🕵️ **DRAGNET** found an existing ${result.type} that already covers this error.\n\n` +
            `**Duplicate:** ${result.ref} — _${result.title}_\n` +
            (result.url ? `${result.url}\n\n` : "\n") +
            `No new WR created. Track progress in the existing ${result.type} above.\n\n` +
            `_Duplicate check performed with keywords from the error description._`
        );
        console.log(`🕵️ DRAGNET found duplicate ${result.type} ${result.ref} — no new WR filed.`);
      } else {
        postComment(
          repo,
          issueNumber,
          `🕵️ **DRAGNET** checked for duplicates (no open WR or PR found) and filed a ` +
            `permanent-fix Work Request ${result.ref}.\n\n` +
            (result.url ? `${result.url}\n\n` : "") +
            `The build pipeline (\`wr:code\` → openrouter-coder) will implement the fix and open a PR.\n\n` +
            `_This is a permanent fix request — no workarounds, root cause required._`
        );
        console.log(`🕵️ DRAGNET filed perm-fix Work Request ${result.ref} for issue #${issueNumber}`);
      }
      return;
    }

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

  // ADVISORY mode for DRAGNET (no action verb): gather context and diagnose.
  // For DRAGNET advisory, always inject context so it can run the PLATO→JUDGE
  // pipeline against the live issue/PR state even without an explicit task.
  if (command.handle === "dragnet" && (!command.task || command.task.trim() === "")) {
    command.task = "Diagnose the error in this thread, check for an existing WR or PR, and recommend the permanent fix.";
  }

  const task =
    command.task && command.task.length > 0
      ? command.task
      : "Review this thread and advise on the next concrete step.";

  // Inject PR/issue context so the persona doesn't have to ask "what repo?
  // what PR? what error?" — the runtime already knows. Soft-failed: if we
  // can't fetch, fall through with the bare task and let the persona ask.
  const context = gatherContext(repo, issueNumber);
  const augmentedTask = context
    ? `${context}\nUser request:\n${task}\n\nNote: you already have the repo, the PR/issue, the labels, the failing checks, and the diff above. Do NOT ask the user to share these again — diagnose from the context.`
    : task;

  console.log(`🫆 Summoning ${command.handle} (eager) for issue #${issueNumber}...`);
  const result = await instantiate(command.handle, { mode: "eager", task: augmentedTask, silent: true });

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

module.exports = { parsePersonaCommand, sanitizeMentions, gatherContext };
