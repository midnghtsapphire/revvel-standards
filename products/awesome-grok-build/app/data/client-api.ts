/**
 * Browser-safe catalog API for the Next.js client UI.
 * Mirrors products/awesome-grok-build/lib/catalog-engine.js (kept in sync via tests).
 */

import catalogJson from "../../lib/catalog.json";

export type Skill = {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  bodyMarkdown: string;
  path: string;
};

export type InstallPlan = {
  stack: {
    id: string;
    label: string;
    agentsTemplate: string;
    grokignore: string;
  };
  target: string;
  skills: Skill[];
  missing: string[];
  skillCount: number;
  bash: string;
  powershell: string;
  markdown: string;
  grokPrompt: string;
};

type StackPreset = {
  id: string;
  label: string;
  skillIds: string[];
  agentsTemplate: string;
  grokignore: string;
};

const STACK_PRESETS: Record<string, StackPreset> = {
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
};

const skills = (catalogJson.skills || []) as Skill[];

export function getCatalog() {
  return {
    source: catalogJson.source,
    sourceLicense: catalogJson.sourceLicense,
    vendoredAt: catalogJson.vendoredAt,
    skillCount: skills.length,
    skills: skills.slice(),
  };
}

export function listCategories(): string[] {
  const cats = new Set(skills.map((s) => s.category || "general"));
  return ["all", ...Array.from(cats).sort()];
}

export function searchSkills(options: {
  query?: string;
  category?: string;
  sort?: string;
}): Skill[] {
  const query = String(options.query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const category = String(options.category || "all").toLowerCase();
  let results = skills.slice();

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

  const sort = String(options.sort || "name").toLowerCase();
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

export function listStackPresets() {
  return Object.values(STACK_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    skillIds: p.skillIds.slice(),
    agentsTemplate: p.agentsTemplate,
    grokignore: p.grokignore,
  }));
}

function getSkillById(id: string): Skill | null {
  const needle = id.trim().toLowerCase();
  return skills.find((s) => s.id.toLowerCase() === needle) || null;
}

export function buildInstallPlan(options: {
  stack?: string;
  extraSkillIds?: string[];
  target?: string;
}): InstallPlan {
  const stackId = String(options.stack || "nextjs").toLowerCase();
  const stack = STACK_PRESETS[stackId] || STACK_PRESETS.nextjs;
  const extra = Array.isArray(options.extraSkillIds) ? options.extraSkillIds : [];
  const target = String(options.target || ".").trim() || ".";

  const idSet = new Set([...stack.skillIds, ...extra.map(String)]);
  const resolved: Skill[] = [];
  const missing: string[] = [];
  for (const id of idSet) {
    const skill = getSkillById(id);
    if (skill) resolved.push(skill);
    else missing.push(id);
  }
  resolved.sort((a, b) => a.name.localeCompare(b.name));

  const skillNames = resolved.map((s) => s.id);
  const bash = [
    `# Install ${resolved.length} Grok Build skills for stack: ${stack.label}`,
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
    `# Install ${resolved.length} Grok Build skills for stack: ${stack.label}`,
    `New-Item -ItemType Directory -Force "${target}/.grok/skills" | Out-Null`,
    ...skillNames.map(
      (id) => `Copy-Item -Recurse -Force "content/skills/${id}" "${target}/.grok/skills/"`,
    ),
    `Copy-Item -Force "content/templates/${stack.agentsTemplate}" "${target}/AGENTS.md"`,
    `Copy-Item -Force "content/templates/${stack.grokignore}" "${target}/.grokignore"`,
  ].join("\n");

  const markdownLines = [
    `# Grok Build install plan — ${stack.label}`,
    "",
    `- **Target:** \`${target}\``,
    `- **Skills:** ${resolved.length}`,
    `- **AGENTS template:** \`${stack.agentsTemplate}\``,
    `- **Ignore file:** \`${stack.grokignore}\``,
    `- **Upstream:** https://github.com/DominikTobureto/awesome-grok-build`,
    "",
    "## Skills",
    "",
    ...resolved.map((s) => `- **${s.name}** (\`${s.id}\` v${s.version}) — ${s.description}`),
    "",
    "## Bash",
    "",
    "```bash",
    bash,
    "```",
    "",
  ];

  const grokPrompt = [
    `Use these Grok Build skills for a ${stack.label} project: ${skillNames.join(", ")}.`,
    `Start with repo-health-check if present, then plan the smallest safe PR.`,
    `Respect AGENTS.md (${stack.agentsTemplate}) and .grokignore (${stack.grokignore}).`,
  ].join(" ");

  return {
    stack: {
      id: stack.id,
      label: stack.label,
      agentsTemplate: stack.agentsTemplate,
      grokignore: stack.grokignore,
    },
    target,
    skills: resolved,
    missing,
    skillCount: resolved.length,
    bash,
    powershell,
    markdown: markdownLines.join("\n"),
    grokPrompt,
  };
}

export function getOfficialResources() {
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
    },
    {
      title: "xAI",
      url: "https://x.ai",
      kind: "official",
    },
  ];
}

export function getMonetizationPath() {
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
