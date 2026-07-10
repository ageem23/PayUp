// Parse the trip/receipt in view from a pathname so a feedback report / error
// carries context (Epic 23, Story 23.3). Pure — no React or Supabase imports —
// so it's unit-testable in isolation and safe to import anywhere.
export function contextFromPath(path: string): Record<string, string> {
  const ctx: Record<string, string> = {};
  const match = path.match(/^\/trips\/([^/]+)(?:\/receipts\/([^/]+))?/);
  if (match) {
    ctx.trip_id = match[1];
    if (match[2]) ctx.receipt_id = match[2];
  }
  return ctx;
}
