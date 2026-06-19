"use client";

import { useRef, useState } from "react";
import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import { MatrixRowItem } from "@/components/feature/MatrixRowItem";
import { SyncStatusBar, type SaveState } from "@/components/feature/SyncStatusBar";
import {
  patchReceiptSplits,
  type ReceiptSplitAllocation,
} from "@/utils/db/matrixPatch";

export type SplitAllocation = ReceiptSplitAllocation;

// Pure: returns a new split_among array with only the matching item_id node
// changed; every other line is preserved (split_among is one JSONB column).
function applyToggle(
  splits: SplitAllocation[],
  itemId: string,
  participant: string,
  checked: boolean,
): SplitAllocation[] {
  const existing = splits.find((split) => split.item_id === itemId);
  if (!existing) {
    return checked
      ? [...splits, { item_id: itemId, assigned_participants: [participant] }]
      : splits;
  }
  const assigned = checked
    ? Array.from(new Set([...existing.assigned_participants, participant]))
    : existing.assigned_participants.filter((p) => p !== participant);
  return splits.map((split) =>
    split.item_id === itemId
      ? { ...split, assigned_participants: assigned }
      : split,
  );
}

type Props = {
  receiptId: string;
  items: LineItem[];
  participants: string[];
  initialSplitAmong: SplitAllocation[] | null;
};

export function ReceiptMatrix({
  receiptId,
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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // Serialize autosave writes so a slower earlier save can't land after (and
  // overwrite) a newer one.
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  // Monotonic counter so only the latest queued save may update saveState.
  const saveSeq = useRef(0);

  const isAssigned = (itemId: string, participant: string): boolean =>
    splits.some(
      (split) =>
        split.item_id === itemId &&
        split.assigned_participants.includes(participant),
    );

  const toggle = (itemId: string, participant: string, checked: boolean) => {
    const next = applyToggle(splits, itemId, participant, checked);
    const seq = ++saveSeq.current;
    setSplits(next);
    setSaveState("saving");
    // Auto-save the FULL updated split_among array (preserves every line),
    // queued after any in-flight save so writes apply in order. Only the
    // newest save (seq) may set the visible status — stale completions are
    // ignored so they can't flash an outdated state.
    saveChain.current = saveChain.current
      .catch(() => undefined)
      .then(() => patchReceiptSplits(receiptId, next))
      .then(() => {
        if (saveSeq.current === seq) setSaveState("saved");
      })
      .catch(() => {
        if (saveSeq.current === seq) setSaveState("error");
      });
  };

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
                toggle(item.id, participant, checked)
              }
              onHoverParticipant={setHoveredParticipant}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
