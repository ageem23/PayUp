"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import {
  ReceiptMatrix,
  type SplitAllocation,
} from "@/components/feature/ReceiptMatrix";
import { ReceiptSummarySidebar } from "@/components/feature/ReceiptSummarySidebar";
import { ReceiptItemsEditor } from "@/components/feature/ReceiptItemsEditor";
import { ActivityTimeline } from "@/components/feature/ActivityTimeline";
import type { SaveState } from "@/components/feature/SyncStatusBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { patchReceiptFees } from "@/utils/db/receiptFees";
import { patchReceiptSplits } from "@/utils/db/matrixPatch";
import { patchReceiptItems } from "@/utils/db/receiptEdits";
import { calculateProportionalSplit } from "@/utils/math/billCalculations";
import type { AuditLogEntry } from "@/types/audit";

// How long to coalesce a burst of line-item keystrokes into one write.
const ITEMS_SAVE_DEBOUNCE_MS = 600;

// Order-insensitive equality for processed_data — like sameSplits, used to
// ignore the echo of our own item write and only apply genuine remote edits.
function sameItems(a: LineItem[], b: LineItem[]): boolean {
  const norm = (list: LineItem[]) =>
    JSON.stringify(
      [...list]
        .map((i) => ({ id: i.id, name: i.name, price: i.price }))
        .sort((x, y) => x.id.localeCompare(y.id)),
    );
  return norm(a) === norm(b);
}

// Debounce window for persisting fee edits — long enough to coalesce a burst of
// keystrokes into one write, short enough to feel instant.
const FEE_SAVE_DEBOUNCE_MS = 600;

const money = (value: number): string => `$${value.toFixed(2)}`;

// Cap the in-memory activity log so a long session can't grow it (and the DOM)
// without bound. Older entries fall off the bottom.
const AUDIT_LOG_LIMIT = 100;

