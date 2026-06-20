// Activity audit log (Epic 10, Story 10.1). In-memory only — the log lives in
// the splitting view's React state for the session; it is not persisted.

export interface AuditLogEntry {
  id: string;
  /** ISO timestamp of when the action occurred. */
  timestamp: string;
  /** Who performed the action (the local user). */
  actorName: string;
  /** Human-readable description, e.g. "assigned 'Cold Brew' to Mathieu". */
  actionDescription: string;
}
