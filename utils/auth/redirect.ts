// Open-redirect guard. Returns the path only if it's a safe same-origin
// absolute path; otherwise null. Rejects protocol-relative (`//host`), absolute
// URLs (`https://…`), and backslash tricks (`/\host`, which browsers normalize
// to `//host`). Values from URLSearchParams are already percent-decoded, so a
// `%5C` payload arrives here as a literal backslash and is caught.
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null; // must be a path
  if (raw.startsWith("//")) return null; // protocol-relative
  if (raw.includes("\\")) return null; // backslash → normalized to slash
  return raw;
}

// Read a validated `redirect` path from a URL's query string (defaults to the
// current location). Returns null when absent or unsafe.
export function readSafeRedirect(search?: string): string | null {
  const query =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  return safeInternalPath(new URLSearchParams(query).get("redirect"));
}
