"use client";

import { SyncStatusBar, type SaveState } from "@/components/feature/SyncStatusBar";
import type { ProportionalSplitResult } from "@/utils/math/billCalculations";

// Coerce raw input text to a non-negative, finite number. Blank/garbage → 0;
// negatives are clamped to 0 (out-of-pocket fees are never negative).
export function parseFeeInput(raw: string): number {
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

const money = (value: number): string => `$${value.toFixed(2)}`;

type Props = {
  tax: number;
  tip: number;
  onTaxChange: (value: number) => void;
  onTipChange: (value: number) => void;
  saveState: SaveState;
  totals: ProportionalSplitResult;
};

type FeeFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function FeeField({ id, label, value, onChange }: FeeFieldProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      {label}
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="0.00"
        value={value === 0 ? "" : value}
        onChange={(event) => onChange(parseFeeInput(event.target.value))}
        className="w-full rounded border border-neutral-300 bg-transparent p-2 text-right font-mono"
      />
    </label>
  );
}

export function ReceiptSummarySidebar({
  tax,
  tip,
  onTaxChange,
  onTipChange,
  saveState,
  totals,
}: Props) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-neutral-300 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Fees</h2>
        <SyncStatusBar state={saveState} />
      </div>
      <FeeField id="fee-tax" label="Tax ($)" value={tax} onChange={onTaxChange} />
      <FeeField id="fee-tip" label="Tip ($)" value={tip} onChange={onTipChange} />

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <h2 className="text-sm font-semibold">Who owes what</h2>
        {totals.shares.length === 0 ? (
          <p className="text-sm text-neutral-500">No participants yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {totals.shares.map((share) => (
              <li key={share.participant} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between font-medium">
                  <span>{share.participant}</span>
                  <span className="font-mono">{money(share.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>
                    {money(share.subtotal)} + tax {money(share.taxShare)} + tip{" "}
                    {money(share.tipShare)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">{money(totals.grandTotal)}</span>
        </div>
      </div>
    </aside>
  );
}
