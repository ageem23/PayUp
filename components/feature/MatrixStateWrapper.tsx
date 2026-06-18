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

    let active = true;
    const run = async () => {
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiptId, imageUrl }),
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { items?: LineItem[] };
        const extracted = Array.isArray(payload.items) ? payload.items : [];
        if (extracted.length === 0) return;

        // Persist under the user's RLS session (client-side).
        const { data, error } = await supabase
          .from("receipts")
          .update({ processed_data: extracted })
          .eq("id", receiptId)
          .select("id");
        if (!active) return;
        if (!error && data && data.length > 0) {
          setItems(extracted);
        }
      } catch {
        // Network/parse failure — fall through to stop the spinner so the user
        // isn't stuck on a skeleton; the matrix renders empty.
      } finally {
        if (active) setProcessing(false);
      }
    };
    void run();

    return () => {
      active = false;
    };
  }, [items.length, receiptId, imageUrl]);

  if (processing) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <p className="text-sm text-neutral-500">Scanning receipt…</p>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-10 animate-pulse rounded bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  return <>{children(items)}</>;
}
