"use strict";

// Tests for skills/client-stacks/ — the client contract engagement kit
// (wr/pending/09-client-contract-fleet.md).
//
// The "reference engagement" test is the WR's Definition of Done: a sample
// .NET repo is built as a fixture, the stack is detected, an engagement is
// planned (client-style PR + client verify commands), and the action log is
// emitted — all in dry-run so no client system is ever touched from tests.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  detect,
  detectCi,
  PRIORITY,
} = require("../skills/client-stacks/detect-stack");
const {
  buildEngagementPlan,
  emitActionLog,
  slugify,
} = require("../skills/client-stacks/run-engagement");

const STACKS_DIR = path.join(
  __dirname,
  "..",
  "skills",
  "client-stacks",
  "stacks",
);

function tmpRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "client-stacks-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

// Minimal but realistic sample .NET client repo (ASP.NET Core web project
// with GitHub Actions CI) — the reference engagement target.
function sampleDotnetRepo() {
  return tmpRepo({
    "Contoso.Api.sln":
      "Microsoft Visual Studio Solution File, Format Version 12.00\n",
    "src/Contoso.Api/Contoso.Api.csproj":
      '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n</Project>\n',
    "src/Contoso.Api/Program.cs":
      'var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet("/", () => "ok");\napp.Run();\n',
    ".github/workflows/ci.yml":
      "name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: dotnet test\n",
  });
}

// --- lane pack integrity ----------------------------------------------------

test("every stack in PRIORITY has a lane pack with prompt pack + verify commands", () => {
  for (const stack of PRIORITY) {
    const file = path.join(STACKS_DIR, `${stack}.json`);
    assert.ok(fs.existsSync(file), `missing lane pack: ${file}`);
    const lane = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(lane.stack, stack);
    assert.ok(lane.language, `${stack}: language`);
    assert.ok(lane.package_manager, `${stack}: package_manager`);
    assert.ok(lane.test_runner, `${stack}: test_runner`);
    assert.ok(
      Array.isArray(lane.verify) && lane.verify.length > 0,
      `${stack}: verify commands`,
    );
    assert.ok(
      Array.isArray(lane.prompt_pack.idioms) &&
        lane.prompt_pack.idioms.length > 0,
      `${stack}: idioms`,
    );
    assert.ok(
      typeof lane.prompt_pack.pr_style === "string" &&
        lane.prompt_pack.pr_style.length > 0,
      `${stack}: pr_style`,
    );
    assert.ok(Array.isArray(lane.prompt_pack.never), `${stack}: never list`);
  }
});

// --- stack detection ---------------------------------------------------------

test("detects a .NET client repo: language, framework, test runner, CI, package manager", () => {
  const root = sampleDotnetRepo();
  const p = detect(root);
  assert.equal(p.stack, "dotnet");
  assert.equal(p.language, "C#");
  assert.equal(p.framework, "aspnetcore"); // Microsoft.NET.Sdk.Web
  assert.equal(p.test_runner, "dotnet test");
  assert.equal(p.ci, "github-actions");
  assert.equal(p.package_manager, "nuget");
  assert.ok(p.lane.verify.some((c) => c.includes("dotnet test")));
});

test("detects Python, TypeScript (Next.js), PHP (Laravel) and Java stacks", () => {
  const py = detect(
    tmpRepo({
      "pyproject.toml": '[project]\nname = "x"\ndependencies = ["fastapi"]\n',
      "app/main.py": "x = 1\n",
    }),
  );
  assert.equal(py.stack, "python");
  assert.equal(py.framework, "fastapi");

  const ts = detect(
    tmpRepo({
      "package.json": JSON.stringify({
        name: "x",
        dependencies: { next: "14.0.0" },
      }),
      "tsconfig.json": "{}",
      "src/index.ts": "export {};\n",
    }),
  );
  assert.equal(ts.stack, "typescript");
  assert.equal(ts.framework, "nextjs");

  const php = detect(
    tmpRepo({
      "composer.json": "{}",
      artisan: "<?php\n",
      "app/Model.php": "<?php\n",
    }),
  );
  assert.equal(php.stack, "php");
  assert.equal(php.framework, "laravel");

  const java = detect(
    tmpRepo({ "pom.xml": "<project/>", "src/Main.java": "class Main {}\n" }),
  );
  assert.equal(java.stack, "java");
});

test("unknown stack reports candidates instead of guessing", () => {
  const p = detect(tmpRepo({ "README.md": "hello\n" }));
  assert.equal(p.stack, "unknown");
  assert.equal(p.lane, null);
});

test("detectCi recognizes azure pipelines", () => {
  assert.equal(
    detectCi(tmpRepo({ "azure-pipelines.yml": "trigger: []\n" })),
    "azure-pipelines",
  );
  assert.equal(detectCi(tmpRepo({ "README.md": "x" })), "none-detected");
});

// --- reference engagement (WR Definition of Done) ---------------------------

test("reference engagement: sample .NET repo → plan with client-style PR + client verify + action log", () => {
  const root = sampleDotnetRepo();
  const task = "Update NuGet dependencies with security patches";
  const plan = buildEngagementPlan({
    repoPath: root,
    task,
    client: "Contoso Ltd",
  });

  // Stack detected
  assert.equal(plan.profile.stack, "dotnet");

  // Client's verify commands, not ours
  assert.ok(plan.verify.includes("dotnet restore"));
  assert.ok(plan.verify.some((c) => c.startsWith("dotnet test")));
  assert.ok(!plan.verify.some((c) => c.includes("npm test")));

  // Client-style PR spec
  assert.equal(
    plan.pr.branch,
    "contract/contoso-ltd/update-nuget-dependencies-with-security-patches",
  );
  assert.equal(plan.pr.title, task);
  assert.match(plan.pr.body, /dotnet test/);

  // Prompt pack rides along for the coding lane
  assert.ok(plan.prompt_pack.idioms.length > 0);

  // Action log emitted (dry-run), one auditable entry per step, no secrets
  const logPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "client-log-")),
    "contoso.jsonl",
  );
  const written = emitActionLog(plan, { logPath, dryRun: true });
  assert.equal(written, logPath);
  const entries = fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert.equal(entries.length, plan.steps.length);
  assert.deepEqual(
    entries.map((e) => e.action),
    ["detect-stack", "load-lane", "execute-task", "verify", "open-pr"],
  );
  for (const e of entries) {
    assert.equal(e.client, "Contoso Ltd");
    assert.equal(e.mode, "dry-run");
    assert.equal(e.actor, "revvel-contract-fleet");
    assert.ok(e.ts);
  }
});

test("engagement fails loudly on an undetectable stack (no lane = no work)", () => {
  const root = tmpRepo({ "notes.txt": "nothing here\n" });
  assert.throws(
    () => buildEngagementPlan({ repoPath: root, task: "do something" }),
    /Could not detect a supported stack/,
  );
});

test("slugify produces safe branch segments", () => {
  assert.equal(slugify("Contoso Ltd"), "contoso-ltd");
  assert.equal(slugify("  Fix: e-mail cleanup!! "), "fix-e-mail-cleanup");
  assert.equal(slugify(""), "unnamed");
});
