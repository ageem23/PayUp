"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import {
  MatrixStateWrapper,
  type LineItem,
  type PrefilledFields,
} from "@/components/feature/MatrixStateWrapper";
import { type SplitAllocation } from "@/components/feature/ReceiptMatrix";
import { ReceiptSplitView } from "@/components/feature/ReceiptSplitView";
import { EvenSplitPanel } from "@/components/feature/EvenSplitPanel";
import { patchReceiptName, patchReceiptPaidBy } from "@/utils/db/receiptEdits";

type Trip = { id: string; name: string; participants: string[] | null };

type Receipt = {
  id: string;
  name: string;
  image_url: string | null;
  processed_data: LineItem[] | null;
  split_among: SplitAllocation[] | null;
  tax: number | null;
  tip: number | null;
  paid_by: string;
  // Even-Split Mode (Epic 21).
  split_mode: "itemized" | "even" | null;
  even_split_among: string[] | null;
  amount: number | null;
};

export default function ReceiptMatrixPage() {
  const params = useParams<{ id: string; receiptId: string }>();
  const tripId = params.id;
  const receiptId = params.receiptId;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline receipt-name editing (Story 13.6).
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Editable payer — correcting a mis-recorded "Paid by" is what fixes a wrong
  // Settle Up (the ledger credits the payer; the wrong payer reads as "owed the
  // totals"). The trip page recomputes the ledger on the resulting realtime
  // receipt update.
  const [savingPaidBy, setSavingPaidBy] = useState(false);
  const [paidByError, setPaidByError] = useState(false);

  const savePaidBy = useCallback(
    async (nextPaidBy: string) => {
      if (!receipt || nextPaidBy === receipt.paid_by) return;
      setSavingPaidBy(true);
      setPaidByError(false);
      try {
        await patchReceiptPaidBy(receipt.id, nextPaidBy);
        setReceipt((prev) => (prev ? { ...prev, paid_by: nextPaidBy } : prev));
      } catch {
        // Leave the select on its prior value (controlled by receipt.paid_by).
        setPaidByError(true);
      } finally {
        setSavingPaidBy(false);
      }
    },
    [receipt],
  );

  const saveName = useCallback(async () => {
    if (!receipt) return;
    const trimmed = nameDraft.trim();
    setSavingName(true);
    try {
      await patchReceiptName(receipt.id, trimmed);
      setReceipt((prev) => (prev ? { ...prev, name: trimmed } : prev));
      setEditingName(false);
    } catch {
      // Keep edit mode open so the user can retry; the row is unchanged.
    } finally {
      setSavingName(false);
    }
  }, [receipt, nameDraft]);

  const loadData = useCallback(
    async () => {
      setLoadingData(true);
      setError(null);
      try {
        // No owner filter: RLS returns the trip if the user owns it OR is an
        // approved member (Epic 11), so invited members can open a shared
        // receipt — not just the owner. (Mirrors the trip hub page; without
        // this, members hit a false "Receipt not found".)
        const [tripRes, receiptRes] = await Promise.all([
          supabase
            .from("trips")
            .select("id,name,participants")
            .eq("id", tripId)
            .maybeSingle(),
          supabase
            .from("receipts")
            .select(
              "id,name,image_url,processed_data,split_among,tax,tip,paid_by,split_mode,even_split_among,amount",
            )
            .eq("id", receiptId)
            .eq("trip_id", tripId)
            .maybeSingle(),
        ]);

        if (
          tripRes.error ||
          !tripRes.data ||
          receiptRes.error ||
          !receiptRes.data
        ) {
          setError("Receipt not found.");
          setTrip(null);
          setReceipt(null);
        } else {
          setTrip(tripRes.data as Trip);
          setReceipt(receiptRes.data as Receipt);
        }
      } catch {
        setError("Could not load this receipt.");
      } finally {
        setLoadingData(false);
      }
    },
    [tripId, receiptId],
  );

  // Reflect OCR-prefilled name/tax/tip (Story 13.4) in local state so the
  // heading shows the merchant name and the split view (which mounts after OCR)
  // initializes from the prefilled fees.
  const handlePrefill = useCallback((fields: PrefilledFields) => {
    setReceipt((prev) =>
      prev
        ? {
            ...prev,
            name: fields.name ?? prev.name,
            tax: fields.tax,
            tip: fields.tip,
          }
        : prev,
    );
  }, []);

  // Apply remote name/paid_by edits live (Story 20.4) — surfaced from the split
  // view's realtime channel. Never clobber a field the local user is mid-editing
  // or mid-saving; returns prev unchanged when nothing applies so React skips the
  // re-render (and ignores the echo of our own write).
  const [savingMode, setSavingMode] = useState(false);
  // True while OCR is scanning a fresh receipt — the even-split toggle is gated
  // on this so a user can't switch before the total exists (Epic 21 race fix).
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const handleRemoteFields = useCallback(
    (fields: {
      name?: string | null;
      paid_by?: string | null;
      split_mode?: string | null;
      even_split_among?: string[] | null;
      amount?: number | null;
    }) => {
      setReceipt((prev) => {
        if (!prev) return prev;
        let next = prev;
        if (
          typeof fields.name === "string" &&
          fields.name !== next.name &&
          !editingName &&
          !savingName
        ) {
          next = { ...next, name: fields.name };
        }
        if (
          typeof fields.paid_by === "string" &&
          fields.paid_by !== next.paid_by &&
          !savingPaidBy
        ) {
          next = { ...next, paid_by: fields.paid_by };
        }
        // Even-split fields (Story 21.4). The equality checks below ARE the echo
        // suppression (skip when the inbound value equals ours), so a concurrent
        // collaborator edit that arrives during a local save still lands — no
        // blanket savingMode drop, which would lose edge-triggered remote updates.
        if (
          (fields.split_mode === "itemized" || fields.split_mode === "even") &&
          fields.split_mode !== next.split_mode
        ) {
          next = { ...next, split_mode: fields.split_mode };
        }
        if (
          Array.isArray(fields.even_split_among) &&
          (fields.even_split_among.length !==
            (next.even_split_among?.length ?? 0) ||
            !fields.even_split_among.every((p) =>
              (next.even_split_among ?? []).includes(p),
            ))
        ) {
          next = { ...next, even_split_among: fields.even_split_among };
        }
        if (typeof fields.amount === "number" && fields.amount !== next.amount) {
          next = { ...next, amount: fields.amount };
        }
        return next;
      });
    },
    [editingName, savingName, savingPaidBy],
  );

  // --- Even-Split Mode (Epic 21, Story 21.3) ---
  const persistReceipt = useCallback(
    async (fields: Partial<Receipt>) => {
      setSavingMode(true);
      const { error: updateError } = await supabase
        .from("receipts")
        .update(fields)
        .eq("id", receiptId)
        .select("id");
      setSavingMode(false);
      if (!updateError) {
        setReceipt((prev) => (prev ? { ...prev, ...fields } : prev));
      }
    },
    [receiptId],
  );

  const switchMode = useCallback(
    async (mode: "itemized" | "even") => {
      if (!receipt || !trip || receipt.split_mode === mode) return;
      // Switching modes discards the other mode's assignments — confirm first.
      const losing =
        mode === "even"
          ? (receipt.split_among?.length ?? 0) > 0
          : (receipt.even_split_among?.length ?? 0) > 0;
      if (
        losing &&
        !window.confirm(
          mode === "even"
            ? "Switch to even split? This clears the item assignments on this receipt."
            : "Switch to itemized? This clears the even-split selection on this receipt.",
        )
      ) {
        return;
      }

      if (mode === "even") {
        // ReceiptSplitView owns the live item/fee edits and persists them to the
        // DB, so the page's receipt state can be stale — re-read the latest before
        // deriving the even total, or we'd save an outdated `amount`.
        const { data: freshData } = await supabase
          .from("receipts")
          .select("processed_data,tax,tip")
          .eq("id", receiptId)
          .maybeSingle();
        const fresh = freshData as {
          processed_data: LineItem[] | null;
          tax: number | null;
          tip: number | null;
        } | null;
        const pd = fresh?.processed_data;
        const items = Array.isArray(pd) ? pd : [];
        const hasItems = items.length > 0;
        const derived =
          items.reduce((sum, it) => sum + (it.price ?? 0), 0) +
          (fresh?.tax ?? 0) +
          (fresh?.tip ?? 0);
        void persistReceipt({
          split_mode: "even",
          split_among: [],
          even_split_among: receipt.even_split_among?.length
            ? receipt.even_split_among
            : (trip.participants ?? []),
          amount: hasItems ? Number(derived.toFixed(2)) : (receipt.amount ?? 0),
        });
      } else {
        void persistReceipt({ split_mode: "itemized", even_split_among: [] });
      }
    },
    [receipt, trip, receiptId, persistReceipt],
  );

  const toggleEvenParticipant = useCallback(
    (name: string) => {
      if (!receipt) return;
      const cur = receipt.even_split_among ?? [];
      const next = cur.includes(name)
        ? cur.filter((p) => p !== name)
        : [...cur, name];
      void persistReceipt({ even_split_among: next });
    },
    [receipt, persistReceipt],
  );

  const setEvenAmount = useCallback(
    (value: number) => void persistReceipt({ amount: value }),
    [persistReceipt],
  );

  // Even-mode realtime (Story 21.4). In even mode the matrix (and ReceiptSplitView's
  // subscription) is unmounted, so this owns the single per-receipt channel while
  // even mode is active — mutually exclusive with the matrix's channel, so there's
  // never more than one at a time. A ref keeps the effect from re-subscribing when
  // the guard state changes.
  const remoteFieldsRef = useRef(handleRemoteFields);
  useEffect(() => {
    remoteFieldsRef.current = handleRemoteFields;
  }, [handleRemoteFields]);

  const evenModeActive = receipt?.split_mode === "even";
  useEffect(() => {
    if (!evenModeActive || !receiptId) return;
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
            name?: string | null;
            paid_by?: string | null;
            split_mode?: string | null;
            even_split_among?: string[] | null;
            amount?: number | null;
          };
          remoteFieldsRef.current({
            name: row.name,
            paid_by: row.paid_by,
            split_mode: row.split_mode,
            even_split_among: row.even_split_among,
            amount: row.amount,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [evenModeActive, receiptId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void loadData();
  }, [loading, user, router, loadData]);

  if (loading || !user || loadingData) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (error || !trip || !receipt) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-neutral-600">{error ?? "Receipt not found."}</p>
        <Link href={`/trips/${tripId}`} className="font-medium underline">
          Back to trip
        </Link>
      </main>
    );
  }

  const participants = trip.participants ?? [];
  // Always include the current payer as an option, even if they're not in the
  // participant list (a mismatch is exactly what makes the settle wrong), so
  // the user can see the bad value and pick a real participant.
  const payerOptions =
    receipt.paid_by && !participants.includes(receipt.paid_by)
      ? [receipt.paid_by, ...participants]
      : participants;

  // Even-Split Mode render state (Story 21.3).
  const isEven = receipt.split_mode === "even";
  const evenItems = Array.isArray(receipt.processed_data)
    ? receipt.processed_data
    : [];
  const hasItems = evenItems.length > 0;
  const evenTotal = hasItems
    ? evenItems.reduce((sum, it) => sum + (it.price ?? 0), 0) +
      (receipt.tax ?? 0) +
      (receipt.tip ?? 0)
    : (receipt.amount ?? 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-6">
      <Link href={`/trips/${tripId}`} className="text-sm text-neutral-500 underline">
        ← {trip.name}
      </Link>
      {editingName ? (
        <div className="mb-6 mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder="Receipt name"
            aria-label="Receipt name"
            autoFocus
            className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2 text-xl font-semibold dark:border-neutral-700"
          />
          <button
            type="button"
            onClick={() => void saveName()}
            disabled={savingName}
            className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {savingName ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditingName(false)}
            disabled={savingName}
            className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-6 mt-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {receipt.name?.trim() || "Untitled receipt"}
          </h1>
          <button
            type="button"
            onClick={() => {
              setNameDraft(receipt.name ?? "");
              setEditingName(true);
            }}
            aria-label="Rename receipt"
            className="rounded p-1 text-sm text-neutral-400 transition-colors hover:text-foreground"
          >
            ✏️
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="paid-by" className="text-neutral-500">
          Paid by
        </label>
        <select
          id="paid-by"
          value={receipt.paid_by}
          onChange={(event) => void savePaidBy(event.target.value)}
          disabled={savingPaidBy || participants.length === 0}
          className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
        >
          {payerOptions.length === 0 ? (
            <option value="">No participants on this trip</option>
          ) : null}
          {payerOptions.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </select>
        {savingPaidBy ? (
          <span className="text-xs text-neutral-400">Saving…</span>
        ) : null}
        {paidByError ? (
          <span role="alert" className="text-xs text-red-600">
            Couldn&apos;t update who paid. Try again.
          </span>
        ) : null}
      </div>

      {/* Split-mode toggle (Story 21.3): itemized matrix vs. even split. */}
      <div className="mb-6 inline-flex rounded-lg border border-neutral-300 p-0.5 text-sm dark:border-neutral-700">
        <button
          type="button"
          onClick={() => void switchMode("itemized")}
          disabled={savingMode || ocrProcessing}
          aria-pressed={!isEven}
          className={`rounded-md px-3 py-1 disabled:opacity-50 ${
            !isEven ? "bg-foreground text-background" : ""
          }`}
        >
          Itemized
        </button>
        <button
          type="button"
          onClick={() => void switchMode("even")}
          disabled={savingMode || ocrProcessing}
          aria-pressed={isEven}
          title={ocrProcessing ? "Scanning the receipt…" : undefined}
          className={`rounded-md px-3 py-1 disabled:opacity-50 ${
            isEven ? "bg-foreground text-background" : ""
          }`}
        >
          Even split
        </button>
        {ocrProcessing ? (
          <span className="ml-2 self-center text-xs text-neutral-400">
            Scanning…
          </span>
        ) : null}
      </div>

      {/* Single stacked column (Story 17.5): image → matrix/even-split, all breakpoints. */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-center rounded-lg border border-neutral-300 p-4">
          {receipt.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded external receipt image of unknown size; next/image would need remotePatterns config and offers no benefit for a preview
            <img
              src={receipt.image_url}
              alt={receipt.name}
              className="max-h-[70vh] w-auto rounded"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}
        </div>

        {isEven ? (
          <EvenSplitPanel
            participants={participants}
            selected={receipt.even_split_among ?? []}
            onToggle={toggleEvenParticipant}
            total={evenTotal}
            hasItems={hasItems}
            onTotalChange={setEvenAmount}
            saving={savingMode}
          />
        ) : (
          <div className="overflow-x-auto">
            <MatrixStateWrapper
              receiptId={receipt.id}
              imageUrl={receipt.image_url}
              initialProcessedData={receipt.processed_data}
              initialName={receipt.name}
              initialTax={receipt.tax ?? 0}
              initialTip={receipt.tip ?? 0}
              onPrefill={handlePrefill}
              onProcessingChange={setOcrProcessing}
            >
              {(items) => (
                <ReceiptSplitView
                  receiptId={receipt.id}
                  items={items}
                  participants={participants}
                  initialSplitAmong={receipt.split_among}
                  initialTax={receipt.tax ?? 0}
                  initialTip={receipt.tip ?? 0}
                  onRemoteFields={handleRemoteFields}
                />
              )}
            </MatrixStateWrapper>
          </div>
        )}
      </div>
    </main>
  );
}
