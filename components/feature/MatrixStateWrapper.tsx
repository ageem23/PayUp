"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";

export type LineItem = { id: string; name: string; price: number };

// MOCK ingestion: stands in for real OCR (PRD FR2 is not yet built). Seeds a
// fixed set of line items after a simulated ~2s "scan".
const MOCK_LINE_ITEMS: Omit<LineItem, "id">[] = [
  { name: "Woodfired Margherita Pizza", price: 19.0 },
  { name: "House Red Wine Carafe", price: 24.0 },
  { name: "Sparkling Water", price: 4.5 },
];

type Props = {
  receiptId: string;
  initialProcessedData: LineItem[] | null;
  children: (items: LineItem[]) => ReactNode;
};

export function MatrixStateWrapper({
  receiptId,
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
    // Only run the mock once, and only when the receipt has no items yet.
    if (items.length > 0 || startedRef.current) return;
    startedRef.current = true;

    let active = true;
    const timer = setTimeout(async () => {
      const mockLines: LineItem[] = MOCK_LINE_ITEMS.map((line) => ({
        id: crypto.randomUUID(),
        ...line,
      }));

      const { data, error } = await supabase
        .from("receipts")
        .update({ processed_data: mockLines })
        .eq("id", receiptId)
        .select("id");

      if (!active) return;
      // Only refresh the view if the write actually persisted. Supabase returns
      // error: null even when zero rows match (e.g. RLS denial / stale id), so
      // confirm a row was updated before trusting the result. Either way, stop
      // the spinner so the user isn't stuck on a skeleton.
      if (!error && data && data.length > 0) {
        setItems(mockLines);
      }
      setProcessing(false);
    }, 2000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [items.length, receiptId]);

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
