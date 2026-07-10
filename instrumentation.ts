import { logError } from "@/utils/logging/log";

// Global server-side error capture (Epic 23, Story 23.5). Next.js calls
// `onRequestError` for any error thrown while rendering/handling a request on
// the server — App Router routes, server components, route handlers. We log it
// to error_logs (best-effort; `logError` swallows its own failures) so backend
// crashes are visible without a client report. Runs in a server context with no
// user session, so error_logs' null-user_id insert path applies.
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
): Promise<void> {
  const err = error as { message?: string; stack?: string };
  await logError({
    source: "server",
    message: err?.message ?? String(error),
    stack: err?.stack ?? null,
    path: request?.path ?? null,
    context: {
      method: request?.method ?? null,
      routePath: context?.routePath ?? null,
      routeType: context?.routeType ?? null,
    },
  });
}
