import { NextRequest, NextResponse } from "next/server";

/**
 * OCR Document Parser API
 *
 * Cloud-first implementation using OpenRouter vision models.
 * Extracts text/structure from images or PDFs and returns clean Markdown.
 * Swap OPENROUTER_API_KEY for local PaddleOCR via scripts/ocr-service.py.
 *
 * POST body:
 *   { imageUrl: string }       — publicly accessible image / PDF URL
 *   { imageBase64: string }    — base64-encoded image (data URI or raw)
 *   { text?: string }          — optional instruction override
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { imageUrl, imageBase64, text } = body as {
    imageUrl?: string;
    imageBase64?: string;
    text?: string;
  };

  if (!imageUrl && !imageBase64) {
    return NextResponse.json(
      { error: "Provide imageUrl (public URL) or imageBase64 (data URI)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        output: [
          "⚠️ **OPENROUTER_API_KEY** not configured.",
          "",
          "Add it to `.env.local` to enable live OCR via vision model.",
          "",
          "For local PaddleOCR execution run:",
          "```bash",
          "pip install paddlepaddle paddleocr",
          "python scripts/ocr-service.py --input <path-or-url>",
          "```",
        ].join("\n"),
      },
      { status: 200 }
    );
  }

  const instruction =
    text ??
    "Extract all text from this document/image. Return clean, well-structured Markdown. " +
      "Preserve headings, lists, tables, and code blocks. " +
      "If the image contains a table, render it as a Markdown table. " +
      "Do not add commentary — output only the extracted content.";

  const imageContent =
    imageUrl
      ? { type: "image_url", image_url: { url: imageUrl } }
      : {
          type: "image_url",
          image_url: {
            url: imageBase64!.startsWith("data:")
              ? imageBase64!
              : `data:image/png;base64,${imageBase64}`,
          },
        };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Revvel OCR Document Parser",
      Referer: "https://github.com/midnghtsapphire/revvel-standards",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.7-sonnet",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            imageContent,
          ],
        },
      ],
      max_tokens: 4096,
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
    data.choices?.[0]?.message?.content ?? "No content extracted.";

  return NextResponse.json({ output, model: data.model ?? "claude-3.7-sonnet" });
}
