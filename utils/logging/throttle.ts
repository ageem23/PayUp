// Dedupe/throttle for automatic error logging (Epic 23, Story 23.4). A crashing
// page can fire the same error many times a second; without this we'd flood
// error_logs. `shouldLog(key, now)` returns false for a repeat of the same key
// within the window. `now` is injected so the logic is deterministically
// testable.
export function createErrorThrottle(windowMs = 10_000) {
  const recent = new Map<string, number>();

  return function shouldLog(key: string, now: number): boolean {
    const last = recent.get(key);
    if (last !== undefined && now - last < windowMs) return false;

    recent.set(key, now);
    // Prune stale keys so the map can't grow unbounded over a long session.
    for (const [k, t] of recent) {
      if (now - t > windowMs) recent.delete(k);
    }
    return true;
  };
}

// Shared instance used by the runtime error listeners.
export const shouldLogError = createErrorThrottle();
