/**
 * Awesome Grok Build — catalog + install-plan engine.
 *
 * Pure CommonJS so root `node --test` and the Next.js app can share one
 * source of truth. No network, no filesystem — callers pass catalog data in.
 *
 * Upstream source: https://github.com/DominikTobureto/awesome-grok-build (MIT)
 */

"use strict";

const catalogJson = require("./catalog.json");

const STACK_PRESETS = Object.freeze({
  nextjs: {
    id: "nextjs",
    label: "Next.js / full-stack SaaS",
    skillIds: [
      "repo-health-check",
      "nextjs-fullstack",
      "frontend-ux-engineer",
      "tdd-test-engineer",
      "security-audit",
      "git-github-flow",
    ],
    agentsTemplate: "AGENTS.fullstack.md",
    grokignore: "grokignore.node",
  },
  python: {
    id: "python",
    label: "Python / FastAPI service",
    skillIds: [
      "repo-health-check",
      "python-expert",
      "tdd-test-engineer",
      "security-audit",
      "architecture-review",
      "git-github-flow",
    ],
    agentsTemplate: "AGENTS.fullstack.md",
    grokignore: "grokignore.python",
  },
  library: {
    id: "library",
    label: "Library / SDK",
    skillIds: [
      "repo-health-check",
      "tdd-test-engineer",
      "refactor-master",
      "architecture-review",
      "git-github-flow",
    ],
    agentsTemplate: "AGENTS.library.md",
    grokignore: "grokignore.default",
  },
  security: {
    id: "security",
    label: "Security-sensitive product",
    skillIds: [
      "repo-health-check",
      "security-audit",
      "agentic-code-review",
      "architecture-review",
      "git-github-flow",
      "hooksmith",
    ],
    agentsTemplate: "AGENTS.security.md",
    grokignore: "grokignore.default",
  },
  docs: {
    id: "docs",
    label: "Docs / awesome-list",
    skillIds: ["repo-health-check", "research-agent", "git-github-flow"],
    agentsTemplate: "AGENTS.docs.md",
    grokignore: "grokignore.default",
  },
  performance: {
    id: "performance",
    label: "Performance-critical app",
    skillIds: [
      "repo-health-check",
      "performance-optimizer",
      "refactor-master",
      "tdd-test-engineer",
      "frontend-ux-engineer",
    ],
    agentsTemplate: "AGENTS.fullstack.md",
    grokignore: "grokignore.node",
  },
});

const CATEGORIES = Object.freeze([
  "all",
  "general",
  "security",
  "testing",
  "frontend",
  "backend",
  "architecture",
  "devops",
  "performance",
  "research",
  "fullstack",
]);

function getCatalog(data) {
  const source = data && typeof data === "object" ? data : catalogJson;
  const skills = Array.isArray(source.skills) ? source.skills.slice() : [];
  return {
    source: source.source || catalogJson.source,
    sourceLicense: source.sourceLicense || "MIT",
    vendoredAt: source.vendoredAt || null,
    skillCount: skills.length,
    skills,
  };
}

function listSkills(data) {
  return getCatalog(data).skills.slice();
}

function listCategories(data) {
  const cats = new Set(listSkills(data).map((s) => s.category || "general"));
  return ["all", ...Array.from(cats).sort()];
}

function getSkillById(id, data) {
  if (!id || typeof id !== "string") return null;
  const needle = id.trim().toLowerCase();
  return listSkills(data).find((s) => s.id.toLowerCase() === needle) || null;
}

