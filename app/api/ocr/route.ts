import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

type RawLine = { name?: unknown; price?: unknown };
type LineItem = { id: string; name: string; price: number };

// Coerce a model-returned price (a number, or a string like "$19.99") into a
// raw decimal number. Keeps the full precision; only strips currency/labels.
function normalizePrice(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Receipt OCR via Gemini. Server-only so GEMINI_API_KEY is never exposed to the
 * client. Returns the extracted line items; the client persists them to
 * receipts.processed_data under the user's RLS session (a server write would
 * need a service-role key, which we avoid).
 */
export async function POST(request: Request) {
  let body: { receiptId?: unknown; imageUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const receiptId = typeof body.receiptId === "string" ? body.receiptId : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  if (!receiptId || !imageUrl) {
    return NextResponse.json(
      { error: "receiptId and imageUrl are required." },
      { status: 400 },
    );
  }

  // Read the key at request time (not module load) so `next build` stays green
  // on runners without the key.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR is not configured (missing GEMINI_API_KEY)." },
      { status: 503 },
    );
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: "Could not fetch the receipt image." },
      { status: 400 },
    );
  }
  const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString(
    "base64",
  );

  // Force a strict JSON array of { name, price } via Structured Outputs.
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Extract every purchased line item from this receipt as a JSON array. Use raw numeric prices only — strip currency symbols ($, €) and labels like 'Total:'. Exclude tax, tip, and grand totals.",
          },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.NUMBER },
          },
          required: ["name", "price"],
        },
      },
    },
  });

  let rawLines: RawLine[] = [];
  try {
    const parsed: unknown = JSON.parse(response.text ?? "[]");
    if (Array.isArray(parsed)) {
      rawLines = parsed as RawLine[];
    }
  } catch {
    rawLines = [];
  }

  const items: LineItem[] = rawLines.map((line) => ({
    id: crypto.randomUUID(),
    name: typeof line.name === "string" ? line.name : "",
    price: normalizePrice(line.price),
  }));

  return NextResponse.json({ items });
}
