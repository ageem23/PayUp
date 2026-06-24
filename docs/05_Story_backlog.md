---

## 📋 3. Complete Story Backlog (Epics 1 - 17)

### docs/05_Epic_1_to_10_Core_Backlog_Archive.md
```markdown
# Historical Archive: Epics 1 through 10 Core Summary

*   **Epic 1: Foundation & Canary Setup**: Project structure established using Next.js 14 (App Router) and Tailwind CSS. Initial workspace setup verified with a operational deployment sanity check router (`/canary`).
*   **Epic 2: Guardrail Gatekeeping Authentication**: Access restricted via the `allowed_users` validation layer matching inbound login email hashes directly against server parameters.
*   **Epic 3: Trip Structuring**: Interface endpoints built enabling creation of Trip parent nodes and local hydration of `participants` arrays inside JSONB structures.
*   **Epic 4: OCR Image Data Pipelines**: Implemented image payload processing into Supabase Storage buckets, executing background processing loops returning organized receipt text structures.
*   **Epic 5: Matrix Grid Engine**: Engineered row line item parsing layouts matching individual line item pricing calculations visually across clean, responsive tables.
*   **Epic 6: Mutable Assignment Controls**: Created responsive checkbox callback endpoints writing sub-allocations directly down into the specialized `split_among` JSONB matrix payload.
*   **Epic 7: Precision Algorithmic Calculations**: Programmed floating-point correction math guarantees proportional tax and tip calculations are distributed accurate to individual single cent points ($0.01).
*   **Epic 8: Settle-Up Balancing Ledger**: Built linear programming ledger code optimizing network edges to output the absolute minimum total of cash transactions needed to square accounts between all attendees.
*   **Epic 9: Profiles & Preferences**: Designed baseline configuration states saving dark mode overrides, local user preferences, and preferred text structures across localized memory buckets.
*   **Epic 10: Activity Logging Audit Layer**: Tracked timestamped data edits allowing concurrent transaction history viewing across all collaborative trip logs.
*   **Epic 11: Magic Link Invitations**: Owner-generated invite tokens redeemed into `trip_members`, granting whitelisted collaborators full receipt-editing rights under hardened RLS.
*   **Epic 12: Real-Time Collaboration**: Live cross-client sync of receipt edits via Supabase Realtime (`replica identity full` + publication), scoped to authenticated members.
*   **Epic 13: Streamline the Receipt Experience**: Mobile camera capture, a trip-level receipt list, delete, OCR auto-population of name/tax/tip with a smart 20% default tip, full line/name editing, and a mobile layout that leads with the assignment matrix. *(backlog)*
*   **Epic 14: Open Access & the Metered Free Tier**: Convert the whitelist from an auth gate into a usage tier — open signup, server-enforced 3-receipts/rolling-7-day free-tier quota (the sole free-tier limit; trips unrestricted), quota visibility with a limit-reached block, and a request-unlimited-access path. *(backlog)*
*   **Epic 15: Your Account — Profiles & Self-Service Management**: DB-backed profiles (display name, avatar, cross-device theme/accent preferences) and self-service account controls (account menu + logout, change email/password, forgot/reset password). Account deletion and admin tooling deferred. *(backlog)*
*   **Epic 16: Dependency Security Remediation**: Clear 17 Dependabot alerts — patch transitive deps (glob/postcss/js-yaml), upgrade Next.js 14→15.5.16 and React 18→19 with breaking-change fixes, full regression verification, and stay-current guardrails (Dependabot version updates + CI audit gate). *(backlog)*
*   **Epic 17: Pre-UAT Polish — Trips, Participants & Layout**: Show who created each trip (co-member profile read), mark-completed via `is_settled` + dashboard toggle, space-separated bulk participant entry, in-trip participant add/remove (blocked when referenced), a consistent single-column receipt layout (image → matrix → fees) across breakpoints, and OCR quantity auto-split (expand multi-quantity lines, total-preserving). *(backlog)*
```

### Epic 13 detail
See [docs/prd/epic-13/epic_13_overview.md](docs/prd/epic-13/epic_13_overview.md) for the full Epic 13 story registry and acceptance criteria (Stories 13.1–13.7).

### Epic 14 detail
See [docs/prd/epic-14/epic_14_overview.md](docs/prd/epic-14/epic_14_overview.md) for the full Epic 14 story registry and acceptance criteria (Stories 14.1–14.5).

### Epic 15 detail
See [docs/prd/epic-15/epic_15_overview.md](docs/prd/epic-15/epic_15_overview.md) for the full Epic 15 story registry and acceptance criteria (Stories 15.1–15.6).

### Epic 16 detail
See [docs/prd/epic-16/epic_16_overview.md](docs/prd/epic-16/epic_16_overview.md) for the full Epic 16 story registry and acceptance criteria (Stories 16.1–16.4).

### Epic 17 detail

See [docs/prd/epic-17/epic_17_overview.md](docs/prd/epic-17/epic_17_overview.md) for the full Epic 17 story registry and acceptance criteria (Stories 17.1–17.6).

### Epic 18 detail

See [docs/prd/epic-18/epic_18_overview.md](docs/prd/epic-18/epic_18_overview.md) for the full Epic 18 story registry and acceptance criteria (Stories 18.1–18.4) — Tailwind CSS v4 migration (supersedes Dependabot #27).

### Epic 19 detail

See [docs/prd/epic-19/epic_19_overview.md](docs/prd/epic-19/epic_19_overview.md) for the full Epic 19 story registry and acceptance criteria (Stories 19.1–19.4) — Next.js 16 upgrade + ESLint flat config (supersedes Dependabot #28/#29/#30).

