### `docs/epics/epic-02-auth-whitelist/story_02_3_auth_ui.md`
```markdown
# Story 2.3: Gateway Login Screen UI & Unauthorized Rejection Layouts

### Status
**Ready for Development**

### Story
**As a** user,
**I want** a polished, mobile-optimized entry screen and an unmistakable error landing view,
**so that** I can authenticate seamlessly or understand why my access was denied if I'm not on the whitelist.

### Acceptance Criteria
1. Accessing the root route `/` loads a responsive UI login form panel presenting email, password inputs, and clean toggle selectors to hop between Login and Register behaviors.
2. Clicking submit triggers a visual loading state modifier (e.g. disabled button properties or loading spinners) to avoid dual form posting errors.
3. If an unrecognized user attempt gets trapped by our gatekeeper system context, the app shifts the browser location immediately to `/unauthorized`.
4. The page layout at `/unauthorized` shows an explanatory message (e.g., `"Access Restricted: Your email is not registered on the platform whitelist. Please contact the administrator."`) with a clear link to return home.

### Tasks / Subtasks
- [ ] Create the default application landing index router file at `app/page.tsx`.
- [ ] Build a responsive authentication interface utilizing Tailwind flexbox elements containing email input components and a high-contrast action button.
- [ ] Inject internal interactive form handler tracking states to trap inputs using basic text configurations.
- [ ] Program a dedicated route file layout workspace path segment at `app/unauthorized/page.tsx`.
- [ ] Test form interactions: verify that using a whitelisted email routes the interface to `/dashboard`, while an unlisted input redirects immediately to `/unauthorized`.

### Dev Notes
* Utilize clean color contrasts matching your UI specifications. Keep form inputs highly functional on mobile viewports by adding native properties like `autoComplete="email"` and `autoCapitalize="none"`.

### Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-26 | 1.0.0 | Drafted display presentation user interaction metrics. | John (PM) |