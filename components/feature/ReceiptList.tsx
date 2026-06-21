"use client";

import Link from "next/link";
import type { BillItem } from "@/utils/math/billCalculations";

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

export function ReceiptList({ tripId, receipts }: Props) {
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
        <li key={receipt.id}>
          <Link
            href={`/trips/${tripId}/receipts/${receipt.id}`}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
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
        </li>
      ))}
    </ul>
  );
}
