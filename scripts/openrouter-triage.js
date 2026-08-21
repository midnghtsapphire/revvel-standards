#!/usr/bin/env node
"use strict";

const https = require("https");
const { assertCloudAllowed } = require("./llm-spend-gate");
const fs = require("fs");
const path = require("path");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const ISSUE_NUMBER = process.env.ISSUE_NUMBER || "";
const ISSUE_TITLE = process.env.ISSUE_TITLE || "";
const ISSUE_BODY = process.env.ISSUE_BODY || "";
const EVENT_KIND = process.env.EVENT_KIND || "issue";
const PROMPT = process.env.PROMPT || "";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";
const MAX_PROMPT_COMMENTS = 8;
const MAX_COMMENT_PREVIEW_CHARS = 500;
const MAX_URLS_IN_CONTEXT = 25;
const COMMENTS_PER_PAGE = 20;

function unquoteYamlScalar(value) {
  const trimmed = String(value || "").trim();
  return trimmed.replace(/^["']|["']$/g, "");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadAgentModelProfile(profileName) {
  const configPath = path.resolve(__dirname, "../.github/agent-models.yml");
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const profile = {};
    let inProfiles = false;
    let inTargetProfile = false;

    for (const line of raw.split(/\r?\n/)) {
      if (/^profiles:\s*$/.test(line)) {
        inProfiles = true;
        continue;
      }
      if (!inProfiles) continue;

      const profileHeader = line.match(/^ {2}([A-Za-z0-9_]+):\s*$/);
      if (profileHeader) {
        inTargetProfile = profileHeader[1] === profileName;
        continue;
      }
      if (!inTargetProfile) continue;

      const scalar = line.match(/^ {4}(primary|fallback|max_tokens|provider):\s*(.+?)\s*$/);
      if (scalar) {
        profile[scalar[1]] = unquoteYamlScalar(scalar[2]);
      }
    }

    return profile;
  } catch (error) {
    console.log(`::warning::Could not read ${configPath}: ${error.message}`);
    return {};
  }
}

const TRIAGE_PROFILE = loadAgentModelProfile("triage");
const MODEL = process.env.MODEL || TRIAGE_PROFILE.primary || "openai/gpt-4o-mini";
const MODEL_FALLBACK = process.env.MODEL_FALLBACK || TRIAGE_PROFILE.fallback || "anthropic/claude-haiku-4.5";
const MAX_OUTPUT_TOKENS = parsePositiveInt(
  process.env.MAX_OUTPUT_TOKENS,
  parsePositiveInt(TRIAGE_PROFILE.max_tokens, 1500),
);
const PRIMARY_OPENROUTER_MODELS = [...new Set([MODEL, MODEL_FALLBACK].filter(Boolean))];

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
      : "Triage tried every AI lane and all failed. This item has been labelled " +
        "`openrouter:triage-failed` + `needs-human` so it does not sit silently. " +
        "A later success will clear these labels automatically.",
    "",
    "<details><summary>For whoever is troubleshooting (you may not be the repo owner)</summary>",
    "",
    "Triage cascades so it never dead-ends while keeping the hot path cheap:",
    "",
    "1. **OpenRouter SSOT triage profile** — requires `OPENROUTER_API_KEY` tied to a **funded/verified** account. " +
      "OpenRouter is *not* free-for-all: even `:free` models need a real, credited account, so a missing/unfunded key returns `401/402/403/429`, not a completion. Check the key **and** the account balance at <https://openrouter.ai/credits>.",
    "2. **GitHub Models** — uses `GITHUB_TOKEN` and the same small-output triage budget.",
    "3. **Perplexity (keyless)** — the no-API safety net. Needs `python3` + the `perplexity-ai` bridge (the workflow installs it). If this also failed, check the bridge install / network.",
    "",
    "If every AI lane is down, add another keyless or repository-local lane in `scripts/openrouter-triage.js` → `triageWithFallback()`. Rule: always fall back to something.",
    "</details>",
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
    "COST-GOVERNED TRIAGE:",
    "- Keep the response concise: short bullets, no broad research packet, no repeated issue text.",
    "- Use only context already present in the issue, PR, comments, or observed URLs.",
    "- Include marketing/SEO signals only when they change the immediate routing decision; otherwise write `N/A`.",
    "- Cite submitted URLs when they are relevant; do not invent external citations.",
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
    PROMPT ? `\n\nADDITIONAL INSTRUCTIONS:\n${PROMPT}` : "",
  ].join("\n");
}

