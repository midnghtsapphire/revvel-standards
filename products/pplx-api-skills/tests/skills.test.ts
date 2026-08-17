import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeLocalSkill } from "../app/lib/skills/executor";
import {
  classifySkill,
  listSkills,
  skillsToToolSchemas,
} from "../app/lib/skills/registry";

describe("skill registry", () => {
  it("lists builtin and local skills", () => {
    const all = listSkills();
    assert.ok(all.length >= 8);
    assert.ok(listSkills({ category: "builtin" }).some((s) => s.id === "web_search"));
    assert.ok(listSkills({ execution: "local" }).some((s) => s.id === "bom_lookup"));
  });

  it("classifies known and unknown skills", () => {
    assert.equal(classifySkill("web_search").category, "builtin");
    assert.equal(classifySkill("bom_lookup").category, "revvel");
    assert.equal(classifySkill("mcp_files").category, "mcp");
    assert.equal(classifySkill("get_order_status").category, "custom");
  });

  it("builds OpenAI-compatible tool schemas for local skills", () => {
    const tools = skillsToToolSchemas(["bom_lookup"]);
    assert.equal(tools.length, 1);
    assert.equal(
      (tools[0].function as { name: string }).name,
      "bom_lookup"
    );
  });
});

describe("local skill executor", () => {
  it("runs bom_lookup", async () => {
    const inv = await executeLocalSkill("bom_lookup", { query: "perplexity" });
    assert.equal(inv.status, "completed");
    const result = inv.result as { matches: unknown[] };
    assert.ok(result.matches.length >= 1);
  });

  it("runs skill_classify", async () => {
    const inv = await executeLocalSkill("skill_classify", {
      text: "please use web_search and bom_lookup",
    });
    assert.equal(inv.status, "completed");
    const result = inv.result as {
      classifications: Array<{ id: string }>;
    };
    const ids = result.classifications.map((c) => c.id);
    assert.ok(ids.includes("web_search"));
    assert.ok(ids.includes("bom_lookup"));
  });

  it("runs repo_context", async () => {
    const inv = await executeLocalSkill("repo_context", {});
    assert.equal(inv.status, "completed");
    const result = inv.result as { port: number; product: string };
    assert.equal(result.port, 3012);
    assert.equal(result.product, "pplx-api-skills");
  });

  it("fails remote skills locally", async () => {
    const inv = await executeLocalSkill("web_search", { query: "x" });
    assert.equal(inv.status, "failed");
  });
});
