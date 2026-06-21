"use client";

import type { ReactNode } from "react";
import type { ReceiptQuota } from "@/utils/db/receiptQuota";

type Props = {
  quota: ReceiptQuota | null;
  /** Opens the 14.5 "request unlimited access" flow. */
  onRequestAccess: () => void;
  /** The receipt add UI (upload zone). Hidden when the cap is reached. */
  children: ReactNode;
};

function formatReset(nextAvailableAt: string | null): string | null {
  if (!nextAvailableAt) return null;
  const date = new Date(nextAvailableAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Gates the receipt add UI by the free-tier quota (Story 14.4). The server
 * trigger (14.2) is the real enforcement; this is convenience:
 *  - unknown (loading) or unlimited → just render the add UI, no cap chrome;
 *  - free-tier with allowance left → counter + add UI;
 *  - free-tier at the cap → limit-reached block instead of the upload zone
 *    (pre-check, so a doomed image isn't uploaded — AC6), with the upgrade CTA.
 */
export function ReceiptQuotaGate({ quota, onRequestAccess, children }: Props) {
  if (!quota || quota.isUnlimited) {
    return <>{children}</>;
  }

  if (quota.remaining <= 0) {
    const reset = formatReset(quota.nextAvailableAt);
    return (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
      >
        <p className="font-medium">
          You&apos;ve reached the free-tier limit of {quota.limit} receipts this
          week.
        </p>
        <p className="text-neutral-600 dark:text-neutral-300">
          {reset
            ? `You can add another receipt on ${reset}.`
            : "Your oldest receipt this week will free up a slot soon."}
        </p>
        <button
          type="button"
          onClick={onRequestAccess}
          className="self-start rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          Get unlimited access
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-500">
        {quota.remaining} of {quota.limit} receipts left this week
      </p>
      {children}
    </div>
  );
}
