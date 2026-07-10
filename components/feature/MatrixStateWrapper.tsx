"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";
import { defaultTipFromItems } from "@/utils/math/defaultTip";

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
  /** Reports whether the OCR scan is in flight, so the parent can gate actions
   *  (e.g. disabling the even-split toggle until a total exists, Epic 21). */
  onProcessingChange?: (processing: boolean) => void;
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
  onProcessingChange,
  children,
}: Props) {
  const initialItems = Array.isArray(initialProcessedData)
    ? initialProcessedData
    : [];
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [processing, setProcessing] = useState(initialItems.length === 0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Surface scan progress to the parent (onProcessingChange is the stable
  // setter from useState, so this only fires when `processing` flips).
  useEffect(() => {
    onProcessingChange?.(processing);
  }, [processing, onProcessingChange]);

  // OCR is async; the user may rename the receipt or set a fee while the scan is
  // in flight. Read the LATEST values (not the mount-time closure) when deciding
  // the prefill, so a concurrent edit is never clobbered.
  const latestRef = useRef({ initialName, initialTax, initialTip, onPrefill });
  useEffect(() => {
    latestRef.current = { initialName, initialTax, initialTip, onPrefill };
  }, [initialName, initialTax, initialTip, onPrefill]);

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
        // typed or a fee they already set (Story 13.4). Read the LATEST values
        // (latestRef), not the mount closure, so an edit made during the scan
        // wins. tax/tip prefill only when OCR returned a non-negative number
        // (the DB enforces >= 0).
        const {
          initialName: curName,
          initialTax: curTax,
          initialTip: curTip,
          onPrefill: curOnPrefill,
        } = latestRef.current;
        const update: Record<string, unknown> = { processed_data: extracted };
        const resolved: PrefilledFields = {
          name: curName,
          tax: curTax,
          tip: curTip,
        };
        if (!curName?.trim() && payload.merchant) {
          update.name = payload.merchant;
          resolved.name = payload.merchant;
        }
        if (
          (curTax ?? 0) === 0 &&
          typeof payload.tax === "number" &&
          payload.tax >= 0
        ) {
          update.tax = payload.tax;
          resolved.tax = payload.tax;
        }
        if ((curTip ?? 0) === 0) {
          if (typeof payload.tip === "number" && payload.tip >= 0) {
            // OCR detected a tip — it wins over the default.
            update.tip = payload.tip;
            resolved.tip = payload.tip;
          } else {
            // No tip on the receipt: default to 20% of the pre-tax subtotal
            // (Story 13.5). Skipped when it computes to 0 (empty subtotal).
            const defaultTip = defaultTipFromItems(extracted);
            if (defaultTip > 0) {
              update.tip = defaultTip;
              resolved.tip = defaultTip;
            }
          }
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
          curOnPrefill?.(resolved);
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
    // startedRef guarantees the body runs once. Prefill inputs are read from
    // latestRef (kept current by the effect above), so they aren't deps here.
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
