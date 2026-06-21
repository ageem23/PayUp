"use client";

import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import { SyncStatusBar, type SaveState } from "@/components/feature/SyncStatusBar";

type Props = {
  items: LineItem[];
  saveState: SaveState;
  onChangeName: (itemId: string, name: string) => void;
  onChangePrice: (itemId: string, price: number) => void;
  onAdd: () => void;
  onDelete: (itemId: string) => void;
};

// Parse a price input into a non-negative finite number (blank → 0).
function parsePrice(raw: string): number {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Inline editor for a receipt's line items (Story 13.6): rename / re-price
 * existing lines, add new lines, and delete lines. State + persistence live in
 * the parent (ReceiptSplitView), so the matrix and totals stay in sync.
 */
export function ReceiptItemsEditor({
  items,
  saveState,
  onChangeName,
  onChangePrice,
  onAdd,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Edit items</h3>
        <SyncStatusBar state={saveState} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No items. Add one to start splitting.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(event) => onChangeName(item.id, event.target.value)}
                placeholder="Item name"
                aria-label="Item name"
                className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={Number.isFinite(item.price) ? item.price : 0}
                onChange={(event) =>
                  onChangePrice(item.id, parsePrice(event.target.value))
                }
                aria-label="Item price"
                className="w-24 rounded border border-neutral-300 bg-transparent px-2 py-1 text-right text-sm tabular-nums dark:border-neutral-700"
              />
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label={`Delete ${item.name || "item"}`}
                className="flex-shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="self-start rounded border border-neutral-300 px-3 py-1 text-sm font-medium dark:border-neutral-700"
      >
        + Add item
      </button>
    </div>
  );
}
