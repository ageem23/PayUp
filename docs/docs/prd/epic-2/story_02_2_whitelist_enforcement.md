### `docs/epics/epic-02-auth-whitelist/story_02_2_whitelist_enforcement.md`
```markdown
# Story 2.2: Supabase Auth Integration & Whitelist Enforcement Core Hook

### Status
**Ready for Development**

### Story
**As a** security software engineer,
**I want** to build an authentication validation gatekeeper,
**so that** inbound user sessions are automatically audited against the whitelist during account initialization.

### Acceptance Criteria
1. The application layer leverages Supabase Auth endpoints securely (`signUp`, `signInWithPassword`) without exposing raw admin connection tokens on the client client view layers.
2. The login pipeline checks whether an email exists inside `public.allowed_users`. If it is absent, the session initialization is blocked or instantly signs the user out.
3. Successful validation operations pass the user state cleanly to the React app context parameters.

### Tasks / Subtasks
- [ ] Create a central system context layer skeleton at `context/AuthContext.tsx`.
- [ ] Program the login execution wrappers inside the context utilizing standard client bindings.
- [ ] Implement a validation routine that queries `public.allowed_users` right after successful user lookup:
  ```typescript
  const { data: whitelisted, error } = await supabase
    .from('allowed_users')
    .select('email')
    .eq('email', inputEmail)
    .single();