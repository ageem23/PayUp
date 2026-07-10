"use client";

import { useEffect, useRef, useState } from "react";
import { GETTING_STARTED_URL } from "@/utils/links";
import type { FeedbackKind } from "@/utils/logging/log";
import { FeedbackModal } from "./FeedbackModal";

// Floating help widget (Epic 23, Stories 23.2 + 23.3), fixed bottom-right — the
// corner the old ThemeToggle used. Opens a small menu: Getting started, Report
// an error, Suggest a feature. The two report actions open a shared modal
// (FeedbackModal) parameterized by kind. Mounted once in the root layout.
export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // When the menu opens, move focus into it; close on Escape (restoring focus
  // to the trigger) or an outside click.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const openFeedback = (kind: FeedbackKind) => {
    setFeedbackKind(kind);
    setOpen(false);
  };

  const itemClass =
    "block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <>
      <div ref={containerRef} className="fixed bottom-4 right-4 z-50">
        {open ? (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Help"
            className="mb-2 w-56 overflow-hidden rounded-lg border border-neutral-300 bg-background shadow-md dark:border-neutral-700"
          >
            <a
              role="menuitem"
              href={GETTING_STARTED_URL}
              target="_blank"
              rel="noreferrer"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              Getting started
            </a>
            <button
              role="menuitem"
              type="button"
              onClick={() => openFeedback("error_report")}
              className={itemClass}
            >
              Report an error
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => openFeedback("feature_request")}
              className={itemClass}
            >
              Suggest a feature
            </button>
          </div>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Help"
          title="Help"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-background text-foreground shadow-md hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>

      {feedbackKind ? (
        <FeedbackModal kind={feedbackKind} onClose={() => setFeedbackKind(null)} />
      ) : null}
    </>
  );
}
