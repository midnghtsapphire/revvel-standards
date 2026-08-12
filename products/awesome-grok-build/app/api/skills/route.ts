import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const engine = require("../../../lib/catalog-engine.js") as {
  getCatalog: () => { skillCount: number; source: string; skills: unknown[] };
  searchSkills: (opts: {
    query?: string;
    category?: string;
    sort?: string;
  }) => unknown[];
  listCategories: () => string[];
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const category = url.searchParams.get("category") || "all";
  const sort = url.searchParams.get("sort") || "name";

  const catalog = engine.getCatalog();
  const skills = engine.searchSkills({ query, category, sort });

  return NextResponse.json({
    ok: true,
    source: catalog.source,
    total: catalog.skillCount,
    count: skills.length,
    categories: engine.listCategories(),
    skills: skills.map((s) => {
      const skill = s as {
        id: string;
        name: string;
        description: string;
        version: string;
        author: string;
        category: string;
        path: string;
      };
      return {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        author: skill.author,
        category: skill.category,
        path: skill.path,
      };
    }),
  });
}
