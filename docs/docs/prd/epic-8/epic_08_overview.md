# Epic 8: Settle-Up Balancing Ledger Optimization Engine

## Overview
The goal of Epic 8 is to construct the network debt-simplification engine. In a multi-day group trip with multiple receipts, a naive calculation would result in a messy matrix of everyone constantly owing everyone else small amounts of money. 

This epic implements a transactional minimization graph engine. It loops through all receipts attached to a specific `trip_id`, aggregates every participant's net total paid versus total consumed across the entire trip, and computes a simplified network edge-graph of transactions. It answers the question: *What is the absolute minimum number of peer-to-peer transfers required to square all accounts completely?*

## Target Architecture Blueprint
* **Primary Computational Context:** All records matching `public.receipts` where `trip_id === currentTripId`
* **Algorithm Standard:** Greedy Cash-Flow Minimization Algorithm (Graph Network Optimization)
* **Output Interface Presentation:** Specialized "Settle Up Instructions" Panel on `/trips/[id]`

## Epic Backlog Registry
* **Story 8.1:** Cross-Receipt Balance Aggregation & Ledger Compile Functions
* **Story 8.2:** Minimized Cash-Flow Debt-Graph Calculation Engine & UI Layout