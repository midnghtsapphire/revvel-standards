import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const WINDOW_MARKER = "<!-- revvel-agent-command-window:v1 -->";
const STATE_PREFIX = "<!-- revvel-agent-state:";
const MAX_INSTRUCTION_LENGTH = 4000;
const API_VERSION = "2026-03-10";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanInstruction(value) {
  return value
    .replace(/^[\s,;:|\-–—]+/, "")
    .replace(/[\s,;|]+$/, "")
    .trim()
    .slice(0, MAX_INSTRUCTION_LENGTH);
}

function commandEntries(config) {
  const entries = [];

  for (const [agent, definition] of Object.entries(config.agents ?? {})) {
    for (const name of definition.names ?? [agent]) {
      for (const prefix of ["/", "@"]) {
        entries.push({
          agent,
          alias: `${prefix}${name}`,
          displayName: definition.display_name ?? agent,
          lane: definition.lane ?? "general"
        });
      }
    }
  }

  return entries.sort((left, right) => right.alias.length - left.alias.length);
}

function lineMatches(line, entries) {
  const matches = [];

  for (const entry of entries) {
    const pattern = new RegExp(
      `(^|[\\s([{,;])(${escapeRegex(entry.alias)})(?![A-Za-z0-9_.-])`,
      "gi"
    );

    for (const match of line.matchAll(pattern)) {
      const start = match.index + match[1].length;
      matches.push({ ...entry, start, end: start + match[2].length, typed: match[2] });
    }
  }

  matches.sort((left, right) => left.start - right.start || right.alias.length - left.alias.length);

  const nonOverlapping = [];
  for (const match of matches) {
    const previous = nonOverlapping.at(-1);
    if (previous && match.start < previous.end) {
      continue;
    }
    nonOverlapping.push(match);
  }

  return nonOverlapping;
}

