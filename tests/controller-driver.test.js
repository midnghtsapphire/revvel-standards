"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  listRuns,
  reassignWorkflow,
  loadPriorReassigns,
  loadControllerState,
  saveControllerState,
  lastJobActivityMs,
  STATE_TTL_MS,
} = require("../scripts/controller/controller");

function writeFeed(feed) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctrl-"));
  fs.writeFileSync(
    path.join(dir, "controller-status.json"),
    JSON.stringify(feed),
  );
  return dir;
}

test("listRuns pages past 100 so a large fleet is not truncated", async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    status: "in_progress",
  }));
  const page2 = Array.from({ length: 37 }, (_, i) => ({
    id: 100 + i,
    status: "in_progress",
  }));
  const pagesSeen = [];
  const api = (url) => {
    const page = Number((url.match(/[?&]page=(\d+)/) || [])[1] || 1); // precise: not fooled by per_page=100
    pagesSeen.push(page);
    if (page === 1) return Promise.resolve({ workflow_runs: page1 });
    if (page === 2) return Promise.resolve({ workflow_runs: page2 });
    return Promise.resolve({ workflow_runs: [] });
  };
  const runs = await listRuns("in_progress", api);
  assert.equal(runs.length, 137); // both pages collected
  assert.deepEqual(pagesSeen, [1, 2]); // paged once more, then stopped on the short page
});

test("listRuns stops on the first short page", async () => {
  let pages = 0;
  const api = () => {
    pages += 1;
    return Promise.resolve({
      workflow_runs: [{ id: 1, status: "in_progress" }],
    });
  };
  const runs = await listRuns("queued", api);
  assert.equal(runs.length, 1);
  assert.equal(pages, 1); // a <100 page is the last page
});

test("reassignWorkflow: succeeds with the model input", async () => {
  const api = () => Promise.resolve(null); // 204 success
  const out = await reassignWorkflow(
    { path: ".github/workflows/x.yml", ref: "main", nextModel: "m1" },
    api,
  );
  assert.equal(out, "reassigned");
});

test("reassignWorkflow: retries without inputs when the model input is rejected", async () => {
  let n = 0;
  const api = () => {
    n += 1;
    if (n === 1) return Promise.reject(new Error("unexpected input model"));
    return Promise.resolve(null);
  };
  const out = await reassignWorkflow(
    { path: ".github/workflows/x.yml", ref: "main", nextModel: "m1" },
    api,
  );
  assert.equal(out, "reassigned(no-model-input)");
});

test("reassignWorkflow: both attempts fail -> reassign-failed (never a false success)", async () => {
  const errs = [new Error("input required"), new Error("workflow not found")];
  let n = 0;
  const api = () => Promise.reject(errs[n++] || errs[1]);
  const out = await reassignWorkflow(
    { path: ".github/workflows/x.yml", ref: "main", nextModel: "m1" },
    api,
  );
  assert.match(out, /^reassign-failed:/);
});

test("reassignWorkflow: a non-422 first error does NOT retry on the default model", async () => {
  let n = 0;
  const api = () => {
    n += 1;
    return Promise.reject(new Error("429 rate limit exceeded"));
  };
  const out = await reassignWorkflow(
    { path: ".github/workflows/x.yml", ref: "main", nextModel: "m1" },
    api,
  );
  assert.match(out, /^reassign-failed:/);
  assert.equal(n, 1); // did not silently relaunch without the model input
});

test("loadPriorReassigns persists BOTH reassign and escalate entries from a real feed", () => {
  const dir = writeFeed({
    preempt_enabled: true,
    preemptions: [
      {
        path: ".github/workflows/a.yml",
        planned: "reassign",
        reassign_count: 1,
        tried_models: ["m1"],
      },
      {
        path: ".github/workflows/b.yml",
        planned: "escalate",
        reassign_count: 2,
        tried_models: ["m1", "m2"],
      },
    ],
  });
  const map = loadPriorReassigns(dir);
  assert.equal(map[".github/workflows/a.yml"].count, 1);
  assert.deepEqual(map[".github/workflows/b.yml"].tried, ["m1", "m2"]); // escalated stays escalated next tick
});

test("loadPriorReassigns ignores a dry-run feed (state must not advance from a dry scan)", () => {
  const dir = writeFeed({
    preempt_enabled: false,
    preemptions: [
      {
        path: ".github/workflows/a.yml",
        planned: "reassign",
        reassign_count: 1,
        tried_models: ["m1"],
      },
    ],
  });
  assert.deepEqual(loadPriorReassigns(dir), {});
});

test("reassignWorkflow: no workflow path is skipped cleanly", async () => {
  const out = await reassignWorkflow({ id: 9, ref: "main" }, () =>
    Promise.resolve(null),
  );
  assert.equal(out, "reassign-skipped(no-workflow)");
});

// --- durable scoreboard (the amnesia fix) -----------------------------------

test("controller state survives a quiet tick: save carries untouched entries forward", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctrl-"));
  const iso = "2026-07-10T00:00:00.000Z";
  // Tick 1: workflow a.yml is cut and reassigned once.
  saveControllerState(
    dir,
    {},
    [
      {
        path: ".github/workflows/a.yml",
        cut: "cancelled",
        reassignCount: 1,
        triedModels: ["m1"],
      },
    ],
    iso,
  );
  // Tick 2 (quiet — nothing preempted): state must still know about a.yml.
  const afterQuiet = loadControllerState(dir, Date.parse(iso) + 15 * 60 * 1000);
  assert.equal(afterQuiet[".github/workflows/a.yml"].count, 1);
  assert.deepEqual(afterQuiet[".github/workflows/a.yml"].tried, ["m1"]);
  saveControllerState(dir, afterQuiet, [], iso); // quiet tick writes it back unchanged
  // Tick 3: the same workflow stalls again — the model chain must ADVANCE, not restart.
  const tick3 = loadControllerState(dir, Date.parse(iso) + 30 * 60 * 1000);
  assert.equal(tick3[".github/workflows/a.yml"].count, 1);
  assert.deepEqual(tick3[".github/workflows/a.yml"].tried, ["m1"]);
});

