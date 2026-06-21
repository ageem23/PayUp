---

## 📋 3. Complete Story Backlog (Epics 1 - 13)

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
```

### Epic 13 detail
See [docs/prd/epic-13/epic_13_overview.md](docs/prd/epic-13/epic_13_overview.md) for the full Epic 13 story registry and acceptance criteria (Stories 13.1–13.7).