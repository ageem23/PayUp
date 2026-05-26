# Epic 9: Profiles, Preferences & Local Workspace Customization

## Overview
The goal of Epic 9 is to implement the personalization and appearance persistence layer. Because bill splitting often occurs at night in low-light environments (e.g., dimly lit restaurants, bar lounges, or taxis), offering a high-contrast dark-mode theme toggle is a vital usability requirement. 

Additionally, this epic builds local profile customizer elements allowing users to select an accent color banner. This banner attaches a specific color signature to their checkbox clicks, making concurrent collaborative multi-user editing visually distinct and intuitive.

## Target Architecture Blueprint
* **Theme Styling Integration:** Tailwind CSS dark mode class-variants
* **State Persistence Layer:** Browser `localStorage` Primitives
* **Visual Highlights Context:** Global configuration state injected into checkboxes

## Epic Backlog Registry
* **Story 9.1:** Application Dark-Mode Visual Theme Toggle & Local Storage Synchronization
* **Story 9.2:** Local Participant Profile Color-Coded Avatar Selection UI