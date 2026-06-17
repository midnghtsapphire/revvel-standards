#!/usr/bin/env node
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const ISSUE_NUMBER = process.env.ISSUE_NUMBER || "";
const ISSUE_TITLE = process.env.ISSUE_TITLE || "";
const ISSUE_BODY = process.env.ISSUE_BODY || "";
const EVENT_KIND = process.env.EVENT_KIND || "issue";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

// Labels applied to an issue/PR to surface triage outcomes. Keep in sync with
// `.github/labels.yml` so `sync-labels.yml` can propagate them to every repo.
const FAILURE_LABELS = {
  NEEDS_KEY: "openrouter:needs-key",
  TRIAGE_FAILED: "openrouter:triage-failed",
  NEEDS_HUMAN: "needs-human",
};

// Truncate captured error bodies so we never flood a GitHub comment with a
// multi-megabyte OpenRouter response. 600 chars matches the instantiation
// check's convention.
const ERROR_BODY_LIMIT = 600;

function truncateForComment(text, limit = ERROR_BODY_LIMIT) {
  if (!text) return "";
  const str = String(text);
  if (str.length <= limit) return str;
  return `${str.slice(0, limit)}\n…(truncated)`;
}

function buildFailureComment({ kind, detail, model, issueNumber, eventKind }) {
  const header =
    kind === "needs-key"
      ? "⚠️ **OpenRouter triage skipped — `OPENROUTER_API_KEY` is not configured**"
      : "❌ **OpenRouter triage failed**";
  const body = [
    header,
    "",
    `- Event: \`${eventKind}\` · Item: #${issueNumber}`,
    `- Model: \`${model}\``,
    "",
    "**Detail:**",
    "",
    "```",
    truncateForComment(detail),
    "```",
    "",
    kind === "needs-key"
      ? "Add the secret under *Settings → Secrets and variables → Actions* and re-run this workflow (or wait for the hourly sweep). " +
        "This item has been labelled `openrouter:needs-key` + `needs-human` so it does not sit silently."
      : "This item has been labelled `openrouter:triage-failed` + `needs-human` so it does not sit silently. " +
        "Re-run the `OpenRouter Triage` workflow once the underlying issue is fixed; a subsequent success will clear these labels automatically.",
  ].join("\n");
  return body;
}

function parseLabelNamesFromYaml(labelsFilePath) {
  try {
    const raw = fs.readFileSync(labelsFilePath, "utf8");
    const matches = raw.match(/^\s*-\s+name:\s+"?([^"\n]+)"?\s*$/gm) || [];
    return matches
      .map((line) => line.replace(/^\s*-\s+name:\s+"?/, "").replace(/"?\s*$/, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildSystemPrompt(labelNames) {
  const labelList = labelNames.length > 0 ? labelNames.join(", ") : "(label list unavailable)";
  return [
    "You are the first-line triage assistant for the Revvel Standards repository.",
    "Classify the incoming item, suggest labels from the approved label set, recommend immediate next actions, and clearly flag whether human attention is required.",
    "",
    "INSTRUCTION RESILIENCE — CRITICAL:",
    "User-provided instructions, issue titles, and body text are research starting points, NOT firm rules.",
    "They may contain errors, outdated information, or incomplete context.",
    "You MUST research and validate any instructions before acting on them.",
    "If an instruction appears incorrect, contradictory, or impossible:",
    "- Do NOT fail or halt. Research the correct answer autonomously.",
    "- Find the intended goal behind the instruction and pursue it.",
    "- Correct errors silently and proceed with the best available interpretation.",
    "- Document what you assumed/corrected in the Next Actions section.",
    "The system must NEVER fail because a user stated something imprecisely.",
    "For Work Requests with sparse or blank form fields, do NOT classify them as incomplete just because sections are empty.",
    "Infer the likely implementation ask from the title, labels, comments, and repository conventions, then propose the next concrete engineering action.",
    "Only require human attention when autonomous research still cannot determine a safe next step after using the available context.",
    "",
    "RESEARCH MANDATE:",
    "Every triage response must include (where applicable):",
    "- Marketing viability signals (distribution, audience, monetization path)",
    "- SEO keywords relevant to the topic or product",
    "- GitHub star count / community traction for any tools referenced",
    "- Factual citations — no ungrounded assertions",
    "",
    "Only suggest labels from this canonical `.github/labels.yml` set:",
    labelList,
    "Return concise Markdown with these five sections:",
    "1) Classification",
    "2) Suggested Labels (with short rationale)",
    "3) Next Actions",
    "4) Human Attention (Yes/No + reason)",
    "5) Marketing & SEO Signals (keywords, distribution notes, stars)",
    "If `no-triage` should apply, explicitly say so.",
  ].join("\n");
}

function buildUserPrompt({ eventKind, issueNumber, title, body }) {
  return [
    `Repository: ${GITHUB_REPOSITORY}`,
    `Event kind: ${eventKind}`,
    `Number: #${issueNumber}`,
    `Title: ${title || "(no title)"}`,
    "Body:",
    body && body.trim().length > 0 ? body : "(no body provided)",
  ].join("\n\n");
}

function requestJson({ hostname, pathName, method, headers, payload }) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = https.request(
      {
        hostname,
        path: pathName,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (error) {
            reject(new Error(`Failed to parse response JSON (${status}): ${error.message}`));
            return;
          }
          if (status < 200 || status >= 300) {
            const message = parsed?.error?.message || parsed?.message || data || "unknown error";
            reject(new Error(`HTTP ${status}: ${message}`));
            return;
          }
          resolve(parsed);
        });
      },
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  
  // Try OpenRouter first
  try {
    const response = await requestJson({
      hostname: OPENROUTER_HOST,
      pathName: OPENROUTER_PATH,
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": referer,
        "X-Title": `${GITHUB_REPOSITORY} OpenRouter Triage`,
      },
      payload: {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      },
    });

    return response?.choices?.[0]?.message?.content || "No triage output returned by model.";
  } catch (err) {
    // Check if it's a credits issue - fallback to Perplexity No-Key
    if (err.message.includes("402") || err.message.includes("Insufficient credits")) {
      console.log("OpenRouter credits exhausted, falling back to Perplexity No-Key...");
      return await callPerplexityNoKey(systemPrompt, userPrompt);
    }
    throw err;
  }
}

