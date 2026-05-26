# Story 9.1: Application Dark-Mode Visual Theme Toggle & Local Storage Synchronization

### Status
**Ready for Development**

### Story
**As a** collaborator checking costs late at night,
**I want** a persistent dark-mode interface layout toggle control,
**so that** I can split bills comfortably in low-light settings without eye strain.

### Acceptance Criteria
1. Clicking the theme switch icon toggles the app between standard light themes and a high-contrast dark palette.
2. The visual theme switch injects or removes the explicit CSS class string value (`'dark'`) directly on the application's root document node (`<html>`).
3. The selected theme state is cached directly into the browser's `localStorage` engine.
4. When the app loads, a lightweight initialization script reads the cached theme token *before* rendering the DOM, preventing a jarring bright flash on dark theme setups.

### Tasks / Subtasks
- [ ] Create a root theme synchronization context framework at `context/ThemeContext.tsx`.
- [ ] Add the standard `dark:` class modifiers to core UI components throughout the application layout files to dictate dark-palette lookups.
- [ ] Create an interactive toggle toggle action component inside `components/ui/ThemeToggle.tsx`.
- [ ] Write an optimization injection script directly into the Next.js `app/layout.tsx` file template header to evaluate cached preferences early:
  ```typescript
  // Injected directly in the head to prevent visual flashing
  const savedTheme = localStorage.getItem('app-theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }