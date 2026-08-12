import { NextResponse } from "next/server";

// Shared engine is CommonJS; load via require for Node runtime route.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const engine = require("../../../lib/catalog-engine.js") as {
  buildInstallPlan: (opts: {
    stack?: string;
    extraSkillIds?: string[];
    target?: string;
  }) => unknown;
  listStackPresets: () => unknown[];
};

export const runtime = "nodejs";

type Body = {
  stack?: string;
  extraSkillIds?: string[];
  target?: string;
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    stacks: engine.listStackPresets(),
    usage: {
      method: "POST",
      body: {
        stack: "nextjs | python | library | security | docs | performance",
        extraSkillIds: ["optional-skill-id"],
        target: ".",
      },
    },
  });
}

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const plan = engine.buildInstallPlan({
    stack: body.stack,
    extraSkillIds: Array.isArray(body.extraSkillIds) ? body.extraSkillIds : [],
    target: body.target || ".",
  });

  return NextResponse.json({ ok: true, plan });
}
