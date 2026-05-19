import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { message: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      {
        message:
          "Subscription is not configured yet. Set NEWSLETTER_WEBHOOK_URL and retry.",
      },
      { status: 503 },
    );
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        source: "revvel-skill-runner",
      }),
    });

    if (!webhookResponse.ok) {
      return NextResponse.json(
        { message: "Subscription provider rejected the request." },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: "Subscribed! Check your inbox." });
  } catch {
    return NextResponse.json(
      { message: "Subscription provider is temporarily unavailable." },
      { status: 502 },
    );
  }
}
