"use client";

import { splitCentsEvenly } from "@/utils/math/evenSplit";

type Props = {
  participants: string[];
  /** Names currently sharing the receipt (even_split_among). */
  selected: string[];
  onToggle: (name: string) => void;
  /** The receipt total to divide (dollars). */
  total: number;
  /** When the receipt has line items the total is derived (read-only); when it
   *  has none, the user enters it. */
  hasItems: boolean;
  onTotalChange: (value: number) => void;
  saving?: boolean;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function EvenSplitPanel({
  participants,
  selected,
  onToggle,
  total,
  hasItems,
  onTotalChange,
  saving,
}: Props) {
  const totalCents = Math.round((total || 0) * 100);
  const n = selected.length;
  const shares = splitCentsEvenly(totalCents, n);
  const min = n > 0 ? Math.min(...shares) : 0;
  const max = n > 0 ? Math.max(...shares) : 0;
  const perPerson =
    n === 0
      ? "Select who's sharing this"
      : min === max
        ? `${money(max)} each`
        : `${money(min)}–${money(max)} each`;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Total to split</span>
        {hasItems ? (
          <p className="text-2xl font-semibold tabular-nums">{money(totalCents)}</p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            $
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={total ? String(total) : ""}
              onChange={(event) =>
                onTotalChange(Number.parseFloat(event.target.value) || 0)
              }
              disabled={saving}
              placeholder="0.00"
              aria-label="Total to split"
              className="w-32 rounded border border-neutral-300 bg-transparent px-3 py-2 text-xl font-semibold tabular-nums dark:border-neutral-700"
            />
          </label>
        )}
        {!hasItems ? (
          <span className="text-xs text-neutral-400">
            This receipt has no scanned items — enter the amount to split.
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Split between</span>
        {participants.length === 0 ? (
          <p className="text-sm text-neutral-400">No participants on this trip.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => {
              const on = selected.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggle(name)}
                  disabled={saving}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-sm disabled:opacity-50 ${
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-sm">
        <span className="font-semibold">{perPerson}</span>
        {n > 0 ? (
          <span className="text-neutral-500">
            {" "}
            · {n} {n === 1 ? "person" : "people"}
          </span>
        ) : null}
      </p>
    </section>
  );
}
