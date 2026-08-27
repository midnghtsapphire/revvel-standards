import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyRequestsToState,
  buildDispatchPayload,
  isAuthorized,
  nativeAssignee,
  parseCommands,
  parseWindowState,
  renderWindow,
  updateAgentStatus
} from "../scripts/agent-command-router.mjs";

const config = JSON.parse(
  await readFile(new URL("../agent-router.json", import.meta.url), "utf8")
);

test("both slash and at-sign aliases summon the same friendly agent", () => {
  const parsed = parseCommands("/dragnet trace dependencies\n@ClaudeCode review the patch", config);

  assert.deepEqual(
    parsed.requests.map((request) => request.agent),
    ["dragnet", "claudecode"]
  );
  assert.equal(parsed.requests[0].instruction, "trace dependencies");
  assert.equal(parsed.requests[1].instruction, "review the patch");
});

test("common vendor aliases resolve without knowing the official bot username", () => {
  const parsed = parseCommands("@ClaudeAI audit this\n/grok challenge it\n@google-labs-jules test it", config);

  assert.deepEqual(
    parsed.requests.map((request) => request.agent),
    ["claudeai", "xai", "jules"]
  );
});

test("one line can trigger several agents with shared instructions", () => {
  const parsed = parseCommands("/dragnet @xai /jules review WR 17750", config);

  assert.deepEqual(
    parsed.requests.map((request) => request.agent),
    ["dragnet", "xai", "jules"]
  );
  assert.ok(parsed.requests.every((request) => request.instruction === "review WR 17750"));
});

test("quoted commands and fenced examples do not trigger agents", () => {
  const parsed = parseCommands(
    "> /dragnet old quoted request\n```text\n@xai example only\n```\n/jules real request",
    config
  );

  assert.deepEqual(parsed.requests.map((request) => request.agent), ["jules"]);
});

test("agents command opens the window without dispatching", () => {
  const parsed = parseCommands("/agents", config);
  assert.equal(parsed.showWindow, true);
  assert.equal(parsed.requests.length, 0);
});

test("copilot and codex mentions start the GitHub coding agents, not auto-assign", () => {
  const parsed = parseCommands("@copilot fix the WR\n@codex take the same WR", config);
  assert.deepEqual(
    parsed.requests.map((request) => request.agent),
    ["copilot", "codex"]
  );
  assert.equal(nativeAssignee(config, "copilot"), "Copilot");
  assert.equal(nativeAssignee(config, "codex"), "codex");
  assert.equal(nativeAssignee(config, "dragnet"), "");
});

test("only trusted humans can summon agents", () => {
  assert.equal(
    isAuthorized(
      {
        comment: {
          author_association: "MEMBER",
          user: { login: "audrey", type: "User" }
        }
      },
      config
    ),
    true
  );
  assert.equal(
    isAuthorized(
      {
        comment: {
          author_association: "NONE",
          user: { login: "unknown", type: "User" }
        }
      },
      config
    ),
    false
  );
  assert.equal(
    isAuthorized(
      {
        comment: {
          author_association: "MEMBER",
          user: { login: "some-bot", type: "Bot" }
        }
      },
      config
    ),
    false
  );
});

test("window state survives rendering and can receive status updates", () => {
  const state = applyRequestsToState(
    { version: 1, agents: {} },
    [
      {
        agent: "dragnet",
        alias: "/dragnet",
        displayName: "Dragnet",
        lane: "dependency discovery",
        instruction: "trace it"
      }
    ],
    {
      number: 42,
      url: "https://github.example/wr/42",
      requestedBy: "audrey",
      requestedAt: "2026-08-21T00:00:00.000Z",
      requestIds: { dragnet: "99:dragnet" }
    }
  );
  const rendered = renderWindow(config, state);
  const restored = parseWindowState(rendered);
  const completed = updateAgentStatus(restored, {
    agent: "dragnet",
    status: "completed",
    summary: "Dependency map posted.",
    request_id: "99:dragnet"
  });

  assert.equal(restored.agents.dragnet.instruction, "trace it");
  assert.equal(completed.agents.dragnet.status, "completed");
  assert.match(renderWindow(config, completed), /Completed/);
});

test("dispatch payload identifies a WR or PR without exceeding the event contract", () => {
  const payload = buildDispatchPayload({
    repository: "midnghtsapphire/revvel-standards",
    request: {
      agent: "claudecode",
      instruction: "review code"
    },
    event: {
      comment: { id: 81, user: { login: "midnghtsapphire" } },
      issue: {
        number: 17750,
        title: "Repair workflow",
        html_url: "https://github.example/issues/17750",
        pull_request: { url: "https://api.github.example/pulls/17750" }
      }
    }
  });

  assert.equal(payload.agent, "claudecode");
  assert.equal(payload.kind, "pull_request");
  assert.equal(payload.request_id, "81:claudecode");
  assert.equal(Object.keys(payload).length, 10);
});