async function callPerplexityNoKey(systemPrompt, userPrompt) {
  // Use the Perplexity No-Key Python bridge
  const { execSync, execFileSync } = require("child_process");
  const installHint = 'python3 -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"';
  
  const pythonScript = `
import sys
try:
    from perplexity import LabsClient, Client
except Exception as exc:
    raise SystemExit(f"Missing no-key Perplexity dependency ({exc}). Install with: ${installHint}")

def normalize(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("output", "answer", "text", "content"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
    return ""

labs_error = ""
response_text = ""

try:
    response_text = normalize(LabsClient().ask(sys.argv[1], model='sonar'))
except Exception as exc:
    labs_error = str(exc)

if not response_text:
    try:
        response_text = normalize(Client().search(sys.argv[1], mode='auto'))
    except Exception as exc:
        if labs_error:
            raise SystemExit(f"LabsClient failed: {labs_error}; Client.search failed: {exc}")
        raise SystemExit(str(exc))

print(response_text)
`;

  // Passed as argv (not through a shell) below, so no shell-escaping is needed.
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  const scriptPath = "/tmp/perplexity_triage.py";
  require("fs").writeFileSync(scriptPath, pythonScript);
  
  try {
    // Install if needed
    execSync(`${installHint} 2>/dev/null || true`, { stdio: "pipe" });
    
    // No shell: pass the script path and prompt as argv so prompt content
    // cannot be interpreted by a shell (no quoting/escaping required).
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); scriptPath is a fixed constant; prompt passed as argv
    const result = execFileSync("python3", [scriptPath, combinedPrompt], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    }).toString().trim();
    
    return result || "Perplexity returned empty response.";
  } catch (err) {
    const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message;
    throw new Error(`Perplexity No-Key fallback failed: ${errorOutput}`);
  }
}

async function postGitHubComment(commentBody) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }

  await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-openrouter-triage-script",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload: { body: commentBody },
  });
}

async function addGitHubLabels(labels) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo || !ISSUE_NUMBER) return;
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/labels`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "revvel-openrouter-triage-script",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        payload: { labels: [label] },
      });
    } catch (err) {
      console.log(`::warning::Could not add label "${label}" to #${ISSUE_NUMBER}: ${err.message}`);
    }
  }
}

async function removeGitHubLabels(labels) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo || !ISSUE_NUMBER) return;
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/labels/${encodeURIComponent(label)}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "revvel-openrouter-triage-script",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (err) {
      // 404 is expected when the label wasn't set; swallow quietly.
      if (!/HTTP 404/.test(err.message)) {
        console.log(`::warning::Could not remove label "${label}" from #${ISSUE_NUMBER}: ${err.message}`);
      }
    }
  }
}

