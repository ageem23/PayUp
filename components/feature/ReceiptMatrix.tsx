"use client";

import { useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import { MatrixRowItem } from "@/components/feature/MatrixRowItem";

export type SplitAllocation = {
  item_id: string;
  assigned_participants: string[];
};

type Props = {
  items: LineItem[];
  participants: string[];
  initialSplitAmong: SplitAllocation[] | null;
};

export function ReceiptMatrix({
  items,
  participants,
  initialSplitAmong,
}: Props) {
  const [splits, setSplits] = useState<SplitAllocation[]>(
    Array.isArray(initialSplitAmong) ? initialSplitAmong : [],
  );
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(
    null,
  );

  const isAssigned = (itemId: string, participant: string): boolean =>
    splits.some(
      (split) =>
        split.item_id === itemId &&
        split.assigned_participants.includes(participant),
    );

  // Edit only the matching item_id node; preserve every other line's allocation.
  const toggle = (itemId: string, participant: string, checked: boolean) => {
    setSplits((prev) => {
      const existing = prev.find((split) => split.item_id === itemId);
      if (!existing) {
        return checked
          ? [...prev, { item_id: itemId, assigned_participants: [participant] }]
          : prev;
      }
      const assigned = checked
        ? Array.from(new Set([...existing.assigned_participants, participant]))
        : existing.assigned_participants.filter((p) => p !== participant);
      return prev.map((split) =>
        split.item_id === itemId
          ? { ...split, assigned_participants: assigned }
          : split,
      );
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No items yet.</p>;
  }

  return (
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
              toggle(item.id, participant, checked)
            }
            onHoverParticipant={setHoveredParticipant}
          />
        ))}
      </tbody>
    </table>
  );
}