test("controller state expires after the TTL so a recovered workflow gets a clean slate", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctrl-"));
  const iso = "2026-07-10T00:00:00.000Z";
  saveControllerState(
    dir,
    {},
    [
      {
        path: ".github/workflows/a.yml",
        cut: "cancelled",
        reassignCount: 2,
        triedModels: ["m1", "m2"],
      },
    ],
    iso,
  );
  const withinTtl = loadControllerState(
    dir,
    Date.parse(iso) + STATE_TTL_MS - 1000,
  );
  assert.ok(withinTtl[".github/workflows/a.yml"]);
  const pastTtl = loadControllerState(
    dir,
    Date.parse(iso) + STATE_TTL_MS + 1000,
  );
  assert.equal(pastTtl[".github/workflows/a.yml"], undefined);
});

test("saveControllerState only advances lineage for cuts that actually happened", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctrl-"));
  const iso = "2026-07-10T00:00:00.000Z";
  saveControllerState(
    dir,
    {},
    [
      {
        path: ".github/workflows/ok.yml",
        cut: "cancelled",
        reassignCount: 1,
        triedModels: ["m1"],
      },
      {
        path: ".github/workflows/failed.yml",
        cut: "cancel-failed",
        reassignCount: 1,
        triedModels: ["m1"],
      },
      {
        path: ".github/workflows/spared.yml",
        cut: "spared(step-progress)",
        reassignCount: 1,
        triedModels: ["m1"],
      },
    ],
    iso,
  );
  const state = loadControllerState(dir, Date.parse(iso));
  assert.ok(state[".github/workflows/ok.yml"]);
  assert.equal(state[".github/workflows/failed.yml"], undefined); // original still running — no lineage advance
  assert.equal(state[".github/workflows/spared.yml"], undefined); // judged healthy — no lineage advance
});

test("loadControllerState falls back to the legacy feed when no state file exists", () => {
  const dir = writeFeed({
    preempt_enabled: true,
    preemptions: [
      {
        path: ".github/workflows/a.yml",
        planned: "reassign",
        reassign_count: 1,
        tried_models: ["m1"],
      },
    ],
  });
  const state = loadControllerState(dir, Date.now());
  assert.equal(state[".github/workflows/a.yml"].count, 1);
});

// --- jobs-API heartbeat (the false-stall fix) --------------------------------

test("lastJobActivityMs returns the latest step activity across jobs", async () => {
  const api = () =>
    Promise.resolve({
      jobs: [
        {
          started_at: "2026-07-10T00:00:00Z",
          steps: [
            {
              started_at: "2026-07-10T00:01:00Z",
              completed_at: "2026-07-10T00:05:00Z",
            },
            {
              started_at: "2026-07-10T00:05:00Z",
              completed_at: "2026-07-10T00:14:00Z",
            },
          ],
        },
      ],
    });
  const ms = await lastJobActivityMs(1, api);
  assert.equal(ms, Date.parse("2026-07-10T00:14:00Z"));
});

test("lastJobActivityMs returns null when the jobs API yields nothing (fall back to the stall verdict)", async () => {
  assert.equal(await lastJobActivityMs(1, () => Promise.resolve(null)), null);
  assert.equal(
    await lastJobActivityMs(1, () => Promise.resolve({ jobs: [] })),
    null,
  );
});

test("lastJobActivityMs pages past 100 jobs so a large matrix run is not falsely cut", async () => {
  const page1 = Array.from({ length: 100 }, () => ({
    started_at: "2026-07-10T00:00:00Z",
    steps: [],
  }));
  const page2 = [
    {
      started_at: "2026-07-10T00:00:00Z",
      steps: [{ started_at: "2026-07-10T00:30:00Z" }],
    },
  ];
  const pagesSeen = [];
  const api = (url) => {
    const page = Number((url.match(/[?&]page=(\d+)/) || [])[1] || 1);
    pagesSeen.push(page);
    return Promise.resolve({
      jobs: page === 1 ? page1 : page === 2 ? page2 : [],
    });
  };
  const ms = await lastJobActivityMs(1, api);
  assert.equal(ms, Date.parse("2026-07-10T00:30:00Z")); // activity found on page 2
  assert.deepEqual(pagesSeen, [1, 2]); // stopped on the short page
});

test("legacy feed entries are stamped at migration so the TTL can expire them", () => {
  const dir = writeFeed({
    preempt_enabled: true,
    preemptions: [
      {
        path: ".github/workflows/a.yml",
        planned: "reassign",
        reassign_count: 1,
        tried_models: ["m1"],
      },
    ],
  });
  const migrateAt = Date.parse("2026-07-10T00:00:00Z");
  const state = loadControllerState(dir, migrateAt);
  assert.equal(
    state[".github/workflows/a.yml"].last_cut_at,
    new Date(migrateAt).toISOString(),
  );
  // Persist it, then confirm it expires like any other entry.
  saveControllerState(dir, state, [], new Date(migrateAt).toISOString());
  assert.ok(
    loadControllerState(dir, migrateAt + STATE_TTL_MS - 1000)[
      ".github/workflows/a.yml"
    ],
  );
  assert.equal(
    loadControllerState(dir, migrateAt + STATE_TTL_MS + 1000)[
      ".github/workflows/a.yml"
    ],
    undefined,
  );
});