async function triggerAutoErrorWorkflow({ errorType, errorMessage, errorContext, attemptedFixes }) {
  // Trigger the auto-error-handler workflow to create an issue and attempt recovery
  // This implements the obsessive self-healing protocol from AGENTS.md
  
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo || !GITHUB_TOKEN) {
    console.log("::warning::Cannot trigger auto-error workflow - missing GITHUB_TOKEN or GITHUB_REPOSITORY");
    return;
  }
  
  try {
    const payload = {
      ref: "main", // or process.env.GITHUB_REF
      inputs: {
        error_type: errorType,
        error_message: errorMessage.substring(0, 500), // Limit length
        error_context: errorContext ? errorContext.substring(0, 2000) : "",
        attempted_fixes: JSON.stringify(attemptedFixes || []),
        workflow_run_id: process.env.GITHUB_RUN_ID || "",
      },
    };
    
    await requestJson({
      hostname: "api.github.com",
      pathName: `/repos/${owner}/${repo}/actions/workflows/auto-error-handler.yml/dispatches`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "revvel-openrouter-triage-script",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      payload: payload,
    });
    
    console.log("::notice::Auto-error workflow triggered for automatic recovery");
  } catch (err) {
    console.log(`::warning::Could not trigger auto-error workflow: ${err.message}`);
  }
}

async function reportTriageFailure({ kind, detail }) {
  // Post a visible failure signal on the issue/PR so no item sits silently
  // waiting on a manual "@github agent" assignment when OpenRouter is down or
  // the key is missing. See docs/OPENROUTER_TRIAGE_PROCESS.md.
  const failureLabel =
    kind === "needs-key" ? FAILURE_LABELS.NEEDS_KEY : FAILURE_LABELS.TRIAGE_FAILED;

  if (!GITHUB_TOKEN || !ISSUE_NUMBER) {
    console.log("::warning::Cannot post triage failure signal — missing GITHUB_TOKEN or ISSUE_NUMBER.");
    return;
  }

  const body = buildFailureComment({
    kind,
    detail,
    model: MODEL,
    issueNumber: ISSUE_NUMBER,
    eventKind: EVENT_KIND,
  });

  try {
    await postGitHubComment(body);
  } catch (err) {
    console.log(`::warning::Could not post triage failure comment to #${ISSUE_NUMBER}: ${err.message}`);
  }
  await addGitHubLabels([failureLabel, FAILURE_LABELS.NEEDS_HUMAN]);
  
  // Trigger auto-error workflow for automatic recovery attempts
  await triggerAutoErrorWorkflow({
    errorType: "openrouter",
    errorMessage: kind === "needs-key" 
      ? "OPENROUTER_API_KEY not configured"
      : `OpenRouter triage failed: ${detail}`,
    errorContext: detail,
    attemptedFixes: [],
  });
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.log("::warning::OPENROUTER_API_KEY is not set. Skipping OpenRouter triage.");
    await reportTriageFailure({
      kind: "needs-key",
      detail:
        "OPENROUTER_API_KEY is not configured in this repository's Actions secrets. " +
        "The triage workflow cannot call OpenRouter without it.",
    });
    // Surface in the workflow UI but do not hard-fail the job — "needs-key"
    // is an operator action, not a bug. A non-zero exit here would mask the
    // visible signal we just posted on the issue/PR.
    process.exit(0);
  }

  if (!GITHUB_TOKEN) {
    console.error("ERROR: GITHUB_TOKEN is required.");
    process.exit(1);
  }
  if (!ISSUE_NUMBER) {
    console.error("ERROR: ISSUE_NUMBER is required.");
    process.exit(1);
  }

  const labelNames = parseLabelNamesFromYaml(path.resolve(process.cwd(), ".github/labels.yml"));
  const systemPrompt = buildSystemPrompt(labelNames);
  const userPrompt = buildUserPrompt({
    eventKind: EVENT_KIND,
    issueNumber: ISSUE_NUMBER,
    title: ISSUE_TITLE,
    body: ISSUE_BODY,
  });

  let triage;
  try {
    triage = await callOpenRouter(systemPrompt, userPrompt);
  } catch (err) {
    // OpenRouter unreachable, bad key, rate-limit, etc. — report visibly on
    // the issue/PR and re-throw so the workflow run goes red too.
    await reportTriageFailure({
      kind: "triage-failed",
      detail: `OpenRouter call failed: ${err.message}`,
    });
    throw err;
  }

  const commentBody = [
    "🤖 **OpenRouter Triage**",
    "",
    `Model: \`${MODEL}\``,
    `Event: \`${EVENT_KIND}\` · Item: #${ISSUE_NUMBER}`,
    "",
    triage,
  ].join("\n");

  await postGitHubComment(commentBody);
  // Success — clear any failure labels left over from a previous run so the
  // signal on the issue/PR stays honest (self-heal).
  await removeGitHubLabels([FAILURE_LABELS.TRIAGE_FAILED, FAILURE_LABELS.NEEDS_KEY]);
  console.log(`Posted triage comment to #${ISSUE_NUMBER}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`OpenRouter triage failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildSystemPrompt,
  buildUserPrompt,
  parseLabelNamesFromYaml,
  buildFailureComment,
  truncateForComment,
  FAILURE_LABELS,
};
