/**
 * Lightweight file-registry validation for the console playground.
 * Accepts an in-memory inventory + virtual filesystem map (path → content|null).
 */

export type RegistryRole = "doc" | "script" | "workflow" | "config" | "app" | "asset" | "any";

export interface RegistryEntry {
  path: string;
  role?: RegistryRole | string;
  required?: boolean;
  description?: string;
}

export interface RegistryManifest {
  version?: string;
  files: Array<RegistryEntry | string>;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checked: number;
}

const ROLE_EXTENSIONS: Record<string, string[] | null> = {
  doc: [".md"],
  script: [".js", ".mjs", ".cjs", ".ts", ".sh", ".py"],
  workflow: [".yml", ".yaml"],
  config: [".json", ".yml", ".yaml", ".jsonc", ".toml"],
  app: [".tsx", ".ts", ".jsx", ".js", ".html"],
  asset: [".png", ".svg", ".jpg", ".jpeg", ".webp", ".gif", ".ico"],
  any: null,
};

function extOf(p: string): string {
  const i = p.lastIndexOf(".");
  return i >= 0 ? p.slice(i).toLowerCase() : "";
}

function hasTopLevelHeading(markdown: string): boolean {
  const lines = markdown.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^ {0,3}#\s+\S/.test(line)) return true;
  }
  return false;
}

/**
 * @param manifest registry document
 * @param fsMap path → file contents, or null if missing
 */
export function validateRegistryManifest(
  manifest: RegistryManifest,
  fsMap: Record<string, string | null | undefined>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (!files.length) errors.push("registry.files must contain at least one entry");

  const seen = new Set<string>();
  let checked = 0;

  for (let i = 0; i < files.length; i++) {
    const raw = files[i];
    const entry: RegistryEntry =
      typeof raw === "string" ? { path: raw, role: "any", required: true } : raw;
    const rel = entry.path;
    const required = entry.required !== false;
    const role = entry.role || "any";
    checked += 1;

    if (!rel) {
      errors.push(`files[${i}]: missing path`);
      continue;
    }
    if (rel.startsWith("/") || rel.includes("..") || rel.startsWith("~")) {
      errors.push(`${rel}: path must be repo-relative without traversal`);
      continue;
    }
    if (seen.has(rel)) {
      errors.push(`${rel}: duplicate path in registry`);
      continue;
    }
    seen.add(rel);

    const content = fsMap[rel];
    if (content === undefined || content === null) {
      if (required) errors.push(`${rel}: file missing`);
      else warnings.push(`${rel}: optional file missing`);
      continue;
    }

    const allowed = ROLE_EXTENSIONS[role] ?? null;
    if (allowed) {
      const ext = extOf(rel);
      if (!allowed.includes(ext)) {
        errors.push(`${rel}: extension ${ext || "(none)"} not allowed for role ${role}`);
        continue;
      }
    }

    if (role === "doc" && extOf(rel) === ".md" && !hasTopLevelHeading(content)) {
      errors.push(`${rel}: Markdown doc missing a top-level heading (# ...)`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, checked };
}