export function parseCommands(body, config) {
  const entries = commandEntries(config);
  const requests = new Map();
  let inFence = false;
  let showWindow = false;

  for (const line of String(body ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || /^>/.test(trimmed)) {
      continue;
    }

    if (/(^|[\s([{,;])\/agents(?![A-Za-z0-9_.-])/i.test(line)) {
      showWindow = true;
    }

    const matches = lineMatches(line, entries);
    if (matches.length === 0) {
      continue;
    }

    const segments = matches.map((match, index) => {
      const nextStart = matches[index + 1]?.start ?? line.length;
      return cleanInstruction(line.slice(match.end, nextStart));
    });
    const sharedInstruction = [...segments].reverse().find(Boolean) ?? "";

    matches.forEach((match, index) => {
      const instruction = segments[index] || (matches.length > 1 ? sharedInstruction : "");
      const existing = requests.get(match.agent);

      if (!existing) {
        requests.set(match.agent, {
          agent: match.agent,
          alias: match.typed,
          displayName: match.displayName,
          lane: match.lane,
          instruction
        });
        return;
      }

      if (instruction && !existing.instruction.includes(instruction)) {
        existing.instruction = cleanInstruction(
          [existing.instruction, instruction].filter(Boolean).join("\n")
        );
      }
    });
  }

  return { requests: [...requests.values()], showWindow };
}

export function isAuthorized(event, config) {
  const comment = event.comment ?? {};
  const login = String(comment.user?.login ?? "").toLowerCase();
  const association = String(comment.author_association ?? "").toUpperCase();
  const allowedUsers = (config.allowed_users ?? []).map((value) => String(value).toLowerCase());
  const allowedAssociations = (config.allowed_associations ?? []).map((value) =>
    String(value).toUpperCase()
  );

  if (comment.user?.type === "Bot") {
    return false;
  }

  return allowedUsers.includes(login) || allowedAssociations.includes(association);
}

export function parseWindowState(body) {
  const expression = new RegExp(`${escapeRegex(STATE_PREFIX)}([A-Za-z0-9_-]+) -->`);
  const match = String(body ?? "").match(expression);
  if (!match) {
    return { version: 1, agents: {} };
  }

  try {
    return JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
  } catch {
    return { version: 1, agents: {} };
  }
}

function markdown(value, maximum = 500) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .replace(/`/g, "'")
    .slice(0, maximum);
}

function statusLabel(status) {
  const values = {
    triggered: "🟣 Triggered",
    delivered: "🔵 Delivered",
    working: "🟡 Working",
    completed: "🟢 Completed",
    failed: "🔴 Failed",
    "dispatch-failed": "🔴 Dispatch failed",
    "needs-adapter": "🟠 Needs adapter"
  };
  return values[status] ?? `⚪ ${markdown(status, 40)}`;
}

export function applyRequestsToState(state, requests, metadata) {
  const next = structuredClone(state ?? { version: 1, agents: {} });
  next.version = 1;
  next.number = metadata.number;
  next.url = metadata.url;
  next.updated_at = metadata.requestedAt;
  next.agents ??= {};

  for (const request of requests) {
    next.agents[request.agent] = {
      display_name: request.displayName,
      lane: request.lane,
      status: "triggered",
      requested_by: metadata.requestedBy,
      requested_at: metadata.requestedAt,
      trigger: request.alias,
      instruction:
        request.instruction || "Review this work item and follow the WR requirements.",
      request_id: metadata.requestIds?.[request.agent] ?? ""
    };
  }

  return next;
}

export function updateAgentStatus(state, payload) {
  const next = structuredClone(state ?? { version: 1, agents: {} });
  next.agents ??= {};
  const current = next.agents[payload.agent] ?? {
    display_name: payload.agent,
    lane: "general",
    requested_by: payload.requested_by ?? "agent gateway",
    trigger: payload.agent,
    instruction: ""
  };

  current.status = String(payload.status ?? "working").toLowerCase();
  current.summary = String(payload.summary ?? "").slice(0, 500);
  current.request_id = payload.request_id ?? current.request_id ?? "";
  current.updated_at = new Date().toISOString();
  next.agents[payload.agent] = current;
  next.updated_at = current.updated_at;
  return next;
}

export function renderWindow(config, state) {
  const rows = Object.entries(state.agents ?? {}).map(([agent, item]) => {
    const instruction = item.summary || item.instruction || "—";
    return `| ${markdown(item.display_name || agent, 80)} | ${markdown(
      item.lane,
      120
    )} | ${statusLabel(item.status)} | \`${markdown(item.requested_by, 80)}\` | ${markdown(
      instruction
    )} |`;
  });

  const roster = Object.entries(config.agents ?? {})
    .map(([agent, definition]) => {
      const friendly = definition.names?.[0] ?? agent;
      return `\`/${friendly}\` or \`@${friendly}\``;
    })
    .join(" · ");

  const encodedState = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");

  return [
    WINDOW_MARKER,
    "## Agent Command Window",
    "",
    "Use either `/` or `@` for every friendly agent name. Use `/agents` to reopen this roster. Multiple agents may be requested in one comment.",
    "",
    "| Agent | Lane | State | Requested by | Instruction / result |",
    "|---|---|---|---|---|",
    ...(rows.length ? rows : ["| — | — | Waiting for a command | — | — |"]),
    "",
    `**Available triggers:** ${roster}`,
    "",
    `${STATE_PREFIX}${encodedState} -->`
  ].join("\n");
}

export function nativeAssignee(config, agent) {
  const login = config.agents?.[agent]?.github_assignee;
  return login ? String(login) : "";
}

export function buildDispatchPayload({ event, request, repository }) {
  const issue = event.issue;
  const requestId = `${event.comment.id}:${request.agent}`;

  return {
    version: "1",
    agent: request.agent,
    request_id: requestId,
    repository,
    number: issue.number,
    kind: issue.pull_request ? "pull_request" : "issue",
    url: issue.html_url,
    title: issue.title,
    instructions:
      request.instruction || "Review this work item and follow the WR requirements.",
    requested_by: event.comment.user.login
  };
}

class GitHubApi {
  constructor({ token, repository, apiUrl }) {
    this.token = token;
    this.repository = repository;
    this.apiUrl = apiUrl.replace(/\/$/, "");
  }

  async request(method, path, body) {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": API_VERSION
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`GitHub API ${method} ${path} failed (${response.status}): ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }

  async findWindow(number) {
    for (let page = 1; page <= 10; page += 1) {
      const comments = await this.request(
        "GET",
        `/repos/${this.repository}/issues/${number}/comments?per_page=100&page=${page}`
      );
      const existing = comments.find(
        (comment) => comment.user?.type === "Bot" && comment.body?.includes(WINDOW_MARKER)
      );
      if (existing) {
        return existing;
      }
      if (comments.length < 100) {
        break;
      }
    }
    return null;
  }

  async saveWindow(number, existing, body) {
    if (existing) {
      return this.request("PATCH", `/repos/${this.repository}/issues/comments/${existing.id}`, {
        body
      });
    }
    return this.request("POST", `/repos/${this.repository}/issues/${number}/comments`, { body });
  }

  async dispatch(eventType, clientPayload) {
    return this.request("POST", `/repos/${this.repository}/dispatches`, {
      event_type: eventType,
      client_payload: clientPayload
    });
  }

  async addAssignees(number, assignees) {
    const names = assignees.filter(Boolean);
    if (names.length === 0) return null;
    return this.request("POST", `/repos/${this.repository}/issues/${number}/assignees`, {
      assignees: names
    });
  }
}

async function handleComment({ event, config, api, repository }) {
  if (!isAuthorized(event, config)) {
    return;
  }

  const parsed = parseCommands(event.comment.body, config);
  if (!parsed.showWindow && parsed.requests.length === 0) {
    return;
  }

  const existing = await api.findWindow(event.issue.number);
  let state = parseWindowState(existing?.body);
  const requestedAt = new Date().toISOString();
  const requestIds = Object.fromEntries(
    parsed.requests.map((request) => [request.agent, `${event.comment.id}:${request.agent}`])
  );

  state = applyRequestsToState(state, parsed.requests, {
    number: event.issue.number,
    url: event.issue.html_url,
    requestedBy: event.comment.user.login,
    requestedAt,
    requestIds
  });

  await api.saveWindow(event.issue.number, existing, renderWindow(config, state));

  let failed = false;
  for (const request of parsed.requests) {
    const payload = buildDispatchPayload({ event, request, repository });
    try {
      const assignee = nativeAssignee(config, request.agent);
      if (assignee) {
        await api.addAssignees(event.issue.number, [assignee]);
      }
      await api.dispatch(config.dispatch_event ?? "agent_requested", payload);
    } catch (error) {
      failed = true;
      state = updateAgentStatus(state, {
        agent: request.agent,
        status: "dispatch-failed",
        summary: error.message,
        request_id: payload.request_id
      });
    }
  }

  const latestWindow = existing ?? (await api.findWindow(event.issue.number));
  await api.saveWindow(event.issue.number, latestWindow, renderWindow(config, state));

  if (failed) {
    throw new Error("One or more agent requests could not be dispatched.");
  }
}

async function handleStatus({ event, config, api }) {
  const payload = event.client_payload ?? {};
  const number = Number(payload.number);
  if (!number || !payload.agent || !config.agents?.[payload.agent]) {
    throw new Error("Invalid agent_status payload.");
  }

  const existing = await api.findWindow(number);
  let state = parseWindowState(existing?.body);
  state = updateAgentStatus(state, payload);
  await api.saveWindow(number, existing, renderWindow(config, state));
}

export async function main(environment = process.env) {
  const event = JSON.parse(await readFile(environment.GITHUB_EVENT_PATH, "utf8"));
  const config = JSON.parse(
    await readFile(environment.AGENT_ROUTER_CONFIG ?? ".github/agent-router.json", "utf8")
  );
  const api = new GitHubApi({
    token: environment.GITHUB_TOKEN,
    repository: environment.GITHUB_REPOSITORY,
    apiUrl: environment.GITHUB_API_URL ?? "https://api.github.com"
  });

  if (environment.GITHUB_EVENT_NAME === "issue_comment") {
    await handleComment({
      event,
      config,
      api,
      repository: environment.GITHUB_REPOSITORY
    });
    return;
  }

  if (environment.GITHUB_EVENT_NAME === "repository_dispatch") {
    await handleStatus({ event, config, api });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
