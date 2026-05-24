import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { skillId, trigger } = await req.json();

  if (!skillId || !trigger) {
    return NextResponse.json(
      { error: "skillId and trigger are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        output:
          "⚠️ OPENROUTER_API_KEY not set. Add it to your .env.local to enable live skill execution.\n\nSkill would run: " +
          trigger,
      },
      { status: 200 }
    );
  }

  const prompt = `You are a Revvel skill executor. The user wants to run the "${skillId}" skill.
Trigger phrase: "${trigger}"

Respond with a concise, actionable summary of what this skill does and what it would produce in this context. Keep it under 200 words, use bullet points where helpful.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Referer: "https://github.com/midnghtsapphire/revvel-standards",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.7-sonnet",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `OpenRouter error: ${res.status} — ${err}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const output =
    data.choices?.[0]?.message?.content ?? "No output returned from model.";

  return NextResponse.json({ output });
}
