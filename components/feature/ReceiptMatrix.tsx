"use client";

import { useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import { MatrixRowItem } from "@/components/feature/MatrixRowItem";
import { SyncStatusBar, type SaveState } from "@/components/feature/SyncStatusBar";
import { type ReceiptSplitAllocation } from "@/utils/db/matrixPatch";

export type SplitAllocation = ReceiptSplitAllocation;

type Props = {
  items: LineItem[];
  participants: string[];
  splits: SplitAllocation[];
  onToggle: (itemId: string, participant: string, checked: boolean) => void;
  saveState: SaveState;
};

// Presentational matrix: split state and persistence are owned by the parent
// (ReceiptSplitView) so the proportional-math summary can read the same splits.
export function ReceiptMatrix({
  items,
  participants,
  splits,
  onToggle,
  saveState,
}: Props) {
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(
    null,
  );

  const isAssigned = (itemId: string, participant: string): boolean =>
    splits.some(
      (split) =>
        split.item_id === itemId &&
        split.assigned_participants.includes(participant),
    );

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No items yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 justify-end">
        <SyncStatusBar state={saveState} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="px-3 py-2 text-left font-semibold">Item</th>
            <th className="px-3 py-2 text-right font-semibold">Cost</th>
            {participants.map((person) => (
              <th
                key={person}
                className={`px-3 py-2 text-center font-semibold ${
                  hoveredParticipant === person ? "bg-neutral-100" : ""
                }`}
              >
                {person}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <MatrixRowItem
              key={item.id}
              item={item}
              participants={participants}
              isAssigned={(participant) => isAssigned(item.id, participant)}
              onToggle={(participant, checked) =>
                onToggle(item.id, participant, checked)
              }
              onHoverParticipant={setHoveredParticipant}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
