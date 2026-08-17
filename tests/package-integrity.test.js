#!/usr/bin/env node
"use strict";

/**
 * Regression tests for package integrity (CircleCI job 11069 / #16904).
 *
 * The failing CircleCI lint-and-test job died at "Installing NPM packages"
 * with:
 *   npm error `npm ci` can only install packages when your package.json and
 *   package-lock.json are in sync.
 *   Invalid: lock file's c8@12.0.0 does not satisfy c8@10.1.3
 *
 * Root cause (WR-04): package.json had two `"c8"` keys — JSON last-key-wins
 * silently kept ^10.1.3 while the lockfile resolved ^12.0.0. These tests pin
 * the detector and the live-repo gate so that class of bug cannot land again.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  findDuplicateKeys,
  checkPackageJsonText,
  checkLockfileSync,
  runChecks,
  main,
} = require("../scripts/check-package-integrity.js");

const REPO_ROOT = path.resolve(__dirname, "..");

describe("findDuplicateKeys", () => {
  it("flags the exact CircleCI job 11069 c8 duplicate-key shape", () => {
    // Mirrors the pre-fix package.json from WR-04 / job 11069:
    // two "c8" entries inside the same object; last key wins → ^10.1.3
    // while the lockfile had c8@12.0.0.
    const text = `{
  "name": "revvel-standards",
  "devDependencies": {
    "c8": "^12.0.0",
    "yaml": "^2.9.0",
    "c8": "^10.1.3"
  }
}
`;
    const dups = findDuplicateKeys(text);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].key, "c8");
    assert.equal(dups[0].firstSeenLine, 4);
    assert.equal(dups[0].duplicateAtLine, 6);
  });

  it("allows the same key name in sibling nested objects", () => {
    const text = `{
  "dependencies": {
    "left-pad": "1.0.0"
  },
  "devDependencies": {
    "left-pad": "1.0.0"
  }
}
`;
    assert.deepEqual(findDuplicateKeys(text), []);
  });

  it("returns empty for a clean package.json-shaped document", () => {
    const text = `{
  "name": "x",
  "devDependencies": {
    "c8": "^12.0.0",
    "yaml": "^2.9.0"
  }
}
`;
    assert.deepEqual(findDuplicateKeys(text), []);
  });

  it("ignores braces inside string values when tracking object scope", () => {
    // Regression for code-review: structural brace counting must skip
    // `{` / `}` that appear inside JSON string literals.
    const text = `{
  "description": "uses {placeholders} and {more}",
  "devDependencies": {
    "c8": "^12.0.0"
  },
  "scripts": {
    "echo": "printf '{ok}'"
  }
}
`;
    assert.deepEqual(findDuplicateKeys(text), []);

    const withDup = `{
  "description": "uses {placeholders}",
  "devDependencies": {
    "c8": "^12.0.0",
    "c8": "^10.1.3"
  }
}
`;
    const dups = findDuplicateKeys(withDup);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].key, "c8");
  });

  it("attributes nested keys on inline object lines to the child scope", () => {
    // `"scripts": { "test": "jest" }` must not record "test" on the parent.
    const text = `{
  "scripts": { "test": "jest" },
  "devDependencies": {
    "test": "^1.0.0"
  }
}
`;
    assert.deepEqual(findDuplicateKeys(text), []);

    // True parent-level duplicate still fires.
    const parentDup = `{
  "scripts": { "test": "jest" },
  "scripts": { "lint": "eslint ." }
}
`;
    const dups = findDuplicateKeys(parentDup);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].key, "scripts");
  });
});

describe("checkPackageJsonText", () => {
  it("fails closed on the c8 duplicate and names the CircleCI symptom", () => {
    const text = `{
  "devDependencies": {
    "c8": "^12.0.0",
    "c8": "^10.1.3"
  }
}
`;
    const result = checkPackageJsonText(text, "package.json");
    assert.equal(result.ok, false);
    assert.equal(result.duplicates.length, 1);
    assert.match(result.errors[0], /duplicate key "c8"/);
    assert.match(result.errors[0], /11069|npm ci|EUSAGE/i);
  });

  it("rejects invalid JSON", () => {
    const result = checkPackageJsonText("{ not json", "broken.json");
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /not valid JSON/);
  });

  it("passes a well-formed unique-key document", () => {
    const result = checkPackageJsonText(
      '{"name":"ok","devDependencies":{"c8":"^12.0.0"}}',
      "package.json"
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });
});

describe("live repository package.json", () => {
  it("has no duplicate keys (would silently desync the lockfile)", () => {
    const text = fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8");
    const result = checkPackageJsonText(text, "package.json");
    assert.equal(
      result.ok,
      true,
      `duplicate keys in package.json:\n${result.errors.join("\n")}`
    );
  });

  it("package-lock.json is in sync (npm ci --dry-run)", () => {
    // This is the exact gate CircleCI job 11069 failed — keep it green.
    const result = checkLockfileSync({ cwd: REPO_ROOT });
    assert.equal(
      result.ok,
      true,
      `lockfile out of sync:\n${result.errors.join("\n")}`
    );
  });

  it("runChecks on the repo root is clean", () => {
    const result = runChecks({ cwd: REPO_ROOT });
    assert.equal(result.ok, true, result.errors.join("\n"));
  });
});

describe("checkLockfileSync fixture", () => {
  it("fails when package.json range does not match the lockfile", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-integrity-"));
    try {
      // Minimal package + lock that disagree on the top-level c8 version,
      // reproducing the job 11069 EUSAGE shape without network installs.
      const pkg = {
        name: "fixture-desync",
        version: "1.0.0",
        private: true,
        devDependencies: {
          // Demand 10.x while the lockfile pins 12.0.0 — same shape as 11069.
          c8: "10.1.3",
        },
      };
      const lock = {
        name: "fixture-desync",
        version: "1.0.0",
        lockfileVersion: 3,
        requires: true,
        packages: {
          "": {
            name: "fixture-desync",
            version: "1.0.0",
            devDependencies: { c8: "10.1.3" },
          },
          "node_modules/c8": {
            version: "12.0.0",
            resolved: "https://registry.npmjs.org/c8/-/c8-12.0.0.tgz",
            integrity: "sha512-fake",
            dev: true,
          },
        },
      };
      fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg, null, 2));
      fs.writeFileSync(
        path.join(tmp, "package-lock.json"),
        JSON.stringify(lock, null, 2)
      );

      const result = checkLockfileSync({ cwd: tmp });
      assert.equal(result.ok, false, "expected lockfile desync to fail");
      assert.match(result.errors.join("\n"), /out of sync|npm ci|Invalid:|EUSAGE/i);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("fails when package-lock.json is missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-integrity-nolock-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ name: "x", version: "1.0.0" }, null, 2)
      );
      const result = checkLockfileSync({ cwd: tmp });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /package-lock\.json not found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("CLI main()", () => {
  it("exits 0 on the live repo", () => {
    const prev = process.cwd();
    try {
      process.chdir(REPO_ROOT);
      assert.equal(main([]), 0);
    } finally {
      process.chdir(prev);
    }
  });

  it("exits 1 when pointed at a duplicate-key package.json", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-integrity-cli-"));
    try {
      const bad = path.join(tmp, "package.json");
      fs.writeFileSync(
        bad,
        `{
  "name": "bad",
  "devDependencies": {
    "c8": "^12.0.0",
    "c8": "^10.1.3"
  }
}
`
      );
      // Also need a cwd with no lock so we skip lock via flag.
      const code = main(["--json", bad, "--skip-lock"]);
      assert.equal(code, 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("is executable via node scripts/check-package-integrity.js", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(REPO_ROOT, "scripts/check-package-integrity.js"), "--skip-lock"],
      { cwd: REPO_ROOT, encoding: "utf8" }
    );
    assert.match(out, /package integrity: ok/);
  });

  it("exits 1 when --json is missing its path argument", () => {
    assert.equal(main(["--json", "--skip-lock"]), 1);
    assert.equal(main(["--cwd"]), 1);
  });
});
