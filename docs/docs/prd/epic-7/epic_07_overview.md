# Epic 7: Precision Algorithmic Multipliers (Tax & Tip Metrics)

## Overview
The goal of Epic 7 is to implement the precision calculation engine of our application. Splitting bills equally introduces unfair distributions if one person orders an entrée and another only orders a side. 

This engine implements a proportional scaling calculation model. Global variables—such as total out-of-pocket tax and tip amounts—will be distributed proportionally down to exact single-cent thresholds ($0.01) using fractional multiplier algorithms:

$$\text{Individual Multiplier} = \frac{\text{Individual Subtotal}}{\text{Total Bill Subtotal}}$$

Any rounding discrepancies or remainder pennies resulting from division constraints will be deterministically allocated to prevent the ledger from leaking fractional currency.

Additionally, this epic retrofits our secure authentication boundary by introducing a single-click Google OAuth SSO gateway. This ensures that only verified, whitelisted users can access the precision splitting sheets and computational workspaces.

## Target Architecture Blueprint
* **Primary Computational Target:** `public.receipts` (using data from `processed_data` and `split_among`)
* **Identity Verification Hook:** Google OAuth 2.0 / Supabase GoTrue
* **Mathematical Precision Boundary:** Exact two-decimal currency points ($0.01)
* **Calculation Workflow Hook:** Reactive frontend loops calculating updates instantly whenever checkboxes or fee inputs alter.

## Epic Backlog Registry
* **Story 7.1:** Global Operational Expense Overrides & Fee Input Components
* **Story 7.2:** Single-Cent Proportional Multiplier Math & Remainder Distribution Engine
* **Story 7.3:** Google OAuth Single Sign-On & Whitelist Intersection Gateway