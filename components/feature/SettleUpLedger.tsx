"use client";

import type { SettlementTransfer } from "@/utils/math/debtMinimizer";

const money = (value: number): string => `$${value.toFixed(2)}`;

type Props = {
  transfers: SettlementTransfer[];
  // True when balances couldn't be computed (receipts failed to load, or the
  // ledger didn't reconcile to zero). Distinct from a genuinely-settled trip so
  // a load failure isn't shown as "everyone's settled up".
  error?: boolean;
};

// Expandable "Settle Up" panel: the minimal set of who-pays-whom transfers that
// squares the whole trip. Lives at the base of the trip workspace.
export function SettleUpLedger({ transfers, error = false }: Props) {
  return (
    <details className="mt-8 rounded-lg border border-neutral-300" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-lg font-medium">
        Settle Up
        {!error && transfers.length > 0 ? (
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {transfers.length} transfer{transfers.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </summary>

      <div className="border-t border-neutral-200 px-4 py-3">
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            Couldn&apos;t calculate balances. Try refreshing the page.
          </p>
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
