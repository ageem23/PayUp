# Deferred Work

## Deferred from: code review of epic-7 (7-1-fee-inputs) (2026-06-19)

- **Login page (`/`) doesn't redirect already-authenticated users** [app/page.tsx] — a user with a live session who visits `/` still sees the login form instead of being sent to `/dashboard`. Pre-existing behavior (the login form never auto-redirected); not introduced by Epic 7, so out of scope for this PR. Worth a small redirect-when-authenticated guard in a future cleanup.
