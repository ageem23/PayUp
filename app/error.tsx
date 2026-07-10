"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logError } from "@/utils/logging/log";

// Route-segment error boundary (Epic 23, Story 23.4). Renders a friendly
// fallback and logs the render error to error_logs. `reset` re-renders the
// segment so the user can recover.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    void logError({
      source: "client",
      message: error.message,
      stack: error.stack ?? null,
      path: pathname,
      context: { type: "error-boundary", digest: error.digest ?? null },
    });
  }, [error, pathname]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="text-sm text-neutral-500">
        The error was logged. You can try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Try again
      </button>
    </main>
  );
}