function buildUserPrompt({ eventKind, issueNumber, title, body, comments = [] }) {
  const promptComments = comments.slice(0, MAX_PROMPT_COMMENTS);
  const urlContext = collectUrlContext([title, body, ...promptComments.map((comment) => comment.body || "")]);
  const commentContext =
    promptComments.length > 0
      ? promptComments
          .map((comment, index) => {
            const author = comment.author || "unknown";
            const raw = String(comment.body || "").trim();
            const compact = raw.replace(/\s+/g, " ").slice(0, MAX_COMMENT_PREVIEW_CHARS);
            return `Comment ${index + 1} (${author}): ${compact || "(empty comment)"}`;
          })
          .join("\n")
      : "(no comments provided)";

  return [
    `Repository: ${GITHUB_REPOSITORY}`,
    `Event kind: ${eventKind}`,
    `Number: #${issueNumber}`,
    `Title: ${title || "(no title)"}`,
    "Body:",
    body && body.trim().length > 0 ? body : "(no body provided)",
    "",
    "Recent comments (for Q&A/context):",
    commentContext,
    "",
    "URLs observed in title/body/comments (LinkedIn safety redirects unwrapped when possible):",
    urlContext || "(no URLs detected)",
  ].join("\n\n");
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = String(rawUrl).trim().replace(/[),.;!?]+$/g, "");
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const isLinkedInHost = host === "linkedin.com" || host.endsWith(".linkedin.com");
  if (isLinkedInHost && path.startsWith("/safety/go")) {
    const embeddedEntry = [...parsed.searchParams.entries()].find(([key]) => key.toLowerCase() === "url");
    const embedded = embeddedEntry?.[1];
    if (embedded) {
      let unwrapped = embedded;
      if (embedded.includes("%")) {
        try {
          unwrapped = decodeURIComponent(embedded);
        } catch {
          unwrapped = embedded;
        }
      }
      return unwrapped.trim();
    }
  }

  return trimmed;
}

function extractUrls(text) {
  if (!text) return [];
  const matches = String(text).match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return [...new Set(matches.map((candidate) => normalizeUrl(candidate)).filter(Boolean))];
}

function collectUrlContext(chunks) {
  const all = [];
  for (const chunk of chunks || []) {
    all.push(...extractUrls(chunk));
  }
  return [...new Set(all)].slice(0, MAX_URLS_IN_CONTEXT).join("\n");
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

// OpenRouter free-tier models to try after the GitHub Models and keyless lanes.
// These ":free" models still need a real OR account + API key, and are often
// heavily rate-limited; treat this lane as "may work" rather than guaranteed.
// Override via OR_FREE_MODELS env var (comma-separated) for operator flexibility.
const OR_FREE_MODELS = process.env.OR_FREE_MODELS
  ? process.env.OR_FREE_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
  : [
    "deepseek/deepseek-r1:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
  ];
// Last verified: 2025-01-15 at https://openrouter.ai/docs#models
// IMPORTANT — OpenRouter "free" is not actually keyless/free-for-all:
// OpenRouter requires an API key tied to a FUNDED/verified account. Even the
// models tagged ":free" need a real account with credits (and have tight rate
// limits); an unfunded or missing key returns 401 / 402 / 403 / 429 rather than
// a completion. So we must NEVER treat OpenRouter as a guaranteed lane.
//
// Fleet rule (per owner): every failure must cascade to a working fallback —
// "every failure is where our agent fleet rises above the best because we
// planned for it." Triage ALWAYS cascades through all 6 lanes before surfacing
// a failure. Lane 6 (static rule-based) never fails. See docs/OPENROUTER_TRIAGE_PROCESS.md.
async function callOpenRouter(systemPrompt, userPrompt) {
  // Spend gate (#17850): refuse unless someone deliberately allowed it.
  assertCloudAllowed("openrouter-triage");
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;

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
      models: PRIMARY_OPENROUTER_MODELS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
    },
  });

  // Let ANY failure (402/credits, 401 bad key, 429 rate-limit, 5xx, network)
  // propagate to triageWithFallback(), which cascades to the next lane.
  return response?.choices?.[0]?.message?.content || "No triage output returned by model.";
}

