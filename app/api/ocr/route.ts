import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/utils/supabase/client";

type RawLine = { name?: unknown; price?: unknown };
type LineItem = { id: string; name: string; price: number };

// Validate the image URL is on the project's Supabase storage host and extract
// the { bucket, key }. The image is then downloaded via the Supabase SDK (not
// fetch), so no user-controlled value ever reaches an HTTP request sink — this
// eliminates SSRF (file://, internal IPs, alternate hosts) by construction.
function toStorageObject(raw: string): { bucket: string; key: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  let candidate: URL;
  let allowed: URL;
  try {
    candidate = new URL(raw);
    allowed = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (candidate.protocol !== "https:") return null;
  if (candidate.host !== allowed.host) return null;

  // Public object URLs: /storage/v1/object/public/{bucket}/{key...}
  const marker = "/storage/v1/object/public/";
  const at = candidate.pathname.indexOf(marker);
  if (at === -1) return null;
  const rest = candidate.pathname.slice(at + marker.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;

  const bucket = decodeURIComponent(rest.slice(0, slash));
  const key = decodeURIComponent(rest.slice(slash + 1));
  if (!bucket || !key) return null;
  return { bucket, key };
}

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
  const storageObject = toStorageObject(imageUrl);
  if (!storageObject) {
    return NextResponse.json(
      { error: "imageUrl must be an https URL on the configured storage host." },
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

  // Download via the Supabase SDK (not a user-controlled fetch → no SSRF sink).
  const { data: blob, error: downloadError } = await supabase.storage
    .from(storageObject.bucket)
    .download(storageObject.key);
  if (downloadError || !blob) {
    return NextResponse.json(
      { error: "Could not fetch the receipt image." },
      { status: 400 },
    );
  }
  const mimeType = blob.type || "image/jpeg";
  const imageBytes = Buffer.from(await blob.arrayBuffer());
  const base64 = imageBytes.toString("base64");

  // Model is env-configurable so it can be changed without a code edit (e.g.
  // when a model is overloaded). Defaults to the latest flash-lite alias.
  const model = process.env.GEMINI_OCR_MODEL ?? "gemini-flash-lite-latest";

  // Force a strict JSON array of { name, price } via Structured Outputs.
  // Wrap the provider call so quota/network/parse errors return a clean 502
  // instead of crashing the handler / leaking a stack trace.
  let responseText: string;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
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
        // Deterministic decoding so the same receipt extracts consistently
        // (default sampling can intermittently return an empty array).
        temperature: 0,
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
    responseText = response.text ?? "[]";
  } catch (error) {
    // Surface the real upstream error server-side; the client still gets a
    // generic message (no stack/internal detail leaked).
    console.error("[ocr] Gemini generateContent failed:", error);
    return NextResponse.json(
      { error: "Receipt scanning failed. Please try again." },
      { status: 502 },
    );
  }

  let rawLines: RawLine[] = [];
  try {
    const parsed: unknown = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      rawLines = parsed.filter(
        (entry): entry is RawLine =>
          typeof entry === "object" && entry !== null,
      );
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
