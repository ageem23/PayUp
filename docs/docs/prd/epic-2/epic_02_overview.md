# Epic 2: Whitelist Gatekeeping & Authentication Layer

## Overview
The goal of Epic 2 is to secure our application's outer boundary. We will deploy the physical schema for the `allowed_users` whitelist table and connect it to a custom Supabase Authentication workflow. 

Instead of letting anyone register an account, the application will act as an invitation-only closed system. When a user authenticates, a database-level intercept script or application gatekeeper middleware will cross-examine the inbound email. If the email doesn't exist in our explicit whitelist, the registration attempt is securely rejected.

## Target Architecture Blueprint
* **Authentication Engine:** Supabase Auth (GoTrue) + Row Level Security
* **Gatekeeping Database Matrix:** `public.allowed_users`
* **Secure Landing Route:** `/dashboard` (Authenticated Area Only)
* **Error/Rejection Route:** `/unauthorized` (Clearance alert screen)

## Epic Backlog Registry
* **Story 2.1:** Database Whitelist Schema Enlistment, Constraints & Indexing
* **Story 2.2:** Supabase Auth Integration & Whitelist Enforcement Core Hook
* **Story 2.3:** Gateway Login Screen UI & Unauthorized Rejection Layouts