/**
 * @jest-environment node
 */
import { POST } from "@/app/api/ocr/route";

// Mock the Gemini SDK so the test never makes a real API call or needs a key.
const mockGenerateContent = jest.fn();
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  Type: {
    ARRAY: "ARRAY",
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
  },
}));

// Mock the Supabase client so the image "download" returns a fake blob.
const mockDownload = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { storage: { from: jest.fn(() => ({ download: mockDownload })) } },
}));

const SUPABASE_URL = "https://test.supabase.co";
const VALID_IMAGE = `${SUPABASE_URL}/storage/v1/object/public/receipt-images/x.png`;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeBlob() {
  return { type: "image/png", arrayBuffer: async () => new ArrayBuffer(8) };
}

describe("POST /api/ocr", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    mockDownload.mockResolvedValue({ data: fakeBlob(), error: null });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  it("returns 400 when receiptId or imageUrl is missing", async () => {
    expect((await POST(makeRequest({ imageUrl: VALID_IMAGE }))).status).toBe(
      400,
    );
    expect((await POST(makeRequest({ receiptId: "r1" }))).status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns 400 for an imageUrl off the allowed storage host (SSRF guard)", async () => {
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: "https://evil.example.com/x.png" }),
    );
    expect(res.status).toBe(400);
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns 503 when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 when the image cannot be downloaded", async () => {
    mockDownload.mockResolvedValueOnce({ data: null, error: new Error("nope") });
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(400);
  });

  it("preserves decimal prices without truncation (numbers and currency strings)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "Luigi's",
        items: [
          { name: "Pizza", price: 19.99 },
          { name: "Wine", price: "$24.50" },
          { name: "Water", price: "4.05" },
        ],
        tax: 3.2,
        tip: 6.5,
        total: 58.24,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      items: { id: string; name: string; price: number }[];
    };
    expect(json.items).toHaveLength(3);
    expect(json.items[0].price).toBe(19.99);
    expect(json.items[1].price).toBe(24.5);
    expect(json.items[2].price).toBe(4.05);
    expect(typeof json.items[0].id).toBe("string");
  });

  it("extracts merchant, tax, tip and total (Story 13.4)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "  Luigi's Trattoria  ",
        items: [{ name: "Pizza", price: 19.99 }],
        tax: "$3.20",
        tip: 6.5,
        total: 29.69,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      merchant: string | null;
      tax: number | null;
      tip: number | null;
      total: number | null;
    };
    expect(json.merchant).toBe("Luigi's Trattoria"); // trimmed
    expect(json.tax).toBe(3.2); // currency string normalized
    expect(json.tip).toBe(6.5);
    expect(json.total).toBe(29.69);
  });

  it("returns 502 when the model returns malformed/non-object JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json at all" });
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 when the response has no items array", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ merchant: "X", tax: 1 }),
    });
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(502);
  });

  it("synthesizes one item at the subtotal for an itemless credit-card slip", async () => {
    // The Laser Wolf slip: no line items, just a printed subtotal + handwritten
    // tip/total. Should still produce a single splittable line at the subtotal.
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "Laser Wolf",
        items: [],
        subtotal: 184,
        tax: null,
        tip: 37,
        total: 221,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      items: { id: string; name: string; price: number }[];
      subtotal: number | null;
      tip: number | null;
      total: number | null;
    };
    expect(json.items).toHaveLength(1);
    expect(json.items[0].price).toBe(184);
    expect(json.items[0].name).toBe("Laser Wolf"); // merchant, when available
    expect(typeof json.items[0].id).toBe("string");
    expect(json.subtotal).toBe(184);
    expect(json.tip).toBe(37);
    expect(json.total).toBe(221);
  });

  it("backs the subtotal out of the total when no subtotal is printed", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: null,
        items: [],
        subtotal: null,
        tax: 8,
        tip: 20,
        total: 128,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      items: { name: string; price: number }[];
    };
    expect(json.items).toHaveLength(1);
    expect(json.items[0].price).toBe(100); // 128 - 8 - 20
    expect(json.items[0].name).toBe("Subtotal"); // generic when no merchant
  });

  it("does not synthesize a line when tax + tip meet/exceed the total (inconsistent scan)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "X",
        items: [],
        subtotal: null,
        tax: 0,
        tip: 120,
        total: 100,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as { items: unknown[] };
    expect(json.items).toHaveLength(0);
  });

  it("leaves items empty when there are no items and no recoverable amount", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "X",
        items: [],
        subtotal: null,
        tax: null,
        tip: null,
        total: null,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as { items: unknown[] };
    expect(json.items).toHaveLength(0);
  });

  it("does not synthesize a fallback line when real items are present", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: "Luigi's",
        items: [{ name: "Pizza", price: 19.99 }],
        subtotal: 19.99,
        tax: 1.6,
        tip: 4,
        total: 25.59,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      items: { name: string }[];
    };
    expect(json.items).toHaveLength(1);
    expect(json.items[0].name).toBe("Pizza");
  });

  it("returns null for missing merchant/tax/tip (so they aren't auto-filled)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        merchant: null,
        items: [{ name: "Pizza", price: 19.99 }],
        tax: null,
        tip: null,
        total: null,
      }),
    });

    const response = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      items: unknown[];
      merchant: string | null;
      tax: number | null;
      tip: number | null;
    };
    expect(json.items).toHaveLength(1);
    expect(json.merchant).toBeNull();
    expect(json.tax).toBeNull();
    expect(json.tip).toBeNull();
  });
});
