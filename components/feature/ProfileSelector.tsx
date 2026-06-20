"use client";

import { useAccentColor } from "@/context/AccentColorContext";
import { ACCENT_COLORS } from "@/utils/profile/accentColors";

// "My Profile Badge" sub-panel: pick an accent color that tints your checkbox
// selections on the splitting matrix. Stored locally (Epic 9, Story 9.2).
export function ProfileSelector() {
  const { accent, setAccent } = useAccentColor();

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-semibold">My Profile Badge</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Your accent color marks the boxes you check.
      </p>
      <div className="mt-3 flex gap-3" role="radiogroup" aria-label="Accent color">
        {ACCENT_COLORS.map((color) => {
          const selected = color.token === accent;
          return (
            <button
              key={color.token}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              title={color.label}
              onClick={() => setAccent(color.token)}
              className={`h-8 w-8 rounded-full ${color.swatch} ring-offset-2 ring-offset-background transition-shadow ${
                selected
                  ? "ring-2 ring-foreground"
                  : "ring-1 ring-neutral-300 hover:ring-neutral-400 dark:ring-neutral-700"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}