function normalizeQuery(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Filter/search skills. Empty query returns the full set (optionally category-filtered).
 */
function searchSkills(options, data) {
  const opts = options && typeof options === "object" ? options : {};
  const query = normalizeQuery(opts.query);
  const category = String(opts.category || "all").toLowerCase();
  let results = listSkills(data);

  if (category && category !== "all") {
    results = results.filter((s) => (s.category || "general").toLowerCase() === category);
  }

  if (query) {
    const tokens = query.split(" ").filter(Boolean);
    results = results.filter((s) => {
      const hay = [s.id, s.name, s.description, s.category, s.author, s.bodyMarkdown || ""]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }

  const sort = String(opts.sort || "name").toLowerCase();
  results.sort((a, b) => {
    if (sort === "category") {
      return (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name);
    }
    if (sort === "version") {
      return String(b.version).localeCompare(String(a.version), undefined, { numeric: true });
    }
    return a.name.localeCompare(b.name);
  });

  return results;
}

function listStackPresets() {
  return Object.values(STACK_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    skillIds: p.skillIds.slice(),
    agentsTemplate: p.agentsTemplate,
    grokignore: p.grokignore,
  }));
}

function getStackPreset(id) {
  if (!id || typeof id !== "string") return null;
  return STACK_PRESETS[id.trim().toLowerCase()] || null;
}

/**
 * Build an install plan for a stack + optional extra skill ids.
 * Returns shell/PowerShell commands and the resolved skill list.
 */
function buildInstallPlan(options, data) {
  const opts = options && typeof options === "object" ? options : {};
  const stackId = String(opts.stack || "nextjs").toLowerCase();
  const stack = getStackPreset(stackId) || STACK_PRESETS.nextjs;
  const extra = Array.isArray(opts.extraSkillIds) ? opts.extraSkillIds : [];
  const target = String(opts.target || ".").trim() || ".";

  const idSet = new Set([...stack.skillIds, ...extra.map(String)]);
  const skills = [];
  const missing = [];
  for (const id of idSet) {
    const skill = getSkillById(id, data);
    if (skill) skills.push(skill);
    else missing.push(id);
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));

  const skillNames = skills.map((s) => s.id);
  const bash = [
    `# Install ${skills.length} Grok Build skills for stack: ${stack.label}`,
    `mkdir -p "${target}/.grok/skills"`,
    ...skillNames.map(
      (id) =>
        `cp -R "content/skills/${id}" "${target}/.grok/skills/"  # or: from monorepo .grok/skills/${id}`,
    ),
    `cp "content/templates/${stack.agentsTemplate}" "${target}/AGENTS.md"  # skip if exists`,
    `cp "content/templates/${stack.grokignore}" "${target}/.grokignore"`,
    `# Or one-shot from upstream:`,
    `# curl -fsSL https://raw.githubusercontent.com/DominikTobureto/awesome-grok-build/main/install.sh | bash -s -- "${target}"`,
  ].join("\n");

  const powershell = [
    `# Install ${skills.length} Grok Build skills for stack: ${stack.label}`,
    `New-Item -ItemType Directory -Force "${target}/.grok/skills" | Out-Null`,
    ...skillNames.map(
      (id) =>
        `Copy-Item -Recurse -Force "content/skills/${id}" "${target}/.grok/skills/"`,
    ),
    `Copy-Item -Force "content/templates/${stack.agentsTemplate}" "${target}/AGENTS.md"`,
    `Copy-Item -Force "content/templates/${stack.grokignore}" "${target}/.grokignore"`,
  ].join("\n");

  const markdown = buildPlanMarkdown({
    stack,
    skills,
    missing,
    target,
    bash,
    powershell,
  });

  return {
    stack: {
      id: stack.id,
      label: stack.label,
      agentsTemplate: stack.agentsTemplate,
      grokignore: stack.grokignore,
    },
    target,
    skills,
    missing,
    skillCount: skills.length,
    bash,
    powershell,
    markdown,
    grokPrompt: buildGrokPrompt(stack, skills),
  };
}

