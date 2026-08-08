import assert from "node:assert/strict";
import { validateRegistryManifest } from "../lib/registry";

{
  const report = validateRegistryManifest(
    {
      files: [
        { path: "docs/a.md", role: "doc" },
        { path: "scripts/x.js", role: "script" },
      ],
    },
    {
      "docs/a.md": "# Title\n",
      "scripts/x.js": "export {};\n",
    }
  );
  assert.equal(report.ok, true);
}

{
  const report = validateRegistryManifest(
    { files: [{ path: "../secret", role: "any" }, { path: "gone.md", role: "doc" }] },
    {}
  );
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => /traversal|repo-relative/.test(e)));
  assert.ok(report.errors.some((e) => /gone\.md/.test(e)));
}

console.log("registry.test.ts: ok");
