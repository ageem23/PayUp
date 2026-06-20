/**
 * @jest-environment node
 */
import { safeInternalPath, readSafeRedirect } from "@/utils/auth/redirect";

describe("safeInternalPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/invite/abc-123")).toBe("/invite/abc-123");
    expect(safeInternalPath("/a?b=c#d")).toBe("/a?b=c#d");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("http://evil.com")).toBeNull();
  });

  it("rejects backslash tricks (browsers normalize \\ to /)", () => {
    expect(safeInternalPath("/\\evil.com")).toBeNull();
    expect(safeInternalPath("/\\/\\evil.com")).toBeNull();
    expect(safeInternalPath("\\/evil.com")).toBeNull();
  });

  it("rejects empty / non-path / nullish values", () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath("dashboard")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
  });
});

describe("readSafeRedirect", () => {
  it("extracts and validates the redirect param from a query string", () => {
    expect(readSafeRedirect("?redirect=/invite/x")).toBe("/invite/x");
    expect(readSafeRedirect("?redirect=//evil.com")).toBeNull();
    expect(readSafeRedirect("?foo=bar")).toBeNull();
    // URLSearchParams decodes %5C → backslash, which must still be rejected.
    expect(readSafeRedirect("?redirect=/%5Cevil.com")).toBeNull();
  });
});
