"use client";

import { useState } from "react";
import Link from "next/link";
import type { BillItem } from "@/utils/math/billCalculations";
import { deleteReceipt } from "@/utils/db/deleteReceipt";

export type ReceiptListItem = {
  id: string;
  name: string | null;
  image_url: string | null;
  created_at: string | null;
  paid_by: string;
  processed_data: BillItem[] | null;
  tax: number | null;
  tip: number | null;
};

type Props = {
  tripId: string;
  receipts: ReceiptListItem[];
  /** Called after a receipt is successfully deleted, so the parent can refresh. */
  onDeleted?: () => void;
};

const money = (value: number): string => `$${value.toFixed(2)}`;

/** Grand total = line-item subtotal + tax + tip (mirrors the split engine). */
function receiptTotal(receipt: ReceiptListItem): number {
  const subtotal = (
    Array.isArray(receipt.processed_data) ? receipt.processed_data : []
  ).reduce((sum, item) => sum + (item?.price ?? 0), 0);
  return subtotal + (receipt.tax ?? 0) + (receipt.tip ?? 0);
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReceiptList({ tripId, receipts, onDeleted }: Props) {
  // Id awaiting a confirm click, the id currently deleting, and any id whose
  // delete failed — all keyed by receipt id so only the affected row reacts.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleDelete = async (receipt: ReceiptListItem) => {
    setBusyId(receipt.id);
    setErrorId(null);
    try {
      await deleteReceipt(receipt.id, receipt.image_url);
      setConfirmId(null);
      onDeleted?.();
    } catch {
      setErrorId(receipt.id);
    } finally {
      setBusyId(null);
    }
  };

  if (receipts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        No receipts yet. Add one above to get started.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {receipts.map((receipt) => (
        <li key={receipt.id} className="flex items-center gap-2">
          <Link
            href={`/trips/${tripId}/receipts/${receipt.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            {receipt.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receipt.image_url}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-neutral-100 text-lg dark:bg-neutral-800"
              >
                🧾
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {receipt.name?.trim() || "Untitled receipt"}
              </span>
              <span className="block text-xs text-neutral-500">
                {[
                  receipt.paid_by ? `Paid by ${receipt.paid_by}` : null,
                  formatDate(receipt.created_at),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="flex-shrink-0 font-medium tabular-nums">
              {money(receiptTotal(receipt))}
            </span>
          </Link>

          {confirmId === receipt.id ? (
            <span className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void handleDelete(receipt)}
                disabled={busyId === receipt.id}
                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
              >
                {busyId === receipt.id ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmId(null);
                  setErrorId(null);
                }}
                disabled={busyId === receipt.id}
                className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmId(receipt.id)}
              aria-label={`Delete ${receipt.name?.trim() || "receipt"}`}
              className="flex-shrink-0 rounded p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              🗑️
            </button>
          )}

          {errorId === receipt.id ? (
            <span role="alert" className="flex-shrink-0 text-xs text-red-600">
              Delete failed
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
