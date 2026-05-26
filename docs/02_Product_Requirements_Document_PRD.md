# Product Requirements Document (PRD): Core Specification

## 1. Goals and Background Context
* **Goal 1**: Deliver an frictionless data ingestion layer via OCR.
* **Goal 2**: Eliminate calculation discrepancies down to $0.01 accuracy boundaries.
* **Goal 3**: Transition to an open, live collaboration environment allowing multiple users to split data simultaneously.

## 2. Requirements Matrix

### Functional Requirements
* **FR1**: The system must allow users to upload images of receipts (`.jpg`, `.jpeg`, `.png`) to Supabase Storage.
* **FR2**: The system must extract the receipt name, itemized lines, prices, total sum, and tax amounts via an AI processing routine.
* **FR3**: Users must be able to create "Trips" containing a dynamic list of participants defined via a `jsonb` array.
* **FR4**: The matrix screen must support dynamic interactive assignments where selecting a participant updates their proportional share instantly.
* **FR5**: The matrix screen must calculate individual tax and tip portions proportionally using the formula:
  $$\text{Individual Multiplier} = \frac{\text{Individual Subtotal}}{\text{Total Bill Subtotal}}$$
* **FR6**: The settle-up view must generate a balanced minimised debt-graph ledger showing exactly who owes whom how much.

### Non-Functional Requirements
* **NFR1**: Database structures must utilize denormalized JSONB columns within PostgreSQL to achieve flexible schema-less data attributes where performance allows.
* **NFR2**: System state mutations must occur under Row Level Security (RLS) enforcement on Supabase to ensure tenant isolation.
* **NFR3**: Client-side execution models must operate responsively across both iOS/Android viewports and standard web windows.

## 3. Interaction Paradigms & Core Screens
* **Screen 1: Dashboard View**: Displays list of active trips, settled indicators, and an action button to initialize a new trip.
* **Screen 2: Trip Detail View**: Houses participant lists, historical receipts attached to the trip, and link-sharing controls.
* **Screen 3: Receipt Splitting View**: The main application screen displaying item lines, prices, assignments checkboxes, and live computational totals.