// Lane 4: OpenRouter free-tier models. These can be cheaper than paid backup
// models, but still need a funded/verified OpenRouter account in practice.
async function callOpenRouterFreeModels(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} OpenRouter Triage (free-tier)`,
    },
    payload: {
      models: OR_FREE_MODELS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
    },
  });
  const text = response?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No triage output from OpenRouter free-tier models.");
  return text;
}

// Lane 5: Explicit OpenRouter backup models. Do not use openrouter/fusion here:
// `.github/agent-models.yml` deny-lists fusion/auto because they hide spend and
// route choice. Keeping the fallback list explicit makes this hot path auditable.
async function callOpenRouterBackupModels(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const backupModels = [...new Set(["deepseek/deepseek-chat", MODEL_FALLBACK, ...OR_FREE_MODELS].filter(Boolean))];
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} OpenRouter Triage (backup models)`,
    },
    payload: {
      models: backupModels,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
    },
  });
  const text = response?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No triage output from OpenRouter backup models.");
  return text;
}

// Lane 5: GitHub Models API — uses GITHUB_TOKEN (always present in Actions).
// Calls gpt-4o-mini via Azure-hosted GitHub Models inference endpoint.
// This lane never requires OPENROUTER_API_KEY.
async function callGitHubModels(systemPrompt, userPrompt) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not available");
  const response = await requestJson({
    hostname: "models.inference.ai.azure.com",
    pathName: "/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "revvel-openrouter-triage-script",
    },
    payload: {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    },
  });
  const text = response?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No triage output from GitHub Models.");
  return text;
}

// Lane 6: Static rule-based fallback — keyword matching on the issue text.
// Never throws. Used as the last resort when all AI lanes are unavailable.
function callStaticFallback(systemPrompt, userPrompt) {
  try {
    const text = (userPrompt || "").toLowerCase();
    const labels = [];
    if (/\bbug\b|error|fail|crash|broken|exception|traceback/.test(text)) labels.push("bug");
    if (/feature|request|add|new|implement|support/.test(text)) labels.push("enhancement");
    if (/doc|readme|wiki|typo|spelling/.test(text)) labels.push("documentation");
    if (/question|\bhow\b|\bwhy\b|\bwhat\b|help/.test(text)) labels.push("triage:needs-info");
    if (/security|vuln|cve|exploit|injection/.test(text)) labels.push("security");
    if (/perf|slow|latency|timeout|speed/.test(text)) labels.push("bug");
    if (/ci|workflow|action|pipeline|deploy/.test(text)) labels.push("workflow-failure");
    const classification = labels.length ? labels.join(", ") : "triage";
    return [
      "## 1) Classification",
      `${classification} (rule-based — all AI lanes unavailable)`,
      "",
      "## 2) Suggested Labels",
      labels.length
        ? labels.map((l) => `- \`${l}\``).join("\n")
        : "- `triage`",
      "## 3) Next Actions",
      "- Human review required — all AI triage lanes were unavailable.",
      "- Check OpenRouter account balance at <https://openrouter.ai/credits>,",
      "  Perplexity bridge installation, and GITHUB_TOKEN permissions.",
      "",
      "## 4) Human Attention",
      "**Yes** — all automated AI triage failed. This is a rule-based stub.",
      "",
      "## 5) Marketing & SEO Signals",
      "N/A — static fallback mode.",
    ].join("\n");
  } catch (_) {
    return "## Triage\n\nAll AI lanes failed. Manual review required.\n\n- `needs-human`";
  }
}

