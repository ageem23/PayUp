// Participant-name parsing helpers (Epic 17). Trip `participants` is a JSONB
// array of name strings (labels used for paid_by / item splitting), not auth
// users — these helpers only shape how those strings are entered/managed.
// Pure + unit-tested; reused by trip creation (17.3) and in-trip editing (17.4).

/** Split free text into trimmed, non-empty tokens on whitespace. */
export function parseParticipantInput(input: string): string[] {
  return input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Appends `incoming` names to `existing`, de-duplicating case-insensitively
 * (existing casing wins, first occurrence kept). Returns a new array.
 */
export function addParticipants(
  existing: string[],
  incoming: string[],
): string[] {
  const seen = new Set(existing.map((name) => name.toLowerCase()));
  const result = [...existing];
  for (const name of incoming) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }
  return result;
}

type RefReceipt = {
  name: string | null;
  paid_by: string;
  split_among: { assigned_participants: string[] }[] | null;
};

/**
 * Returns the display names of receipts that reference `participant` — as the
 * payer (`paid_by`) or within any `split_among` allocation (Story 17.4). A
 * non-empty result means removal must be blocked until those are reassigned.
 */
export function receiptsReferencingParticipant(
  participant: string,
  receipts: RefReceipt[],
): string[] {
  // Match case-insensitively: a receipt referencing "alice" must still block
  // removing the "Alice" chip (names are deduped case-insensitively on entry).
  const needle = participant.toLowerCase();
  const refs: string[] = [];
  for (const receipt of receipts) {
    const inPaidBy = receipt.paid_by.toLowerCase() === needle;
    const inSplit =
      Array.isArray(receipt.split_among) &&
      receipt.split_among.some((alloc) =>
        alloc.assigned_participants?.some(
          (assigned) => assigned.toLowerCase() === needle,
        ),
      );
    if (inPaidBy || inSplit) {
      refs.push(receipt.name?.trim() || "Untitled receipt");
    }
  }
  return refs;
}
