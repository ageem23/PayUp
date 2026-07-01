// Global footer (Epic 20, Story 20.1). Rendered once in the root layout so the
// copyright + links appear on every page. Presentational only (no hooks), so it
// can live in the server-rendered layout.
export function Footer() {
  return (
    <footer className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      <p>© 2026 PayUp</p>
      <p className="mt-1">
        <a
          href="https://github.com/ageem23/PayUp"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          GitHub
        </a>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <a
          href="https://github.com/ageem23/PayUp/blob/main/HELP.md"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Getting Started
        </a>
      </p>
    </footer>
  );
}
