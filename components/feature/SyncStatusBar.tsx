"use client";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  state: SaveState;
};

export function SyncStatusBar({ state }: Props) {
  if (state === "idle") return null;

  const label =
    state === "saving"
      ? "Saving updates…"
      : state === "saved"
        ? "All changes saved"
        : "Couldn't save changes";
  const tone = state === "error" ? "text-red-600" : "text-neutral-500";

  return (
    <span className={`text-xs ${tone}`} role="status" aria-live="polite">
      {label}
    </span>
  );
}
