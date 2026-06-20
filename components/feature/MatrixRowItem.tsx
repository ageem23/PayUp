"use client";

import type { LineItem } from "@/components/feature/MatrixStateWrapper";
import { useAccentColor } from "@/context/AccentColorContext";

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
  /** A changing version number while the cell is flashing, else undefined. */
  flashVersion: (participant: string) => number | undefined;
  onToggle: (participant: string, checked: boolean) => void;
  onHoverParticipant: (participant: string | null) => void;
};

export function MatrixRowItem({
  item,
  participants,
  isAssigned,
  flashVersion,
  onToggle,
  onHoverParticipant,
}: Props) {
  // The local user's chosen accent tints the checks they toggle (Story 9.2).
  const { accentClassName } = useAccentColor();
  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
      <td className="px-3 py-2">{item.name}</td>
      <td className="px-3 py-2 text-right">{formatPrice(item.price)}</td>
      {participants.map((participant) => {
        const version = flashVersion(participant);
        return (
          <td
            key={participant}
            className="relative px-3 py-2 text-center"
            onMouseEnter={() => onHoverParticipant(participant)}
            onMouseLeave={() => onHoverParticipant(null)}
          >
            {/* Flash overlay: keyed by version so a re-toggle remounts it and
                restarts the animation; pointer-events-none + behind the input
                so cursor/focus are untouched (Story 10.2 AC4). */}
            {version !== undefined ? (
              <span
                key={version}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 animate-flash-cell"
              />
            ) : null}
            <input
              type="checkbox"
              checked={isAssigned(participant)}
              onChange={(event) => onToggle(participant, event.target.checked)}
              aria-label={`Assign ${participant} to ${item.name}`}
              className={`relative h-5 w-5 cursor-pointer ${accentClassName}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
