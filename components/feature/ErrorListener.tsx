"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logError } from "@/utils/logging/log";
import { shouldLogError } from "@/utils/logging/throttle";

// Records uncaught client errors that React error boundaries don't catch —
// synchronous `window.error` and `unhandledrejection` (Epic 23, Story 23.4).
// Throttled/deduped so a repeating error can't flood error_logs; `logError`
// itself is best-effort and swallow-on-failure, so this can't recurse.
export function ErrorListener() {
  const pathname = usePathname();

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || String(event.error ?? "Unknown error");
      if (!shouldLogError(`error:${message}`, Date.now())) return;
      void logError({
        source: "client",
        message,
        stack: event.error?.stack ?? null,
        path: pathname,
        context: { type: "window.error" },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; stack?: string } | undefined;
      const message = reason?.message ?? String(event.reason ?? "Unknown rejection");
      if (!shouldLogError(`rejection:${message}`, Date.now())) return;
      void logError({
        source: "client",
        message,
        stack: reason?.stack ?? null,
        path: pathname,
        context: { type: "unhandledrejection" },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  return null;
}
