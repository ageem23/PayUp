# Story 22.1: Trim the login-page logo and align it to the login-card width

Status: done

## Story

As a visitor on the login page,
I want a trimmed logo that lines up with the login card beneath it,
so that the page looks intentionally composed rather than mismatched.

## Acceptance Criteria

1. The banner's surrounding whitespace is trimmed via CSS using the single existing `/banner.png` asset — no second/cropped image file is added to the repo.
2. The crop is CSS-only (`overflow-hidden` clip + a slight `scale`); the wordmark is not stretched or distorted.
3. On the login page, the trimmed logo is constrained to the login-card width (`max-w-sm`, 384px) and stays horizontally centered, so its edges align with the card below.
4. The crop treatment is extracted into a reusable `BannerLogo` component (reused by Story 22.3).
5. No change to the login card, form, or any auth behavior; renders correctly in light and dark mode.
6. `npm run lint` + `npm run build` + `npm test` clean.

## Tasks / Subtasks

- [x] Create a reusable `BannerLogo` component (AC: 1, 2, 4) that renders `/banner.png` in an `overflow-hidden` container with a `scale-[1.06]` transform so the decorative border frame is clipped; caller controls width via `className`.
- [x] Use `BannerLogo` on the login page at `max-w-sm`, centered (AC: 3), replacing the inline `next/image` (which was `max-w-xl`).
- [x] Drop the now-unused `Image` import from the login page (AC: 5, 6).
- [x] `npm run lint` + `npm run build` + `npm test` clean.

## Dev Notes

- The banner art (`public/banner.png`, 1280×698) has a flat dark-blue border frame (~2–3% per edge). Trimming via a CSS `scale` inside an `overflow-hidden` box keeps a single asset and adds no image processing. Transform doesn't alter the layout box, so the constrained width is preserved. [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-221]
- Login card is `max-w-sm` (384px) — the logo is matched to it.

### Project Structure Notes

- New: `components/ui/BannerLogo.tsx`. Modified: `app/page.tsx`.

### References

- [Source: docs/docs/prd/epic-22/epic_22_overview.md#story-221-trim-the-login-page-logo-and-align-it-to-the-login-card-width]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-implement-epic pipeline

### Completion Notes List

- Added `components/ui/BannerLogo.tsx`: `overflow-hidden rounded-lg` wrapper + `next/image` scaled `scale-[1.06]` to clip the border frame from the single `/banner.png`. Width via `className` prop; `priority` prop passthrough for the login LCP image.
- `app/page.tsx`: replaced the `max-w-xl` inline `Image` with `<BannerLogo priority className="w-full max-w-sm" />`; removed the unused `Image` import.

### File List

**Added:**
- `components/ui/BannerLogo.tsx`

**Modified:**
- `app/page.tsx`
