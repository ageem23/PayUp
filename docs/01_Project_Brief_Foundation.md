# Project Brief: Receipt Splitting Application (Foundation)

## 1. Executive Summary
The Receipt Splitting Application is an intuitive mobile-responsive web platform designed to eliminate the social friction and mental overhead of group expense sharing. By utilizing AI-powered OCR technology, users can instantly upload images of receipts, dynamically allocate itemized costs to specific participants, calculate precision tax/tip multipliers, and view structured settle-up ledgers.

## 2. Problem Statement
Dividing a shared bill manually is tedious and error-prone. Traditional solutions require manually typing in every line item, price, and participant allocation, leading to user fatigue and calculation mistakes regarding localized tax rates and tip distribution.

## 3. Proposed Solution
An automated, vertical-slice bill-splitting engine:
1. **AI Processing**: Users upload a receipt photo; the engine parses line items via OCR.
2. **Interactive Assignment**: A mobile-optimized user interface enables real-time checkbox selection to match participants to their specific itemized consumption.
3. **Proportional Multipliers**: Taxes and tips are calculated dynamically based on proportional individual consumption rather than arbitrary divisions.

## 4. MVP Scope Boundary
* **In Scope**: Anonymous/Authenticated trip-based sessions, receipt upload pipeline, interactive item matrix grid, local algorithmic calculation ledger, manual settle-up state marking.
* **Out of Scope for MVP**: Built-in Stripe or Venmo payment gateways, automatic currency conversions, historical trend dashboards.