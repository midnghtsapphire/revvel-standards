/**
 * Tests for scripts/readme-landing-build.mjs
 * Run: node --test tests/readme-landing-build.test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SCRIPT = path.resolve(__dirname, "../scripts/readme-landing-build.mjs");

// ---------------------------------------------------------------------------
// Inline copies of the pure helpers so we can unit-test them without a full
// CLI round-trip (avoids filesystem setup for every assertion).
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(raw) {
  const url = raw.trim();
  if (/^(https?:|mailto:|#|\/)/i.test(url)) return url;
  if (!/^[a-z][a-z0-9+\-.]*:/i.test(url)) return url;
  return "#";
}

function inline(s) {
  const TOKEN_RE =
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s[^)]*)?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s[^)]*)?\)/g;
  let result = "";
  let last = 0;
  let m;
  while ((m = TOKEN_RE.exec(s)) !== null) {
    result += esc(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[0].startsWith("!")) {
      result += `<img src="${esc(safeHref(m[2]))}" alt="${esc(m[1])}" loading="lazy" />`;
    } else {
      result += `<a href="${esc(safeHref(m[4]))}" rel="noopener noreferrer">${esc(m[3])}</a>`;
    }
  }
  result += esc(s.slice(last));
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return result;
}

// ---------------------------------------------------------------------------
// safeHref — URL sanitisation
// ---------------------------------------------------------------------------

describe("safeHref", () => {
  it("allows https URLs", () => assert.equal(safeHref("https://example.com"), "https://example.com"));
  it("allows http URLs", () => assert.equal(safeHref("http://example.com"), "http://example.com"));
  it("allows mailto links", () => assert.equal(safeHref("mailto:foo@bar.com"), "mailto:foo@bar.com"));
  it("allows fragment anchors", () => assert.equal(safeHref("#section"), "#section"));
  it("allows absolute paths", () => assert.equal(safeHref("/about"), "/about"));
  it("allows relative paths without scheme", () => assert.equal(safeHref("./docs/README.md"), "./docs/README.md"));
  it("blocks javascript: scheme", () => assert.equal(safeHref("javascript:alert(1)"), "#"));
  it("blocks data: scheme", () => assert.equal(safeHref("data:text/html,<h1>xss</h1>"), "#"));
  it("blocks vbscript: scheme", () => assert.equal(safeHref("vbscript:msgbox(1)"), "#"));
  it("is case-insensitive for scheme check", () => assert.equal(safeHref("JAVASCRIPT:alert(1)"), "#"));
});

// ---------------------------------------------------------------------------
// inline — Markdown → HTML token rendering
// ---------------------------------------------------------------------------

describe("inline", () => {
  it("renders a plain https link", () => {
    const out = inline("[text](https://example.com)");
    assert.ok(out.includes('href="https://example.com"'), out);
    assert.ok(out.includes(">text<"), out);
  });

  it("strips optional title from link", () => {
    const out = inline('[text](https://example.com "My title")');
    assert.ok(out.includes('href="https://example.com"'), out);
    assert.ok(!out.includes("My title"), out);
  });

  it("blocks javascript: XSS in href", () => {
    const out = inline("[click](javascript:alert(1))");
    assert.ok(out.includes('href="#"'), out);
  });

  it("escapes double-quote in URL to prevent attribute injection", () => {
    // A URL containing `"` — after esc() the quote becomes &quot; so it
    // cannot break out of the attribute value and inject event handlers.
    const out = inline('[link](http://x.com/"onmouseover="alert(1))');
    // The raw unescaped sequence onmouseover=" must not appear as an HTML attribute.
    assert.ok(!out.includes('onmouseover="'), `raw attribute injection present: ${out}`);
    // The `"` must be neutralised as &quot; within the href value.
    assert.ok(out.includes("&quot;"), `quote not escaped: ${out}`);
  });

  it("renders an image", () => {
    const out = inline("![alt text](https://img.shields.io/badge/x-y)");
    assert.ok(out.includes("<img"), out);
    assert.ok(out.includes('alt="alt text"'), out);
  });

  it("HTML-escapes plain text", () => {
    const out = inline("a & b < c > d");
    assert.ok(out.includes("&amp;"), out);
    assert.ok(out.includes("&lt;"), out);
  });

  it("renders inline code", () => assert.ok(inline("`foo`").includes("<code>foo</code>")));
  it("renders bold", () => assert.ok(inline("**bold**").includes("<strong>bold</strong>")));
  it("renders italic", () => assert.ok(inline("*italic*").includes("<em>italic</em>")));

  it("allows relative links unchanged", () => {
    const out = inline("[docs](./docs/README.md)");
    assert.ok(out.includes('href="./docs/README.md"'), out);
  });
});

// ---------------------------------------------------------------------------
// CLI integration — run the actual script against a temp README
// ---------------------------------------------------------------------------

function runBuilder(args, cwd) {
  return execFileSync("node", [SCRIPT, ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf8",
  });
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "readme-landing-"));
}

describe("CLI", () => {
  it("builds index.html from a minimal README", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");

    fs.writeFileSync(
      readmePath,
      [
        "# Test Project",
        "",
        "[![Build](https://img.shields.io/badge/build-passing-green)](https://example.com)",
        "",
        "Hello **world**.",
        "",
        "## Installation",
        "",
        "Run `npm install`.",
      ].join("\n"),
    );

    runBuilder(["--readme", readmePath, "--out", outPath, "--repo", "owner/repo", "--template", "midnghtsapphire"]);

    assert.ok(fs.existsSync(outPath), "output file created");
    const html = fs.readFileSync(outPath, "utf8");

    assert.ok(html.includes("<title>Test Project</title>"), "title tag");
    assert.ok(html.includes("<h1>Test Project</h1>"), "H1 in hero");
    assert.ok(html.includes("<strong>world</strong>"), "bold rendered");
    assert.ok(html.includes("<code>npm install</code>"), "inline code rendered");
    // Check repo quick links appear as anchored href attributes
    assert.ok(html.includes('href="https://github.com/owner/repo"'), "repo star link present");
    assert.ok(html.includes('href="https://github.com/owner/repo/issues"'), "repo issues link present");
    assert.ok(html.includes("og:title"), "OG title meta");
    assert.ok(html.includes("og:image"), "OG image meta");

    fs.rmSync(dir, { recursive: true });
  });

  it("uses glass theme when requested", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");
    fs.writeFileSync(readmePath, "# Glass\n\nContent.\n");

    runBuilder(["--readme", readmePath, "--out", outPath, "--template", "glass"]);

    const html = fs.readFileSync(outPath, "utf8");
    assert.ok(html.includes("backdrop-filter"), "glass theme CSS present");

    fs.rmSync(dir, { recursive: true });
  });

  it("uses dark theme when requested", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");
    fs.writeFileSync(readmePath, "# Dark\n\nContent.\n");

    runBuilder(["--readme", readmePath, "--out", outPath, "--template", "dark"]);

    const html = fs.readFileSync(outPath, "utf8");
    assert.ok(html.includes("#0b0b0f"), "dark theme CSS present");

    fs.rmSync(dir, { recursive: true });
  });

  it("--all builds one HTML file per .md in cwd", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "README.md"), "# Readme\n\nBody.\n");
    fs.writeFileSync(path.join(dir, "CHANGELOG.md"), "# Changelog\n\nBody.\n");

    runBuilder(["--all"], dir);

    assert.ok(fs.existsSync(path.join(dir, "site", "index.html")), "index.html created");
    assert.ok(fs.existsSync(path.join(dir, "site", "changelog.html")), "changelog.html created");

    fs.rmSync(dir, { recursive: true });
  });

  it("blocks javascript: XSS in rendered output", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");
    fs.writeFileSync(readmePath, "# XSS\n\n[click me](javascript:alert(1))\n");

    runBuilder(["--readme", readmePath, "--out", outPath]);

    const html = fs.readFileSync(outPath, "utf8");
    assert.ok(!html.includes("javascript:"), "javascript: scheme absent from output");

    fs.rmSync(dir, { recursive: true });
  });

  it("does not double-escape query-param URLs in rendered links", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");
    fs.writeFileSync(
      readmePath,
      "# Query\n\n[search](https://example.com/?a=1&b=2)\n",
    );

    runBuilder(["--readme", readmePath, "--out", outPath]);

    const html = fs.readFileSync(outPath, "utf8");
    assert.ok(
      html.includes('href="https://example.com/?a=1&amp;b=2"'),
      `query URL escaped exactly once: ${html.match(/href="[^"]*example[^"]*"/)}`,
    );
    assert.ok(!html.includes("&amp;amp;"), "no double-escaped ampersands");

    fs.rmSync(dir, { recursive: true });
  });

  it("title-badge extraction: badge-only lines not duplicated in body", () => {
    const dir = tmpDir();
    const readmePath = path.join(dir, "README.md");
    const outPath = path.join(dir, "site", "index.html");
    fs.writeFileSync(
      readmePath,
      [
        "# My Repo",
        "",
        "[![Status](https://img.shields.io/badge/status-active-green)](https://example.com)",
        "",
        "Real content here.",
      ].join("\n"),
    );

    runBuilder(["--readme", readmePath, "--out", outPath, "--repo", "owner/repo"]);

    const html = fs.readFileSync(outPath, "utf8");
    // Badge image URL should appear only in the hero badges section, not again in the article
    const matches = html.match(/img\.shields\.io/g) || [];
    assert.ok(matches.length <= 1, `Badge duplicated: found ${matches.length} occurrences`);

    fs.rmSync(dir, { recursive: true });
  });
});
