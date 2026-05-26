# Epic 5: Ingested Line-Item Matrix Rendering

## Overview
The goal of Epic 5 is to assemble the baseline user interface grid for itemized expense visibility. Because we are bypassing standard normalized relational rows, the interface needs to read a flat structured layout directly from a nested document model. 

The frontend will loop through itemized rows stored inside the `receipts.processed_data` column and present them inside a multi-column table where each column represents an attendee string extracted from the parent trip context (`trips.participants`).

## Target Architecture Blueprint
* **Primary View Workspace Page:** `/trips/[id]/receipts/[id]`
* **Data Sources Baseline:** `receipts.processed_data` (JSONB Structure)
* **Horizontal Grid Matrix Scale:** Controlled dynamically by `trips.participants.length`
* **Implementation Strategy:** Seed static mock extraction files to perfect rendering layouts before hooking up asynchronous automated OCR functions.

## Epic Backlog Registry
* **Story 5.1:** Mock Ingestion Data Hydration & Dual-Viewport Splitting Layout Page
* **Story 5.2:** Asynchronous Ingestion Mock Endpoint & Client State Hydration Hook