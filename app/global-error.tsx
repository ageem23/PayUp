"use client";

import { useEffect } from "react";
import { logError } from "@/utils/logging/log";

// Root error boundary (Epic 23, Story 23.4). This replaces the root layout when
// the layout itself throws, so it must render its own <html>/<body> and can't
// rely on the app's global stylesheet — use inline styles for a guaranteed
// readable fallback. Logs the error, then offers a reset.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void logError({
      source: "client",
      message: error.message,
      stack: error.stack ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      context: { type: "global-error-boundary", digest: error.digest ?? null },
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 500 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#737373" }}>
          The error was logged. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #d4d4d4",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