async function callPerplexityNoKey(systemPrompt, userPrompt) {
  // Use the Perplexity No-Key Python bridge
  const { execSync, execFileSync } = require("child_process");
  const installHint = 'python3 -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"';
  const pythonScript = buildPerplexityTriageScript(installHint);

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

function buildPerplexityTriageScript(installHint) {
  const installHintLiteral = JSON.stringify(installHint);
  return `
import sys
INSTALL_HINT = ${installHintLiteral}
try:
    from perplexity import LabsClient, Client
except Exception as exc:
    raise SystemExit(f"Missing no-key Perplexity dependency ({exc}). Install with: {INSTALL_HINT}")
    raise SystemExit(f'Missing no-key Perplexity dependency ({exc}). Install with: ${installHint}')

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

async function fetchIssueComments() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo || !ISSUE_NUMBER) return [];
  try {
    const payload = await requestJson({
      hostname: "api.github.com",
      pathName:
        `/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments` +
        `?per_page=${COMMENTS_PER_PAGE}&sort=created&direction=desc`,
      method: "GET",
      headers: {
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
        "User-Agent": "revvel-openrouter-triage-script",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!Array.isArray(payload)) return [];
    return payload.map((comment) => ({
      author: comment?.user?.login || "unknown",
      body: String(comment?.body || ""),
    }));
  } catch (err) {
    console.log(`::warning::Could not fetch comments for #${ISSUE_NUMBER}: ${err.message}`);
    return [];
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

// Always-fall-back triage cascade. Returns { text, lane, model }.
// Cascades through all 6 lanes in cost-governed order; lane 6 (static
// rule-based) never throws, so this function always returns successfully.
//   1. OpenRouter SSOT triage profile — cheap primary + explicit fallback.
//   2. GitHub Models — gpt-4o-mini via Azure; uses GITHUB_TOKEN.
//   3. Keyless Perplexity bridge — needs no API key (python3 + perplexity-ai).
//   4. OpenRouter free-tier models — cheap but still account/key dependent.
//   5. Explicit OpenRouter backup models — no auto/fusion hidden routing.
//   6. Static rule-based fallback — never throws; keyword-only output so that
//      every issue always receives some triage result.
// Lane 6 never fails, so triageWithFallback always returns a result.
//
// WR-4481 / WR-4474: HTTP 402/429 on the primary OpenRouter lane is an
// *explicit* trigger (config/routing-failover.yml) to jump straight to the
// keyless Perplexity tier-2 target — not a prose "try something else" note.
// Credit exhaustion must never stall triage waiting on a funded key.
async function triageWithFallback(systemPrompt, userPrompt) {
  const {
    extractStatusCode,
    decideFailover,
    hasExplicitKeylessFailover,
  } = require("./lane-failover");
  const { appendFailureLedger } = require("./failure-ledger");

  // Lane 1: OpenRouter SSOT triage profile.
  if (OPENROUTER_API_KEY) {
    try {
      const text = await callOpenRouter(systemPrompt, userPrompt);
      return { text, lane: "OpenRouter SSOT triage", model: PRIMARY_OPENROUTER_MODELS.join(" → ") };
    } catch (err) {
      const status = extractStatusCode(err);
      const decision = decideFailover({ status });
      console.log(
        `::warning::Lane 1 (OpenRouter) failed (${err.message}). ` +
          `WR-4481 decision=${decision.action} trigger=${decision.trigger}.`,
      );

      // Explicit 402/429 (and configured failover triggers): skip intermediate
      // funded lanes and go to keyless Perplexity immediately.
      const creditOrRate =
        status === 402 ||
        status === 429 ||
        decision.action === "failover" ||
        decision.action === "backoff_then_failover";

      if (creditOrRate && decision.toLane && decision.toLane.keyless) {
        try {
          appendFailureLedger({
            agent: "openrouter-triage",
            class: status === 402 ? "lane-402" : status === 429 ? "lane-429" : "lane-failover",
            trigger: String(status || decision.trigger || "unknown"),
            lane: `openrouter→${decision.toLane.provider}`,
            repo: GITHUB_REPOSITORY,
            task_ref: ISSUE_NUMBER ? `#${ISSUE_NUMBER}` : undefined,
            summary: `Primary OpenRouter ${status}: failover to keyless ${decision.toLane.id}`,
            root_cause: decision.reason,
          });
        } catch (ledgerErr) {
          console.log(`::warning::FAILURE-LEDGER write failed: ${ledgerErr.message}`);
        }

        try {
          const text = await callPerplexityNoKey(systemPrompt, userPrompt);
          return {
            text,
            lane: "Perplexity (keyless) [WR-4481 402/429 failover]",
            model: "perplexity/sonar",
            failover: decision,
            keylessFailoverWired: hasExplicitKeylessFailover(),
          };
        } catch (pplxErr) {
          console.log(
            `::warning::Keyless Perplexity failover failed (${pplxErr.message}). Continuing cascade.`,
          );
        }
      }
    }
  } else {
    console.log("::warning::OPENROUTER_API_KEY not configured — skipping lane 1.");
  }

  // Lane 2: GitHub Models (gpt-4o-mini via Azure; always available in Actions)
  try {
    const text = await callGitHubModels(systemPrompt, userPrompt);
    return { text, lane: "GitHub Models", model: "gpt-4o-mini" };
  } catch (err) {
    console.log(`::warning::Lane 2 (GitHub Models) failed (${err.message}). Trying lane 3.`);
  }

  // Lane 3: Keyless Perplexity bridge
  try {
    const text = await callPerplexityNoKey(systemPrompt, userPrompt);
    return { text, lane: "Perplexity (keyless)", model: "perplexity/sonar" };
  } catch (err) {
    console.log(`::warning::Lane 3 (Perplexity keyless) failed (${err.message}). Trying lane 4.`);
  }

  // Lane 4: OpenRouter free-tier models.
  if (OPENROUTER_API_KEY) {
    try {
      const text = await callOpenRouterFreeModels(systemPrompt, userPrompt);
      return { text, lane: "OpenRouter free-tier", model: OR_FREE_MODELS[0] };
    } catch (err) {
      console.log(`::warning::Lane 4 (OpenRouter free-tier) failed (${err.message}). Trying lane 5.`);
    }
  }

  // Lane 5: Explicit OpenRouter backup models.
  if (OPENROUTER_API_KEY) {
    try {
      const text = await callOpenRouterBackupModels(systemPrompt, userPrompt);
      return { text, lane: "OpenRouter backup models", model: "deepseek/deepseek-chat" };
    } catch (err) {
      console.log(`::warning::Lane 5 (OpenRouter backup models) failed (${err.message}). Falling back to lane 6.`);
    }
  }

  // Lane 6: Static rule-based fallback — never throws
  const text = callStaticFallback(systemPrompt, userPrompt);
  return { text, lane: "static-fallback", model: "rule-based" };
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("ERROR: GITHUB_TOKEN is required.");
    process.exit(1);
  }
  if (!ISSUE_NUMBER) {
    console.error("ERROR: ISSUE_NUMBER is required.");
    process.exit(1);
  }

  const labelNames = parseLabelNamesFromYaml(path.resolve(process.cwd(), ".github/labels.yml"));
  const comments = await fetchIssueComments();
  const systemPrompt = buildSystemPrompt(labelNames);
  const userPrompt = buildUserPrompt({
    eventKind: EVENT_KIND,
    issueNumber: ISSUE_NUMBER,
    title: ISSUE_TITLE,
    body: ISSUE_BODY,
    comments,
  });

  let triage;
  let lane;
  let modelUsed;
  try {
    const result = await triageWithFallback(systemPrompt, userPrompt);
    triage = result.text;
    lane = result.lane;
    modelUsed = result.model;
  } catch (err) {
    // BOTH OpenRouter and the keyless lane failed — only now surface a failure
    // so the item never sits silently. The comment explains the funding fact so
    // a human (possibly not the repo owner) can troubleshoot.
    await reportTriageFailure({
      kind: "triage-failed",
      detail: `All triage lanes failed (OpenRouter + keyless Perplexity): ${err.message}`,
    });
    throw err;
  }

  const commentBody = [
    "🤖 **Automated Triage**",
    "",
    `Lane: \`${lane}\` · Model: \`${modelUsed}\``,
    `Event: \`${EVENT_KIND}\` · Item: #${ISSUE_NUMBER}`,
    "",
    triage,
  ].join("\n");

  await postGitHubComment(commentBody);
  // Success — clear failure labels from a previous run and remove triage:new
  // now that the item has been processed. Removing triage:new prevents the
  // stuck-label monitors (auto-reset-stuck-issues, stuck-label-automation)
  // from treating a successfully-triaged item as stuck, and stops the hourly
  // sweep from picking it up as a fresh candidate again.
  await removeGitHubLabels([FAILURE_LABELS.TRIAGE_FAILED, FAILURE_LABELS.NEEDS_KEY, "triage:new"]);
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
  buildPerplexityTriageScript,
  truncateForComment,
  normalizeUrl,
  extractUrls,
  collectUrlContext,
  loadAgentModelProfile,
  parsePositiveInt,
  triageWithFallback,
  TRIAGE_PROFILE,
  MODEL,
  MODEL_FALLBACK,
  MAX_OUTPUT_TOKENS,
  PRIMARY_OPENROUTER_MODELS,
  FAILURE_LABELS,
};
