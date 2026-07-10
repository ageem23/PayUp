"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback, type FeedbackKind } from "@/utils/logging/log";

const COPY: Record<
  FeedbackKind,
  { title: string; placeholder: string; cta: string; noun: string }
> = {
  error_report: {
    title: "Report an error",
    placeholder: "What went wrong, and what were you doing?",
    cta: "Send report",
    noun: "report",
  },
  feature_request: {
    title: "Suggest a feature",
    placeholder: "What would you like PayUp to do?",
    cta: "Send suggestion",
    noun: "suggestion",
  },
};

// Pull the trip/receipt in view from the pathname so a report carries context.
// The widget lives in the root layout, so route params aren't available via
// hooks — parse the path instead.
export function contextFromPath(path: string): Record<string, string> {
  const ctx: Record<string, string> = {};
  const match = path.match(/^\/trips\/([^/]+)(?:\/receipts\/([^/]+))?/);
  if (match) {
    ctx.trip_id = match[1];
    if (match[2]) ctx.receipt_id = match[2];
  }
  return ctx;
}

// Shared modal for both "Report an error" and "Suggest a feature" (Story 23.3),
// parameterized by `kind`. Captures the message + current path + trip/receipt
// context. Best-effort: a failed submit shows an inline error, never crashes.
export function FeedbackModal({
  kind,
  onClose,
}: {
  kind: FeedbackKind;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copy = COPY[kind];

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const { ok } = await submitFeedback({
      kind,
      message: trimmed,
      path: pathname,
      context: contextFromPath(pathname),
    });
    setStatus(ok ? "sent" : "error");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-neutral-300 bg-background p-5 shadow-lg dark:border-neutral-700"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-medium">{copy.title}</h2>

        {status === "sent" ? (
          <div className="mt-3">
            <p className="text-sm text-green-600">
              Thanks — your {copy.noun} was sent.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              rows={5}
              placeholder={copy.placeholder}
              className="mt-3 w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            {status === "error" ? (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {message.trim()
                  ? "Couldn't send. Please try again."
                  : "Please enter a message."}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-neutral-400">
              Includes the page you&apos;re on to help us investigate.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={status === "sending"}
                className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : copy.cta}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
