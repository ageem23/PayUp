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

const SUPABASE_URL = "https://test.supabase.co";
const VALID_IMAGE = `${SUPABASE_URL}/storage/v1/object/public/receipt-images/x.png`;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ocr", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns 503 when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 when the image cannot be fetched", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const res = await POST(
      makeRequest({ receiptId: "r1", imageUrl: VALID_IMAGE }),
    );
    expect(res.status).toBe(400);
  });

  it("preserves decimal prices without truncation (numbers and currency strings)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([
        { name: "Pizza", price: 19.99 },
        { name: "Wine", price: "$24.50" },
        { name: "Water", price: "4.05" },
      ]),
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
});
