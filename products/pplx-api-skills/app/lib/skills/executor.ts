import type { SkillInvocation } from "../types";
import { getBomMatches } from "../bom";
import { classifySkill, getSkill, listSkills } from "./registry";
import { log } from "../logger";

/**
 * Execute local (client-side) skills. Remote built-ins run inside Perplexity.
 */
export async function executeLocalSkill(
  name: string,
  args: Record<string, unknown>
): Promise<SkillInvocation> {
  const started = Date.now();
  const meta = classifySkill(name);
  const def = getSkill(meta.id);

  if (!def || def.execution !== "local") {
    return {
      skillId: meta.id,
      category: meta.category,
      arguments: args,
      status: "failed",
      error: `Skill "${name}" is not a local executable skill`,
      durationMs: Date.now() - started,
    };
  }

  try {
    let result: unknown;
    switch (def.id) {
      case "bom_lookup": {
        const query = String(args.query ?? "");
        const category =
          typeof args.category === "string" ? args.category : undefined;
        result = {
          query,
          matches: getBomMatches(query, category),
        };
        break;
      }
      case "skill_classify": {
        const text = String(args.text ?? "");
        const tokens = text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
        const hits = tokens
          .map((t) => classifySkill(t))
          .filter((c) => c.known);
        result = {
          text,
          classifications: hits,
          availableCategories: ["builtin", "mcp", "custom", "revvel"],
        };
        break;
      }
      case "repo_context": {
        result = {
          product: "pplx-api-skills",
          port: 3012,
          integrationPoints: [
            "scripts/perplexity-research-issue.js (no-key research lane)",
            "scripts/openrouter-triage.js (OpenRouter + keyless fallback)",
            "docs/PERPLEXITY_NO_KEY_INTEGRATION.md",
            "docs/Universal-BOM_List/API_REGISTRY_BOM.md",
            "skills/* (Revvel skill packs)",
          ],
          env: [
            "PERPLEXITY_API_KEY",
            "PPLX_APP_TOKEN",
            "PPLX_FORCE_MOCK",
            "PPLX_DEFAULT_MODEL",
          ],
          localSkills: listSkills({ execution: "local" }).map((s) => s.id),
        };
        break;
      }
      default:
        throw new Error(`No executor implemented for ${def.id}`);
    }

    const invocation: SkillInvocation = {
      skillId: def.id,
      category: def.category,
      arguments: args,
      status: "completed",
      result,
      durationMs: Date.now() - started,
    };
    log("info", "skill.local.completed", {
      skillId: def.id,
      durationMs: invocation.durationMs,
    });
    return invocation;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "skill.local.failed", { skillId: def.id, error: message });
    return {
      skillId: def.id,
      category: def.category,
      arguments: args,
      status: "failed",
      error: message,
      durationMs: Date.now() - started,
    };
  }
}

export async function executeLocalSkillCalls(
  calls: Array<{ name: string; arguments: Record<string, unknown>; callId?: string }>
): Promise<SkillInvocation[]> {
  const out: SkillInvocation[] = [];
  for (const call of calls) {
    const inv = await executeLocalSkill(call.name, call.arguments);
    if (call.callId) inv.callId = call.callId;
    out.push(inv);
  }
  return out;
}
