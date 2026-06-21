"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";

export type LineItem = { id: string; name: string; price: number };

// The richer OCR payload (Story 13.4). tax/tip/total are null when the model
// couldn't find them on the receipt (vs. a real 0).
type OcrPayload = {
  items?: LineItem[];
  merchant?: string | null;
  tax?: number | null;
  tip?: number | null;
  total?: number | null;
};

export type PrefilledFields = { name: string | null; tax: number; tip: number };

type Props = {
  receiptId: string;
  imageUrl: string | null;
  initialProcessedData: LineItem[] | null;
  /** Current receipt name/fees, used to prefill ONLY when empty/zero. */
  initialName: string | null;
  initialTax: number;
  initialTip: number;
  /** Called after OCR prefills any of name/tax/tip, with the resolved values. */
  onPrefill?: (fields: PrefilledFields) => void;
  children: (items: LineItem[]) => ReactNode;
};

export function MatrixStateWrapper({
  receiptId,
  imageUrl,
  initialProcessedData,
  initialName,
  initialTax,
  initialTip,
  onPrefill,
  children,
}: Props) {
  const initialItems = Array.isArray(initialProcessedData)
    ? initialProcessedData
    : [];
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [processing, setProcessing] = useState(initialItems.length === 0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Run OCR once, and only when the receipt has no items yet.
    if (items.length > 0 || startedRef.current) return;
    startedRef.current = true;

    // Nothing to scan without an image.
    if (!imageUrl) {
      setProcessing(false);
      return;
    }

    // No `active`/cleanup cancellation flag here on purpose: `startedRef`
    // already guarantees a single run, and under React StrictMode's
    // mount→unmount→remount the cancel flag would discard the only in-flight
    // result (DB updated, UI not). The state setters are stable and safely
    // no-op if the component has truly unmounted.
    const run = async () => {
      setOcrError(null);
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiptId, imageUrl }),
        });
        if (!res.ok) {
          setOcrError("Couldn't scan the receipt. Please try again.");
          return;
        }
        const payload = (await res.json()) as OcrPayload;
        const extracted = Array.isArray(payload.items) ? payload.items : [];
        if (extracted.length === 0) return;

        // Build a prefill-only update: never overwrite a name the user already
        // typed or a fee they already set (Story 13.4). tax/tip prefill only
        // when OCR returned a non-negative number (the DB enforces >= 0).
        const update: Record<string, unknown> = { processed_data: extracted };
        const resolved: PrefilledFields = {
          name: initialName,
          tax: initialTax,
          tip: initialTip,
        };
        if (!initialName?.trim() && payload.merchant) {
          update.name = payload.merchant;
          resolved.name = payload.merchant;
        }
        if (
          (initialTax ?? 0) === 0 &&
          typeof payload.tax === "number" &&
          payload.tax >= 0
        ) {
          update.tax = payload.tax;
          resolved.tax = payload.tax;
        }
        if (
          (initialTip ?? 0) === 0 &&
          typeof payload.tip === "number" &&
          payload.tip >= 0
        ) {
          update.tip = payload.tip;
          resolved.tip = payload.tip;
        }

        // Persist under the user's RLS session (client-side).
        const { data, error } = await supabase
          .from("receipts")
          .update(update)
          .eq("id", receiptId)
          .select("id");
        if (!error && data && data.length > 0) {
          // Surface resolved fields BEFORE flipping `processing` off, so the
          // split view (which mounts only once processing ends) initializes
          // from the prefilled tax/tip.
          onPrefill?.(resolved);
          setItems(extracted);
        } else {
          setOcrError("Scanned the receipt but couldn't save the items.");
        }
      } catch {
        setOcrError("Couldn't scan the receipt. Please try again.");
      } finally {
        setProcessing(false);
      }
    };
    void run();
    // startedRef guarantees the body runs once; the extra deps only re-enter the
    // early-return guard, so prefill always uses the initial (mount) values.
  }, [
    items.length,
    receiptId,
    imageUrl,
    initialName,
    initialTax,
    initialTip,
    onPrefill,
  ]);

  if (processing) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <p className="text-sm text-neutral-500">Scanning receipt…</p>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {ocrError ? (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {ocrError}
        </p>
      ) : null}
      {children(items)}
    </>
  );
}
