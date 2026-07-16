#!/usr/bin/env node
"use strict";

/**
 * Guardrail tests for .github/workflows/devinci-debug.yml (WR #15673).
 *
 * DevInCi opens a browser-accessible shell / VS Code session on the CI
 * runner, so these tests pin the security properties the WR demanded:
 * dispatch-only trigger, SHA-pinned action, TTL cap, hard job timeout,
 * write-access gate, and credential-free URL publication.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");

const WORKFLOW = path.resolve(
  __dirname,
  "..",
  ".github",
  "workflows",
  "devinci-debug.yml",
);
const raw = fs.readFileSync(WORKFLOW, "utf8");
const doc = yaml.parse(raw);

test("devinci-debug is workflow_dispatch only", () => {
  const on = doc.on || doc[true];
  assert.deepStrictEqual(Object.keys(on), ["workflow_dispatch"]);
});

test("devinci action is pinned to a full commit SHA", () => {
  assert.match(raw, /uses: asd-engineering\/asd-devinci@[0-9a-f]{40}/);
});

test("job has a hard timeout", () => {
  assert.ok(doc.jobs.devinci["timeout-minutes"] <= 130);
});

test("TTL is validated and capped at 120 minutes", () => {
  assert.ok(raw.includes("-gt 120"), "must clamp TTL above 120");
  assert.ok(raw.includes("^[0-9]+$"), "must reject non-numeric TTL");
});

test("dispatcher write access is verified before starting a shell", () => {
  assert.ok(raw.includes("collaborators/${ACTOR}/permission"));
  assert.ok(raw.includes("admin|maintain|write"));
});

test("only the credential-free URL is published to the summary", () => {
  assert.ok(raw.includes("outputs.url-base"), "summary must use url-base");
  assert.ok(
    !raw.includes("steps.devinci.outputs.url }}"),
    "credentialed url output must not be echoed",
  );
});

test("permissions are read-only", () => {
  assert.deepStrictEqual(doc.permissions, { contents: "read" });
});
