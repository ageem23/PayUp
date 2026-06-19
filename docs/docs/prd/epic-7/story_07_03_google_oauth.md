# Story 7.3: Google OAuth Single Sign-On & Whitelist Intersection Gateway

## Status
- [ ] Ready for Development

## Story
**As a** platform collaborator looking to calculate receipt splits,  
**I want** to securely authenticate using my Google Account via a single click,  
**so that** I can instantly unlock the calculation workspace without managing a separate password while remaining bound to the access whitelist.

## Acceptance Criteria
1. **OAuth Redirect Loop:** Clicking the "Continue with Google" button triggers the native Supabase OAuth handshake (`provider: 'google'`), securely routing the user to Google's authentication interface.
2. **Post-Authentication Interception:** Once Google confirms the user's identity, the application intercepts the incoming session at the server layer *before* completing the redirect to the calculation dashboard.
3. **Whitelist Guardrail Enforcement:** The authentication logic cross-references the user's verified Google email address against `public.allowed_users`. If it is absent, the session is killed immediately via `supabase.auth.signOut()`, and the user is redirected to `/unauthorized`.
4. **Workspace Unlocking:** If the Google email is found on the whitelist, the session initializes smoothly, populates our global `AuthContext` state, and securely opens access to the Epic 7 multiplier tools.

## Tasks / Subtasks
- [ ] **Configure Supabase Cloud Provider:** Enable the Google Auth Provider in the Supabase Dashboard, inputting the required `Google Client ID` and `Client Secret` obtained from the Google Cloud Developer Console.
- [ ] **Add Google Login Button to UI:** Update the root landing page (`app/page.tsx`) to add a high-contrast, brand-compliant "Continue with Google" button asset.
- [ ] **Implement OAuth Handshake Trigger:** Write the client-side invocation handler within the login panel component:
  ```typescript
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });