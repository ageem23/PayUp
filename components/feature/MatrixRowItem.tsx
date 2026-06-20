"use client";

import type { LineItem } from "@/components/feature/MatrixStateWrapper";

// Guards malformed jsonb prices from crashing toFixed (mirrors the matrix page).
export function formatPrice(price: unknown): string {
  return typeof price === "number" && Number.isFinite(price)
    ? `$${price.toFixed(2)}`
    : "—";
}

type Props = {
  item: LineItem;
  participants: string[];
  isAssigned: (participant: string) => boolean;
  onToggle: (participant: string, checked: boolean) => void;
  onHoverParticipant: (participant: string | null) => void;
};

export function MatrixRowItem({
  item,
  participants,
  isAssigned,
  onToggle,
  onHoverParticipant,
}: Props) {
  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
      <td className="px-3 py-2">{item.name}</td>
      <td className="px-3 py-2 text-right">{formatPrice(item.price)}</td>
      {participants.map((participant) => (
        <td
          key={participant}
          className="px-3 py-2 text-center"
          onMouseEnter={() => onHoverParticipant(participant)}
          onMouseLeave={() => onHoverParticipant(null)}
        >
          <input
            type="checkbox"
            checked={isAssigned(participant)}
            onChange={(event) => onToggle(participant, event.target.checked)}
            aria-label={`Assign ${participant} to ${item.name}`}
            className="h-5 w-5 cursor-pointer accent-foreground"
          />
        </td>
      ))}
    </tr>
  );
}
