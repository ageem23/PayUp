# Project Brief Addendum: Epic 11 - Magic Invite Links[cite: 1]

**Date:** September 12, 2025
**Author:** Mary (Business Analyst)

## 1. Executive Summary
This document outlines the scope for the eleventh epic, which introduces a secure, frictionless method for trip collaboration[cite: 1]. This "Magic Invite Link" feature allows trip owners to easily grant editing access to other registered users without manual invitations, replacing previous insecure or cumbersome models[cite: 1].

## 2. Problem Statement
1. A manual, email-based invitation system is cumbersome for users who want to quickly share a trip with a group[cite: 1].
2. A fully public editing link (as previously discussed) represents an unacceptable security risk[cite: 1].

## 3. Proposed Solution
We will implement a "Magic Invite Link" system, as architected by Winston[cite: 1].
1. **Link Generation:** A trip owner can generate a unique, private invite link for their trip[cite: 1].
2. **Access Workflow:** When another user clicks this link, they are prompted to log in (if they aren't already)[cite: 1]. Upon successful authentication, they are automatically added to that trip's `trip_members` list in the database[cite: 1].
3. **Permissions:** Once a member, they are granted full editing rights for that specific trip, as defined by the Row Level Security policies[cite: 1].

## 4. Scope for Epic 11
The following features are in scope for this epic[cite: 1]:
* **Feature 11.1: Generate Invite Link:** A UI control on the `TripDetailView` for the owner to generate and copy an invite link[cite: 1].
* **Feature 11.2: Handle Invite Link Redemption:** A server-side mechanism that validates an invite link and adds the authenticated user to the `trip_members` table[cite: 1].
* **Feature 11.3: Enable Member Editing:** All editing capabilities for a trip will be enabled for users who are either the owner or an approved member[cite: 1].

## 5. Next Steps
This brief should be handed to the **Product Manager (PM)** to create user stories for Epic 11, based on the updated architecture from Winston[cite: 1].