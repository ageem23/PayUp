# Epic 3: Trip Management & Participant Schema Seeding

## Overview
The goal of Epic 3 is to build the core trip container workspace layer. Users will be able to create new trips, attach tracking attributes, and seed a flat array list of participant name strings directly into the database. 

By leveraging the denormalized `trips.participants` JSONB column, we completely sidestep multi-table relational joins during early data collection phases. This provides a lightning-fast data loading paradigm for the main split-bill dashboard.

## Target Architecture Blueprint
* **Database Target Fields:** `public.trips.participants` (JSONB String Array Column)
* **Creation Form Route:** `/dashboard/new`
* **Workspace Panel Route:** `/trips/[id]`
* **State Scope:** Multi-User Read/Write Restricted via Trip Ownership Boundaries

## Epic Backlog Registry
* **Story 3.1:** Trip Creation Form & JSONB Participant String Array Serialization
* **Story 3.2:** Trip Management Workspace Dashboard Hub Layout