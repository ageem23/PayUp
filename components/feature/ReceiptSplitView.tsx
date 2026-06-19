"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import {
  ReceiptMatrix,
  type SplitAllocation,
} from "@/components/feature/ReceiptMatrix";
import { ReceiptSummarySidebar } from "@/components/feature/ReceiptSummarySidebar";
import type { SaveState } from "@/components/feature/SyncStatusBar";
import { patchReceiptFees } from "@/utils/db/receiptFees";

// Debounce window for persisting fee edits — long enough to coalesce a burst of
// keystrokes into one write, short enough to feel instant.
const FEE_SAVE_DEBOUNCE_MS = 600;

type Props = {
  receiptId: string;
  items: LineItem[];
  participants: string[];
  initialSplitAmong: SplitAllocation[] | null;
  initialTax: number;
  initialTip: number;
};

export function ReceiptSplitView({
  receiptId,
  items,
  participants,
  initialSplitAmong,
  initialTax,
  initialTip,
}: Props) {
  const [tax, setTax] = useState<number>(initialTax);
  const [tip, setTip] = useState<number>(initialTip);
  const [feeSaveState, setFeeSaveState] = useState<SaveState>("idle");

  // Last values we've successfully sent to the DB — guards against saving on
  // mount and against redundant writes when a value lands back on its prior one.
  const savedRef = useRef<{ tax: number; tip: number }>({
    tax: initialTax,
    tip: initialTip,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serialize writes so a slower earlier save can't land after a newer one.
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const saveSeq = useRef(0);

  const scheduleSave = useCallback(
    (nextTax: number, nextTip: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (nextTax === savedRef.current.tax && nextTip === savedRef.current.tip)
          return;
        const seq = ++saveSeq.current;
        setFeeSaveState("saving");
        saveChain.current = saveChain.current
          .catch(() => undefined)
          .then(() => patchReceiptFees(receiptId, { tax: nextTax, tip: nextTip }))
          .then(() => {
            savedRef.current = { tax: nextTax, tip: nextTip };
            if (saveSeq.current === seq) setFeeSaveState("saved");
          })
          .catch(() => {
            if (saveSeq.current === seq) setFeeSaveState("error");
          });
      }, FEE_SAVE_DEBOUNCE_MS);
    },
    [receiptId],
  );

  // Flush any pending debounce on unmount so an in-flight edit isn't lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTaxChange = (value: number) => {
    setTax(value);
    scheduleSave(value, tip);
  };

  const handleTipChange = (value: number) => {
    setTip(value);
    scheduleSave(tax, value);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
      <ReceiptSummarySidebar
        tax={tax}
        tip={tip}
        onTaxChange={handleTaxChange}
        onTipChange={handleTipChange}
        saveState={feeSaveState}
      />
      <ReceiptMatrix
        receiptId={receiptId}
        items={items}
        participants={participants}
        initialSplitAmong={initialSplitAmong}
      />
    </div>
  );
}
