"use client";

import { SyncStatusBar, type SaveState } from "@/components/feature/SyncStatusBar";

// Coerce raw input text to a non-negative, finite number. Blank/garbage → 0;
// negatives are clamped to 0 (out-of-pocket fees are never negative).
export function parseFeeInput(raw: string): number {
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

type Props = {
  tax: number;
  tip: number;
  onTaxChange: (value: number) => void;
  onTipChange: (value: number) => void;
  saveState: SaveState;
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
}: Props) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-neutral-300 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Fees</h2>
        <SyncStatusBar state={saveState} />
      </div>
      <FeeField id="fee-tax" label="Tax ($)" value={tax} onChange={onTaxChange} />
      <FeeField id="fee-tip" label="Tip ($)" value={tip} onChange={onTipChange} />
    </aside>
  );
}
