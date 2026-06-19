"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import {
  ReceiptMatrix,
  type SplitAllocation,
} from "@/components/feature/ReceiptMatrix";
import { ReceiptSummarySidebar } from "@/components/feature/ReceiptSummarySidebar";
import type { SaveState } from "@/components/feature/SyncStatusBar";
import { patchReceiptFees } from "@/utils/db/receiptFees";
import { patchReceiptSplits } from "@/utils/db/matrixPatch";
import { calculateProportionalSplit } from "@/utils/math/billCalculations";

// Debounce window for persisting fee edits — long enough to coalesce a burst of
// keystrokes into one write, short enough to feel instant.
const FEE_SAVE_DEBOUNCE_MS = 600;

// Pure: returns a new split_among array with only the matching item_id node
// changed; every other line is preserved (split_among is one JSONB column).
function applyToggle(
  splits: SplitAllocation[],
  itemId: string,
  participant: string,
  checked: boolean,
): SplitAllocation[] {
  const existing = splits.find((split) => split.item_id === itemId);
  if (!existing) {
    return checked
      ? [...splits, { item_id: itemId, assigned_participants: [participant] }]
      : splits;
  }
  const assigned = checked
    ? Array.from(new Set([...existing.assigned_participants, participant]))
    : existing.assigned_participants.filter((p) => p !== participant);
  return splits.map((split) =>
    split.item_id === itemId
      ? { ...split, assigned_participants: assigned }
      : split,
  );
}

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

  const [splits, setSplits] = useState<SplitAllocation[]>(
    Array.isArray(initialSplitAmong) ? initialSplitAmong : [],
  );
  const [splitSaveState, setSplitSaveState] = useState<SaveState>("idle");

  // Last fee values successfully sent to the DB — guards against saving on
  // mount and against redundant writes when a value lands back on its prior one.
  const savedFeesRef = useRef<{ tax: number; tip: number }>({
    tax: initialTax,
    tip: initialTip,
  });
  // Latest edited fees, updated synchronously by the handlers. The debounced
  // save and the unmount flush read from here (not a render closure) so a fast
  // tax-then-tip edit can't persist a stale value for the other column.
  const currentFeesRef = useRef<{ tax: number; tip: number }>({
    tax: initialTax,
    tip: initialTip,
  });
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serialize writes so a slower earlier save can't land after a newer one.
  const feeChain = useRef<Promise<unknown>>(Promise.resolve());
  const feeSeq = useRef(0);
  const splitChain = useRef<Promise<unknown>>(Promise.resolve());
  const splitSeq = useRef(0);

  // Persist the latest fees from currentFeesRef. Shared by the debounce timer
  // and the unmount flush so both write the same up-to-date pair.
  const runFeeSave = useCallback(() => {
    const { tax: nextTax, tip: nextTip } = currentFeesRef.current;
    if (
      nextTax === savedFeesRef.current.tax &&
      nextTip === savedFeesRef.current.tip
    )
      return;
    const seq = ++feeSeq.current;
    setFeeSaveState("saving");
    feeChain.current = feeChain.current
      .catch(() => undefined)
      .then(() => patchReceiptFees(receiptId, { tax: nextTax, tip: nextTip }))
      .then(() => {
        savedFeesRef.current = { tax: nextTax, tip: nextTip };
        if (feeSeq.current === seq) setFeeSaveState("saved");
      })
      .catch(() => {
        if (feeSeq.current === seq) setFeeSaveState("error");
      });
  }, [receiptId]);

  const scheduleFeeSave = useCallback(() => {
    if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
    feeTimerRef.current = setTimeout(() => {
      feeTimerRef.current = null;
      runFeeSave();
    }, FEE_SAVE_DEBOUNCE_MS);
  }, [runFeeSave]);

  // On unmount, flush a still-pending debounced edit so it isn't lost when the
  // user navigates away within the debounce window. Fire-and-forget — the
  // serialized chain isn't needed once the view is gone.
  useEffect(() => {
    return () => {
      if (feeTimerRef.current) {
        clearTimeout(feeTimerRef.current);
        feeTimerRef.current = null;
        const { tax, tip } = currentFeesRef.current;
        if (tax !== savedFeesRef.current.tax || tip !== savedFeesRef.current.tip) {
          void patchReceiptFees(receiptId, { tax, tip }).catch(() => undefined);
        }
      }
    };
  }, [receiptId]);

  const handleTaxChange = (value: number) => {
    setTax(value);
    currentFeesRef.current = { ...currentFeesRef.current, tax: value };
    scheduleFeeSave();
  };

  const handleTipChange = (value: number) => {
    setTip(value);
    currentFeesRef.current = { ...currentFeesRef.current, tip: value };
    scheduleFeeSave();
  };

  const handleToggle = (itemId: string, participant: string, checked: boolean) => {
    const next = applyToggle(splits, itemId, participant, checked);
    const seq = ++splitSeq.current;
    setSplits(next);
    setSplitSaveState("saving");
    // Auto-save the FULL updated split_among array (preserves every line),
    // queued after any in-flight save so writes apply in order. Only the newest
    // save (seq) may set the visible status — stale completions are ignored.
    splitChain.current = splitChain.current
      .catch(() => undefined)
      .then(() => patchReceiptSplits(receiptId, next))
      .then(() => {
        if (splitSeq.current === seq) setSplitSaveState("saved");
      })
      .catch(() => {
        if (splitSeq.current === seq) setSplitSaveState("error");
      });
  };

  const totals = useMemo(
    () => calculateProportionalSplit(items, splits, participants, tax, tip),
    [items, splits, participants, tax, tip],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
      <ReceiptSummarySidebar
        tax={tax}
        tip={tip}
        onTaxChange={handleTaxChange}
        onTipChange={handleTipChange}
        saveState={feeSaveState}
        totals={totals}
      />
      <ReceiptMatrix
        items={items}
        participants={participants}
        splits={splits}
        onToggle={handleToggle}
        saveState={splitSaveState}
      />
    </div>
  );
}
