# ⚡ Collaborative AI Receipt Splitter (Greenfield v3.0)

An intuitive, mobile-responsive web platform designed to completely eliminate the social friction and calculation errors of group expense sharing. Powered by a denormalized PostgreSQL/Supabase engine, this platform utilizes automated OCR ingestion to convert physical receipt snapshots into live, multi-user assignment grids that sync instantly across clients.

---

## 🏗️ Core Architectural Strategy (v3.0 Schema)

To maximize performance, avoid intensive multi-table relational database joins, and support high-throughput real-time websocket broadcasting, this application treats line items and user assignments as **first-class document components nested directly within JSONB structures**. 

There are no standalone relational tables for individual line items or user check assignments. The system state is tracked across four core physical matrices:

### 📊 Entity Database Schema
[allowed_users] <--- Security Whitelist Layer
|
v
[trips] --------> [trip_members] (Junction Token Mapping)
|
v
[receipts] -------> .processed_data (JSONB Ingested Line Items)
.split_among    (JSONB Active Checkbox Matrix)

1.  **`public.allowed_users`**: Closed-beta security whitelist mapping authorized registration emails.
2.  **`public.trips`**: Root trip workspaces storing attendee name arrays directly inside a flat `participants` JSONB column (`["Mathieu", "Winston", "Alice"]`).
3.  **`public.receipts`**: Core ledger record storing scanned items inside `processed_data` and active consumer selections inside `split_among`.
4.  **`public.trip_members`**: Security junction table granting read/write authorization values to temporary anonymous or registered collaborators via Row Level Security (RLS).

---

## ⚡ Real-Time Auto-Save Synchronization Flow

This application completely abandons traditional manual form-submission or "Save Changes" button patterns. Interaction states are entirely fluid and event-driven:

User A (Checks Box) ---> Optimistic UI Update ---> Supabase Database Mutation
|
v
Realtime Channel Broadcast
(receipt-changes:${id})
|
v
User B (UI Updates Instantly) <----------------- Client Hook Reception

* **Silent Guest Onboarding**: Unauthenticated users clicking a valid travel invitation token are silently provisioned a session via `supabase.auth.signInAnonymously()`.
* **Security Isolation (RLS)**: Secure rows are hardened at the PostgreSQL layer. Anonymous and registered members can only access or mutate fields if their active token is explicitly registered inside the corresponding `trip_members` map.
* **Precision Multipliers Math Engine**: Global tax figures and tips are calculated proportionally based on fractional consumption down to exact single-cent thresholds (`$0.01`). Rounding remainders are handled deterministically via a remainder-distribution algorithm to maintain mathematical balance across the ledger.
* **Network Debt-Graph Optimization**: Cross-receipt balances are aggregated and compiled through a greedy cash-flow minimization graph network routine, instantly reducing complex peer-to-peer debts into the absolute minimum number of total transactional instructions.

---

## 📁 Repository Directory Structure

The project follows a clean Next.js 14+ App Router directory footprint optimized for seamless modular component portability:

```text
├── app/                      # Dynamic page segments, layouts, and route definitions
│   ├── canary/               # Static system smoke-test path (Health Check Verification)
│   ├── dashboard/            # Workspace management views and Trip initialization setup
│   ├── invite/[token]/       # Dynamic token-redemption and anonymous authorization endpoints
│   ├── trips/[id]/           # Main Trip details hub and Settle-Up Ledger view
│   │   └── receipts/[id]/    # Core Real-Time Interactive Matrix Splitting panel
│   ├── unauthorized/         # Access rejection clearance warning landing screen
│   ├── globals.css           # Global core Tailwind visual styles
│   └── layout.tsx            # Global app view wrappers and contextual initialization layers
├── components/               # Presentation layout modules separation matrix
│   ├── feature/              # Stateful structural views (Matrix rows, sharing modals)
│   └── ui/                   # Stateless presentational atomic building blocks (Buttons, inputs)
├── context/                  # Shared React global state providers (Auth, Theme, Realtime)
├── docs/                     # Full project lifecycle backlog specification shards
│   ├── epics/                # Actionable user story sheets segmented from Epic 1 to 12
│   └── 04_System_Architecture_Master_v3.md   # Architectural technical source-of-truth
├── types/                    # Prescriptive unified TypeScript global type system metrics
└── utils/                    # Pure deterministic algorithms (Debt optimization, penny calculations)

```
---

## Local Development Setup & Initialization
Follow these steps to spin up the codebase environment locally on your workstation:

1. Project Scaffolding Ingress
Clone the repository to your machine, enter the root directory, and initialize the system packages:

Bash
npm install
2. Configure Local Environment Variables
Create a local tracking environment configurations file named .env.local inside the root path folder and seed your project keys matching the structure documented in .env.example:

Plaintext
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key-string
3. Spin Up Local Run Timers
Launch the Next.js local development server instance:

Bash
npm run dev
Open your browser and navigate to http://localhost:3000. To verify the core build health independently of auth, access the canary indicator path straight at http://localhost:3000/canary.

4. Code Quality & Integration Sweep Checks
Before submitting pull requests or merging branches, execute validation scripts to confirm codebase health and strict type-safety:

Bash
# Run lint optimization audits
npm run lint

# Compile production code build verification
npm run build
📋 Comprehensive Backlog Tracking Index
Development progress across our 12 operational core project epics is sharded and tracked right inside the filesystem for transparency. To check out exact subtask requirements, implementation logs, or acceptance criteria boundaries, reference the respective planning sheets directly:

docs/epics/epic-01-scaffolding/ ── Repo Setup & CI/CD Verification

docs/epics/epic-02-auth-whitelist/ ── Access Gatekeeper Whitelist

docs/epics/epic-03-trip-management/ ── Trip Scopes & Participant Seeding

docs/epics/epic-04-receipt-ocr/ ── Supabase Media Buckets & Asset Storage

docs/epics/epic-05-matrix-rendering/ ── Matrix Presentation Data Layouts

docs/epics/epic-06-assignment-mutations/ ── Nested JSONB Matrix Checkbox Updates

docs/epics/epic-07-precision-math/ ── Proportional Penny Math Calc Engines

docs/epics/epic-08-balancing-ledger/ ── Greedy Network Cash Flow Optimization

docs/epics/epic-09-profiles-preferences/ ── Dark-Theme Persistence & Profile Badges

docs/epics/epic-10-activity-auditing/ ── Audit Timelines & Remote Cell Animations

docs/epics/epic-11-magic-links/ ── Secure UUID Invitation Loop Redemptions

docs/epics/epic-12-realtime-collaboration/ ── Anonymous Sign-Ins & Real-Time Socket Channels

⚖️ License
Internal Development Asset Workspace ─ All Rights Reserved.


---

## 🎯 Next Step Selection

Your project repository root is now completely configured with pristine structural parameters, a comprehensive backlog mapping schema, and a clear `README.md`. It is time to transition into full implementation mode!

1. **Activate Winston (Developer Mode)** to generate the file structures, configuration scripts, and baseline page layouts for **Story 1.1** and **Story 1.2** (Next.js configurations, absolute alias paths, folder skeletons, and the functional `/canary` checking file page).
2. Request a deep-dive review of a specific utility folder (such as detailing the files inside `utils/math/` ahead of time).

Type a number or send your custom command below to begin coding!