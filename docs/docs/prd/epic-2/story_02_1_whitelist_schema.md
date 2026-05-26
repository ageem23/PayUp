# Story 2.1: Database Whitelist Schema Enlistment, Constraints & Indexing

### Status
**Ready for Development**

### Story
**As a** system administrator,
**I want** to execute and deploy the physical PostgreSQL DDL migration tracking schema for the `allowed_users` matrix,
**so that** the database layer provides a high-performance index matching approved emails.

### Acceptance Criteria
1. Execution of the `allowed_users` table DDL applies cleanly within the Supabase SQL editor without throwing operational constraint collisions.
2. The `email` field features an absolute `UNIQUE` string constraint, preventing administrative duplicate mutations.
3. An explicit high-performance `btree` index named `idx_allowed_users_email` is generated targeting the `email` column to guarantee sub-millisecond lookup speeds during authentication routines.
4. A database trigger (`trigger_allowed_users_updated_at`) automatically recalculates the `updated_at` timestamp parameter on row changes.

### Tasks / Subtasks
- [ ] Connect to the Supabase database instance dashboard and access the SQL execution terminal workspace.
- [ ] Draft and execute the baseline structural table schema creation code:
  ```sql
  create table public.allowed_users (
    id uuid not null default gen_random_uuid (),
    email text not null,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
    created_by uuid null,
    notes text null,
    constraint allowed_users_pkey primary key (id),
    constraint allowed_users_email_key unique (email),
    constraint allowed_users_created_by_fkey foreign KEY (created_by) references auth.users (id)
  );