function buildPlanMarkdown({ stack, skills, missing, target, bash, powershell }) {
  const lines = [
    `# Grok Build install plan — ${stack.label}`,
    "",
    `- **Target:** \`${target}\``,
    `- **Skills:** ${skills.length}`,
    `- **AGENTS template:** \`${stack.agentsTemplate}\``,
    `- **Ignore file:** \`${stack.grokignore}\``,
    `- **Upstream:** https://github.com/DominikTobureto/awesome-grok-build`,
    "",
    "## Skills",
    "",
    ...skills.map((s) => `- **${s.name}** (\`${s.id}\` v${s.version}) — ${s.description}`),
    "",
  ];
  if (missing.length) {
    lines.push("## Missing skill ids", "", ...missing.map((m) => `- \`${m}\``), "");
  }
  lines.push("## Bash", "", "```bash", bash, "```", "", "## PowerShell", "", "```powershell", powershell, "```", "");
  return lines.join("\n");
}

function buildGrokPrompt(stack, skills) {
  const names = skills.map((s) => s.id).join(", ");
  return [
    `Use these Grok Build skills for a ${stack.label} project: ${names}.`,
    `Start with repo-health-check if present, then plan the smallest safe PR.`,
    `Respect AGENTS.md (${stack.agentsTemplate}) and .grokignore (${stack.grokignore}).`,
  ].join(" ");
}

/**
 * Validate skill frontmatter-shaped objects (for tests + CI-style checks).
 */
function validateSkillRecords(skills) {
  const required = ["id", "name", "description", "version", "author"];
  const semver = /^\d+\.\d+\.\d+$/;
  const errors = [];
  const list = Array.isArray(skills) ? skills : [];

  if (list.length === 0) {
    errors.push("No skills provided");
    return { ok: false, checked: 0, passed: 0, errors };
  }

  let passed = 0;
  for (const skill of list) {
    const label = (skill && skill.id) || "(unknown)";
    let skillOk = true;
    if (!skill || typeof skill !== "object") {
      errors.push(`[${label}] not an object`);
      continue;
    }
    for (const field of required) {
      if (!skill[field] || String(skill[field]).trim() === "") {
        errors.push(`[${label}] missing required field: ${field}`);
        skillOk = false;
      }
    }
    if (skill.version && !semver.test(String(skill.version))) {
      errors.push(`[${label}] invalid semver: ${skill.version}`);
      skillOk = false;
    }
    if (skillOk) passed += 1;
  }

  return {
    ok: errors.length === 0,
    checked: list.length,
    passed,
    errors,
  };
}

function getOfficialResources() {
  return [
    {
      title: "Grok Build CLI install",
      url: "https://x.ai/cli",
      kind: "official",
    },
    {
      title: "awesome-grok-build (upstream)",
      url: "https://github.com/DominikTobureto/awesome-grok-build",
      kind: "community",
      starsNote: "Community curated starter kit; star count changes over time — check GitHub.",
    },
    {
      title: "xAI",
      url: "https://x.ai",
      kind: "official",
    },
  ];
}

function getMonetizationPath() {
  return {
    model: "freemium-saas",
    free: [
      "Browse and search the full skill catalog",
      "Generate stack install plans (bash + PowerShell + Markdown)",
      "Copy Grok prompts and AGENTS.md template recommendations",
    ],
    pro: [
      "Saved team install profiles",
      "Private skill pack hosting",
      "Priority skill validation CI badges",
    ],
    polarNote:
      "Optional Polar.sh checkout via NEXT_PUBLIC_POLAR_CHECKOUT_URL when set; otherwise contact link.",
    keywords: [
      "grok build skills",
      "xai grok cli",
      "awesome grok build",
      "coding agent skills",
      "AGENTS.md template",
      "grokignore",
      "ai pair programming starter kit",
    ],
  };
}

module.exports = {
  CATEGORIES,
  STACK_PRESETS,
  getCatalog,
  listSkills,
  listCategories,
  getSkillById,
  searchSkills,
  listStackPresets,
  getStackPreset,
  buildInstallPlan,
  validateSkillRecords,
  getOfficialResources,
  getMonetizationPath,
  catalogJson,
};
