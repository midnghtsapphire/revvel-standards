import { NextResponse } from "next/server";
import { DEFAULT_MODEL } from "../../../lib/types";

export async function GET() {
  const hasGroq = Boolean((process.env.GROQ_API_KEY || "").trim());
  return NextResponse.json({
    ok: true,
    service: "groq-code-review",
    groqConfigured: hasGroq,
    defaultModel: process.env.GROQ_MODEL || DEFAULT_MODEL,
    mode: hasGroq ? "groq+local-fallback" : "local-only",
  });
}
