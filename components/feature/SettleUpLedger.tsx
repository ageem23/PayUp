"use client";

import type { SettlementTransfer } from "@/utils/math/debtMinimizer";

const money = (value: number): string => `$${value.toFixed(2)}`;

type Props = {
  transfers: SettlementTransfer[];
  loading?: boolean;
};

// Expandable "Settle Up" panel: the minimal set of who-pays-whom transfers that
// squares the whole trip. Lives at the base of the trip workspace.
export function SettleUpLedger({ transfers, loading = false }: Props) {
  return (
    <details className="mt-8 rounded-lg border border-neutral-300" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-lg font-medium">
        Settle Up
        {!loading && transfers.length > 0 ? (
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {transfers.length} transfer{transfers.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </summary>

      <div className="border-t border-neutral-200 px-4 py-3">
        {loading ? (
          <p className="text-sm text-neutral-500">Calculating balances…</p>
        ) : transfers.length === 0 ? (
          <p className="text-sm text-neutral-600">Everyone&apos;s settled up 🎉</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transfers.map((t, i) => (
              <li
                key={`${t.from}->${t.to}-${i}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span>
                  <span className="font-medium">{t.from}</span> pays{" "}
                  <span className="font-medium">{t.to}</span>
                </span>
                <span className="font-mono">{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
