"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";

export type LineItem = { id: string; name: string; price: number };

type Props = {
  receiptId: string;
  imageUrl: string | null;
  initialProcessedData: LineItem[] | null;
  children: (items: LineItem[]) => ReactNode;
};

export function MatrixStateWrapper({
  receiptId,
  imageUrl,
  initialProcessedData,
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
        const payload = (await res.json()) as { items?: LineItem[] };
        const extracted = Array.isArray(payload.items) ? payload.items : [];
        if (extracted.length === 0) return;

        // Persist under the user's RLS session (client-side).
        const { data, error } = await supabase
          .from("receipts")
          .update({ processed_data: extracted })
          .eq("id", receiptId)
          .select("id");
        if (!error && data && data.length > 0) {
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
  }, [items.length, receiptId, imageUrl]);

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