// Order-insensitive equality for split_among. jsonb reorders object keys and
// may reorder array elements, so the echo of our own write won't string-match
// the local array — normalize (sort items + participants) before comparing so
// the self-echo is correctly ignored and only genuine remote changes apply.
function sameSplits(a: SplitAllocation[], b: SplitAllocation[]): boolean {
  const norm = (splits: SplitAllocation[]) =>
    JSON.stringify(
      [...splits]
        .map((s) => ({
          item_id: s.item_id,
          assigned: [...(s.assigned_participants ?? [])].sort(),
        }))
        .sort((x, y) => x.item_id.localeCompare(y.item_id)),
    );
  return norm(a) === norm(b);
}

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
  const { user } = useAuth();
  // The local actor for audit entries — email local-part, or "You" if unknown
  // (guards a missing or malformed email that would split to an empty string).
  const actorName = useMemo(() => {
    const email = user?.email;
    return email?.split("@")[0] || "You";
  }, [user]);

  const [tax, setTax] = useState<number>(initialTax);
  const [tip, setTip] = useState<number>(initialTip);
  const [feeSaveState, setFeeSaveState] = useState<SaveState>("idle");

  const [splits, setSplits] = useState<SplitAllocation[]>(
    Array.isArray(initialSplitAmong) ? initialSplitAmong : [],
  );
  const [splitSaveState, setSplitSaveState] = useState<SaveState>("idle");
  // Mirrors `splits` so handlers and the realtime callback always toggle from
  // the LATEST array (incl. an inbound remote update) rather than a render
  // closure — otherwise a local toggle could write a stale full array and wipe
  // a concurrent remote edit.
  const splitsRef = useRef<SplitAllocation[]>(
    Array.isArray(initialSplitAmong) ? initialSplitAmong : [],
  );
  const setSplitsSynced = useCallback((next: SplitAllocation[]) => {
    splitsRef.current = next;
    setSplits(next);
  }, []);

  // Editable line items (Story 13.6). Seeded from the OCR'd items prop; from
  // here ReceiptSplitView owns them so edits flow to the matrix + totals.
  // `lineItemsRef` mirrors them so handlers/realtime act on the latest array.
  const [lineItems, setLineItems] = useState<LineItem[]>(items);
  const lineItemsRef = useRef<LineItem[]>(items);
  const setLineItemsSynced = useCallback((next: LineItem[]) => {
    lineItemsRef.current = next;
    setLineItems(next);
  }, []);
  const [editingItems, setEditingItems] = useState(false);
  const [itemsSaveState, setItemsSaveState] = useState<SaveState>("idle");
  const itemsChain = useRef<Promise<unknown>>(Promise.resolve());
  const itemsSeq = useRef(0);
  const itemsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist the full processed_data array (serialized so a slower earlier save
  // can't land after a newer one; only the newest seq sets the visible status).
  const saveItems = useCallback(
    (next: LineItem[]) => {
      const seq = ++itemsSeq.current;
      setItemsSaveState("saving");
      itemsChain.current = itemsChain.current
        .catch(() => undefined)
        .then(() => patchReceiptItems(receiptId, next))
        .then(() => {
          if (itemsSeq.current === seq) setItemsSaveState("saved");
        })
        .catch(() => {
          if (itemsSeq.current === seq) setItemsSaveState("error");
        });
    },
    [receiptId],
  );

  const cancelPendingItemsSave = useCallback(() => {
    if (itemsTimerRef.current) {
      clearTimeout(itemsTimerRef.current);
      itemsTimerRef.current = null;
    }
  }, []);

  const scheduleItemsSave = useCallback(
    (next: LineItem[]) => {
      cancelPendingItemsSave();
      itemsTimerRef.current = setTimeout(() => {
        itemsTimerRef.current = null;
        saveItems(next);
      }, ITEMS_SAVE_DEBOUNCE_MS);
    },
    [cancelPendingItemsSave, saveItems],
  );

  // In-memory activity log for this session (newest first). Not persisted.
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const auditIdRef = useRef(0);
  const logActivity = useCallback(
    (actionDescription: string) => {
      setAuditLog((prev) =>
        [
          {
            id: String(++auditIdRef.current),
            timestamp: new Date().toISOString(),
            actorName,
            actionDescription,
          },
          ...prev,
        ].slice(0, AUDIT_LOG_LIMIT),
      );
    },
    [actorName],
  );

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
        // Audit only AFTER a successful commit, diffing against the last
        // committed values — so a failed (then retried) save can't log a change
        // that never persisted, nor double-log the same one.
        const before = savedFeesRef.current;
        if (nextTax !== before.tax) logActivity(`set Tax to ${money(nextTax)}`);
        if (nextTip !== before.tip) logActivity(`set Tip to ${money(nextTip)}`);
        savedFeesRef.current = { tax: nextTax, tip: nextTip };
        if (feeSeq.current === seq) setFeeSaveState("saved");
      })
      .catch(() => {
        if (feeSeq.current === seq) setFeeSaveState("error");
      });
  }, [receiptId, logActivity]);

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

  // Realtime collaboration (Epic 12, Story 12.2): apply remote split/fee edits
  // to this receipt as they happen. Every local edit already writes to the DB
  // (the autosave above), and Supabase broadcasts that row change to the other
  // members' channels — so the DB write IS the broadcast; here we only consume
  // inbound changes. Scoped to authenticated, whitelisted members (no anon).
  useEffect(() => {
    const channel = supabase
      .channel(`receipt:${receiptId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "receipts",
          filter: `id=eq.${receiptId}`,
        },
        (payload) => {
          const row = payload.new as {
            split_among?: SplitAllocation[] | null;
            processed_data?: LineItem[] | null;
            tax?: number | null;
            tip?: number | null;
          };

          // Apply remote line-item edits (Story 13.6) — ignore the echo of our
          // own write via the order-insensitive compare. Skipped while a local
          // item edit is mid-debounce, so an inbound echo can't overwrite the
          // value the user is still typing (mirrors the fee guard below).
          if (itemsTimerRef.current === null && Array.isArray(row.processed_data)) {
            const incomingItems = row.processed_data;
            if (!sameItems(lineItemsRef.current, incomingItems)) {
              setLineItemsSynced(incomingItems);
            }
          }

          // Replace splits only when the incoming array differs (order-
          // insensitive) — the echo of our own write is ignored, preventing a
          // feedback loop and grid reset (AC5). Compared against splitsRef so a
          // local toggle can't race the closure.
          if (Array.isArray(row.split_among)) {
            const incoming = row.split_among;
            if (!sameSplits(splitsRef.current, incoming)) {
              setSplitsSynced(incoming);
            }
          }

          // Apply remote fees — but NOT while a local fee edit is mid-debounce,
          // or we'd overwrite the user's in-progress value (the saver would then
          // see saved===current and silently drop their edit). When idle, sync
          // the fee refs so the inbound values count as already-committed (LWW).
          if (feeTimerRef.current === null) {
            if (typeof row.tax === "number") {
              const next = row.tax;
              setTax((prev) => (prev === next ? prev : next));
              savedFeesRef.current = { ...savedFeesRef.current, tax: next };
              currentFeesRef.current = { ...currentFeesRef.current, tax: next };
            }
            if (typeof row.tip === "number") {
              const next = row.tip;
              setTip((prev) => (prev === next ? prev : next));
              savedFeesRef.current = { ...savedFeesRef.current, tip: next };
              currentFeesRef.current = { ...currentFeesRef.current, tip: next };
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // setSplitsSynced/setLineItemsSynced are stable (useCallback []), so this
    // only re-subscribes on receiptId change.
  }, [receiptId, setSplitsSynced, setLineItemsSynced]);

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
    // Base the toggle on the latest splits (splitsRef), which includes any
    // inbound remote update — not the render closure — so we don't overwrite a
    // concurrent edit when we save the full array.
    const next = applyToggle(splitsRef.current, itemId, participant, checked);
    const seq = ++splitSeq.current;
    setSplitsSynced(next);
    setSplitSaveState("saving");
    const itemName =
      lineItemsRef.current.find((item) => item.id === itemId)?.name || "item";
    logActivity(
      checked
        ? `assigned '${itemName}' to ${participant}`
        : `unassigned '${itemName}' from ${participant}`,
    );
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

  // --- Line-item editing (Story 13.6) ---
  const updateItem = useCallback(
    (itemId: string, patch: Partial<Pick<LineItem, "name" | "price">>) => {
      const next = lineItemsRef.current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      );
      setLineItemsSynced(next);
      scheduleItemsSave(next);
    },
    [setLineItemsSynced, scheduleItemsSave],
  );

  const handleAddItem = useCallback(() => {
    const next: LineItem[] = [
      ...lineItemsRef.current,
      { id: crypto.randomUUID(), name: "", price: 0 },
    ];
    setLineItemsSynced(next);
    // Drop any pending debounced edit — it holds a stale array that would land
    // after this immediate write and undo the add.
    cancelPendingItemsSave();
    saveItems(next); // structural change — persist immediately, no debounce
    logActivity("added a line item");
  }, [setLineItemsSynced, cancelPendingItemsSave, saveItems, logActivity]);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const removed = lineItemsRef.current.find((item) => item.id === itemId);
      const nextItems = lineItemsRef.current.filter(
        (item) => item.id !== itemId,
      );
      setLineItemsSynced(nextItems);
      // Drop any pending debounced edit (stale array) before this immediate save.
      cancelPendingItemsSave();
      saveItems(nextItems);

      // Prune the deleted item's split_among node so no orphan assignment is
      // left behind, and persist the splits via their own serialized chain.
      const prunedSplits = splitsRef.current.filter(
        (split) => split.item_id !== itemId,
      );
      if (prunedSplits.length !== splitsRef.current.length) {
        setSplitsSynced(prunedSplits);
        const seq = ++splitSeq.current;
        setSplitSaveState("saving");
        splitChain.current = splitChain.current
          .catch(() => undefined)
          .then(() => patchReceiptSplits(receiptId, prunedSplits))
          .then(() => {
            if (splitSeq.current === seq) setSplitSaveState("saved");
          })
          .catch(() => {
            if (splitSeq.current === seq) setSplitSaveState("error");
          });
      }
      logActivity(`removed '${removed?.name || "item"}'`);
    },
    [
      receiptId,
      setLineItemsSynced,
      cancelPendingItemsSave,
      saveItems,
      setSplitsSynced,
      logActivity,
    ],
  );

  // Flush a pending debounced item edit on unmount so it isn't lost on navigate.
  // Queue it on itemsChain so it lands after any in-flight save (preserves order).
  useEffect(() => {
    return () => {
      if (itemsTimerRef.current) {
        clearTimeout(itemsTimerRef.current);
        itemsTimerRef.current = null;
        const pending = lineItemsRef.current;
        itemsChain.current = itemsChain.current
          .catch(() => undefined)
          .then(() => patchReceiptItems(receiptId, pending))
          .catch(() => undefined);
      }
    };
  }, [receiptId]);

  const totals = useMemo(
    () => calculateProportionalSplit(lineItems, splits, participants, tax, tip),
    [lineItems, splits, participants, tax, tip],
  );

  return (
    <div>
      {/*
        Mobile (single column): the assignment matrix comes first, fees/total
        sidebar second (Story 13.7) — assign items, then read the totals below.
        Desktop (lg): `order` restores sidebar-left, matrix-right to match the
        [16rem_1fr] column track.
      */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
        <ReceiptSummarySidebar
          tax={tax}
          tip={tip}
          onTaxChange={handleTaxChange}
          onTipChange={handleTipChange}
          saveState={feeSaveState}
          totals={totals}
          className="order-2 lg:order-1"
        />
        <div className="order-1 flex flex-col gap-3 lg:order-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setEditingItems((value) => !value)}
              className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium dark:border-neutral-700"
            >
              {editingItems ? "Done editing" : "Edit items"}
            </button>
          </div>
          {editingItems ? (
            <ReceiptItemsEditor
              items={lineItems}
              saveState={itemsSaveState}
              onChangeName={(id, name) => updateItem(id, { name })}
              onChangePrice={(id, price) => updateItem(id, { price })}
              onAdd={handleAddItem}
              onDelete={handleDeleteItem}
            />
          ) : null}
          <ReceiptMatrix
            items={lineItems}
            participants={participants}
            splits={splits}
            onToggle={handleToggle}
            saveState={splitSaveState}
          />
        </div>
      </div>
      <ActivityTimeline entries={auditLog} />
    </div>
  );
}
