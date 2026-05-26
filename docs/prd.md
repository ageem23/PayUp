# Product Requirements Document (PRD)

## 1. Goals and Background Context

### 1.1 Goals
*   **Dynamic Data Ingestion Layer**: Provide instant, zero-friction bill entry using an asymmetric AI-powered OCR parsing workflow.
*   **Computational Ledger Discrepancy Prevention**: Eliminate math errors and interpersonal splitting friction by calculating subtotals, proportional tax scales, and tips down to exact single-cent ($0.01) boundaries.
*   **Frictionless Real-Time Syncing**: Refactor the platform state synchronization layer to support live, cross-client socket updates, removing manual page saving completely.
*   **Secure Group Collaboration Environments**: Allow temporary anonymous collaborators and registered stakeholders to edit receipt balances simultaneously under hardened Row Level Security guarantees.

### 1.2 Background Context
Traditional expense splitting tools introduce significant entry barrier overloads by forcing organizers to manually type out line-item descriptions, localized tax values, tips, and individual share boundaries. This process introduces user fatigue and arithmetic errors. 

By utilizing an event-driven denormalized database model in Supabase, this system directly converts a receipt photo stream into an active, multi-user checkbox matrix view. Changes sync instantly across clients, turning bill reconciliation into a collaborative, hands-off group experience.

### 1.3 Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-26 | 1.0.0 | Initial Greenfield Monolithic Document Specification | John (PM) |