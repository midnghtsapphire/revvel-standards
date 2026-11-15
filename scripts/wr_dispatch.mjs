/**
 * WR DISPATCHER — routes a labeled issue to Manus (cloud) or Roo (local).
 * See standards/WR_DISPATCHER.md for the full operator manual.
 *
 * Env (set by .github/workflows/wr-dispatcher.yml):
 *   GH_TOKEN            — GitHub token for comments/commits (built-in GITHUB_TOKEN)
 *   MANUS_API_KEY       — Manus cloud agent API key (repo secret)
 *   OPENROUTER_API_KEY  — fleet OpenRouter key (repo secret; Roo route only)
 *   ISSUE_NUMBER        — issue to dispatch
 *   FORCED_ROUTE        — "" | "manus" | "roo" (from manual dispatch)
 *   REPO                — "owner/repo"
 *
 * Behavior:
 *   route=manus  -> create a Manus task from the WR, post the task URL as an issue comment.
 *   route=roo    -> commit wr/roo-queue/WR-<repo>-<N>.md (fleet conventions + WR body +
 *                   OpenRouter-drafted task plan) and comment where to find it.
 *   Idempotent: if the issue already has a "Dispatched" comment from this bot, it exits.
 */

const {
  GH_TOKEN, MANUS_API_KEY, OPENROUTER_API_KEY,
  ISSUE_NUMBER, FORCED_ROUTE, REPO,
} = process.env;

const GH = "https://api.github.com";
const MANUS = "https://api.manus.ai/v1";
const OPENROUTER = "https://openrouter.ai/api/v1";

if (!GH_TOKEN || !ISSUE_NUMBER || !REPO) {
  console.error("Missing GH_TOKEN / ISSUE_NUMBER / REPO");
  process.exit(1);
}

const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "revvel-wr-dispatcher",
};

async function gh(path, opts = {}) {
  const r = await fetch(`${GH}${path}`, { headers: ghHeaders, ...opts });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  const [owner, repo] = REPO.split("/");
  const issue = await gh(`/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}`);
  const labels = issue.labels.map((l) => l.name);
  const route = FORCED_ROUTE || (labels.includes("manus") ? "manus"
    : labels.includes("roo") ? "roo" : null);

  if (!route) {
    console.log("No dispatch label (manus/roo) — nothing to do.");
    return;
  }

  // Idempotency: skip if we already dispatched this issue.
  const comments = await gh(`/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments?per_page=100`);
  if (comments.some((c) => c.body.includes("**WR dispatcher:** dispatched") && c.user.type === "Bot")) {
    console.log("Already dispatched — exiting.");
    return;
  }

  const title = issue.title.trim();
  const body = (issue.body || "(empty body)").trim();

  if (route === "manus") {
    if (!MANUS_API_KEY) throw new Error("MANUS_API_KEY secret is not set on this repo.");
    const prompt = [
      `You are executing a Work Request (WR) in the GitHub repo ${REPO}.`,
      `Work on a branch named manus/wr-${ISSUE_NUMBER}-<slug>, open ONE pull request`,
      `whose body contains "Closes #${ISSUE_NUMBER}", and stop there — a human merges.`,
      `Append-only files (LEDGER.md, CHANGELOG.md, decisions.jsonl): append, never rewrite.`,
      `No secrets in git. If acceptance criteria are ambiguous, comment on the issue and stop.`,
      ``,
      `WR #${ISSUE_NUMBER}: ${title}`,
      ``,
      body,
    ].join("\n");

    const r = await fetch(`${MANUS}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", API_KEY: MANUS_API_KEY },
      body: JSON.stringify({ prompt, agentProfile: "manus-1.6" }),
    });
    if (!r.ok) throw new Error(`Manus API: ${r.status} ${await r.text()}`);
    const task = await r.json();
    const url = task.task_url || task.share_url || "(no URL returned)";
    await gh(`/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: [
        `**WR dispatcher:** dispatched to **Manus** cloud agent.`,
        ``,
        `- Task: ${url}`,
        `- Task id: \`${task.task_id || "unknown"}\``,
        ``,
        `Manus will open a PR from branch \`manus/wr-${ISSUE_NUMBER}-*\`. Review and merge manually.`,
        `Docs: \`standards/WR_DISPATCHER.md\`.`,
      ].join("\n") }),
    });
    console.log(`Dispatched to Manus: ${url}`);
    return;
  }

  // route === "roo"
  let plan = "(OpenRouter key not set — write the task plan by hand below.)";
  if (OPENROUTER_API_KEY) {
    const r = await fetch(`${OPENROUTER}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `You are preparing a coding task for the Roo-Code VS Code agent.\n` +
            `Repo: ${REPO}. Produce a concise, numbered implementation plan (max 12 steps) for this Work Request.\n` +
            `Name concrete files to create/edit where obvious. No preamble, no fluff.\n\n` +
            `WR #${ISSUE_NUMBER}: ${title}\n\n${body}`,
        }],
      }),
    });
    if (r.ok) {
      plan = (await r.json()).choices?.[0]?.message?.content?.trim() || plan;
    } else {
      console.warn(`OpenRouter draft failed (${r.status}) — writing pack without plan.`);
    }
  }

  const pack = [
    `# Roo task pack — ${repo}#${ISSUE_NUMBER}: ${title}`,
    ``,
    `WR: #${ISSUE_NUMBER} — ${issue.html_url}`,
    `Labels: ${labels.join(", ") || "none"}`,
    `Generated: ${new Date().toISOString()} by wr-dispatcher`,
    ``,
    `## Fleet conventions (binding)`,
    ``,
    `- Branch: \`roo/wr-${ISSUE_NUMBER}-<slug>\`; one PR per WR; PR body links \`Closes #${ISSUE_NUMBER}\`.`,
    `- Comment \`Claiming — Roo\` and self-assign before coding.`,
    `- Append-only files (LEDGER.md, CHANGELOG.md, decisions.jsonl): append, never rewrite.`,
    `- New behavior ships with tests where a suite exists. No secrets in git.`,
    `- Ambiguous acceptance criteria: comment on the issue and stop. Do not guess.`,
    `- Do not merge your own PR.`,
    ``,
    `## Suggested plan (drafted by OpenRouter — verify before executing)`,
    ``,
    plan,
    ``,
    `## WR body`,
    ``,
    body,
    ``,
  ].join("\n");

  const path = `wr/roo-queue/WR-${repo}-${ISSUE_NUMBER}.md`;
  let sha;
  try {
    sha = (await gh(`/repos/${owner}/${repo}/contents/${path}`)).sha;
  } catch { /* new file */ }
  await gh(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `chore(wr): Roo prompt pack for WR #${ISSUE_NUMBER}`,
      content: Buffer.from(pack).toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });

  await gh(`/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: [
      `**WR dispatcher:** queued for **Roo-Code** (local).`,
      ``,
      `- Prompt pack: \`${path}\` (committed to this repo)`,
      `- Open it, paste into Roo with your OpenRouter key configured, and let it run.`,
      `- Conventions are embedded in the pack. Docs: \`standards/WR_DISPATCHER.md\`.`,
    ].join("\n") }),
  });
  console.log(`Roo prompt pack committed: ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
