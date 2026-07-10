import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/utils/supabase/client";
import { expandQuantityLine } from "@/utils/ocr/expandQuantity";
import { logError } from "@/utils/logging/log";

type RawLine = { name?: unknown; price?: unknown; quantity?: unknown };
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

// Like normalizePrice but preserves a "not present" signal as null, so the
// client can distinguish "OCR found no tip" (null) from "tip is 0" — the
// 20%-default logic (Story 13.5) depends on that distinction.
function normalizeNullableAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

// Round to whole cents to avoid float drift when backing a subtotal out of a
// total (total - tax - tip).
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// Some receipts have no itemized lines — a credit-card slip prints only a
// subtotal/tip/total. Those come back from the model as `items: []`, which the
// client treats as "nothing to split". Rather than drop the receipt, derive a
// single splittable amount: prefer the printed subtotal; otherwise back it out
// of the total by removing tax and tip. Returns null when there's nothing to go
// on (a genuinely empty/garbled scan), so the caller leaves items empty.
function fallbackSubtotal(
  subtotal: number | null,
  total: number | null,
  tax: number | null,
  tip: number | null,
): number | null {
  // If tax + tip already meet or exceed the total, the receipt's amounts are
  // internally inconsistent (a garbled scan) — bail without synthesizing any
  // line, even when a subtotal was printed, since it could never reconcile with
  // the separately-returned tax + tip. A real receipt always has a positive
  // subtotal, so this only fires on misreads.
  const knownTaxAndTip = (tax ?? 0) + (tip ?? 0);
  if (total !== null && total > 0 && knownTaxAndTip >= total) return null;

  if (subtotal !== null && subtotal > 0) return roundCents(subtotal);
  if (total !== null && total > 0) {
    // Back the subtotal out of the total (tax/tip removed).
    const derived = roundCents(total - knownTaxAndTip);
    return derived > 0 ? derived : null;
  }
  return null;
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

  // Force a strict JSON object (merchant + items + tax/tip/total) via Structured
  // Outputs. Wrap the provider call so quota/network/parse errors return a clean
  // 502 instead of crashing the handler / leaking a stack trace.
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
              text:
                "Extract this receipt as JSON with these fields: " +
                "`merchant` (the restaurant/store name, or null if not visible); " +
                "`items` (an array of every purchased line item, each with `name`, a raw numeric `price`, and a `quantity`); " +
                "`subtotal` (the pre-tax, pre-tip subtotal as a raw number, or null if not shown); " +
                "`tax` (the tax amount as a raw number, or null if not shown); " +
                "`tip` (the tip/gratuity amount, or null if not shown); " +
                "`total` (the grand total, or null if not shown). " +
                "For each item, take `quantity` ONLY from a leading number in the receipt's first (quantity) column; " +
                "if that column has no number, use 1. Quantity may be fractional for weight/measure items (e.g. 0.5). " +
                "Report `price` as the line's EXTENDED (total) price for all units — the right-hand amount — NOT the per-unit price. " +
                "Use raw numeric values only — strip currency symbols ($, €) and labels like 'Total:'. " +
                "Do NOT include tax, tip, or grand totals as entries in the `items` array. " +
                "Some receipts (e.g. credit-card slips) have NO itemized lines — only a subtotal and total. " +
                "In that case return an empty `items` array, but still report `subtotal`, `tax`, `tip`, and `total` when visible. " +
                "Tip and total may be handwritten; read them if legible.",
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
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, nullable: true },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER, nullable: true },
                },
                required: ["name", "price"],
              },
            },
            subtotal: { type: Type.NUMBER, nullable: true },
            tax: { type: Type.NUMBER, nullable: true },
            tip: { type: Type.NUMBER, nullable: true },
            total: { type: Type.NUMBER, nullable: true },
          },
          required: ["items"],
        },
      },
    });
    responseText = response.text ?? "{}";
  } catch (error) {
    // Surface the real upstream error server-side; the client still gets a
    // generic message (no stack/internal detail leaked).
    console.error("[ocr] Gemini generateContent failed:", error);
    // Also record the scan failure to error_logs (Story 23.5) — scan-failure
    // rate is a key beta health metric. Best-effort; never changes the response.
    void logError({
      source: "server",
      message: `OCR generateContent failed: ${(error as Error)?.message ?? String(error)}`,
      stack: (error as Error)?.stack ?? null,
      path: "/api/ocr",
      context: { receiptId, stage: "generateContent" },
    });
    return NextResponse.json(
      { error: "Receipt scanning failed. Please try again." },
      { status: 502 },
    );
  }

  // A parse failure or a non-object/missing-items response is an OCR failure,
  // not an empty receipt — return a retryable 502 so the client doesn't treat a
  // garbled scan as "nothing extracted". An empty `items: []` is still valid.
  let parsed: Record<string, unknown>;
  try {
    const json: unknown = JSON.parse(responseText);
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      throw new Error("OCR response was not a JSON object");
    }
    parsed = json as Record<string, unknown>;
    if (!Array.isArray(parsed.items)) {
      throw new Error("OCR response did not include an items array");
    }
  } catch (error) {
    console.error("[ocr] Gemini returned invalid JSON:", error);
    void logError({
      source: "server",
      message: `OCR parse failure: ${(error as Error)?.message ?? String(error)}`,
      stack: (error as Error)?.stack ?? null,
      path: "/api/ocr",
      context: { receiptId, stage: "parse" },
    });
    return NextResponse.json(
      { error: "Receipt scanning failed. Please try again." },
      { status: 502 },
    );
  }

  const rawLines: RawLine[] = (parsed.items as unknown[]).filter(
    (entry): entry is RawLine => typeof entry === "object" && entry !== null,
  );

  // Expand multi-quantity lines server-side (Story 17.6): a whole quantity ≥ 2
  // becomes that many items, splitting the EXTENDED price in cents so the parts
  // sum back to the line total. Fractional / ≤1 / missing quantities pass through
  // unchanged — never an undercount. Each resulting item gets a fresh id.
  const items: LineItem[] = rawLines.flatMap((line) => {
    const name = typeof line.name === "string" ? line.name : "";
    const price = normalizePrice(line.price);
    const quantity = typeof line.quantity === "number" ? line.quantity : null;
    return expandQuantityLine(name, price, quantity).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      price: item.price,
    }));
  });

  const merchant =
    typeof parsed.merchant === "string" && parsed.merchant.trim()
      ? // Clamp to the receipts.name column width (varchar(255)) so a garbled
        // long extraction can't fail the whole save.
        parsed.merchant.trim().slice(0, 255)
      : null;

  const subtotal = normalizeNullableAmount(parsed.subtotal);
  const tax = normalizeNullableAmount(parsed.tax);
  const tip = normalizeNullableAmount(parsed.tip);
  const total = normalizeNullableAmount(parsed.total);

  // Itemless receipt (e.g. a credit-card slip): synthesize one line at the
  // subtotal so the bill is still splittable instead of looking unscanned. Tax
  // and tip still prefill from their own fields, so this single line + tax + tip
  // reconstructs the total. If we can't recover any amount, leave items empty.
  if (items.length === 0) {
    const fallbackPrice = fallbackSubtotal(subtotal, total, tax, tip);
    if (fallbackPrice !== null) {
      items.push({
        id: crypto.randomUUID(),
        name: merchant ?? "Subtotal",
        price: fallbackPrice,
      });
    }
  }

  return NextResponse.json({
    items,
    merchant,
    subtotal,
    tax,
    tip,
    total,
  });
}
