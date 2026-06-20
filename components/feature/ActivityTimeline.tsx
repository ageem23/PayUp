"use client";

import type { AuditLogEntry } from "@/types/audit";

// h:mm AM/PM, locale-formatted. Falls back gracefully on a bad timestamp.
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Props = {
  entries: AuditLogEntry[];
};

// Expandable "View Activity History" drawer below the splitting grid. Entries
// arrive newest-first (the parent prepends), so the latest update is on top.
export function ActivityTimeline({ entries }: Props) {
  return (
    <details className="mt-6 rounded-lg border border-neutral-300 dark:border-neutral-700">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        View Activity History
        {entries.length > 0 ? (
          <span className="ml-2 font-normal text-neutral-500">
            ({entries.length})
          </span>
        ) : null}
      </summary>

      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-2">
                <span className="shrink-0 font-mono text-xs text-neutral-500">
                  [{formatTime(entry.timestamp)}]
                </span>
                <span>
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  {entry.actionDescription}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
