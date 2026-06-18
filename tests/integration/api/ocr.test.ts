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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ocr", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 when receiptId or imageUrl is missing", async () => {
    const missingReceipt = await POST(
      makeRequest({ imageUrl: "https://example.com/i.jpg" }),
    );
    expect(missingReceipt.status).toBe(400);

    const missingImage = await POST(makeRequest({ receiptId: "r1" }));
    expect(missingImage.status).toBe(400);

    expect(mockGenerateContent).not.toHaveBeenCalled();
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
      makeRequest({ receiptId: "r1", imageUrl: "https://example.com/i.png" }),
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
