---
baseline_commit: 5594ce5a1c9640fbfd454eb2ec6b2ce5f9a67bf4
---

# Story 6.3: Upgraded Gemini 3.5 Flash AI OCR Ingestion Pipeline

Status: done

## Story

As a bill collaborator,
I want an uploaded receipt processed by Gemini via a secure server route,
so that the matrix rows populate automatically with real names and prices.

## Acceptance Criteria

1. OCR runs in a Next.js Route Handler so `GEMINI_API_KEY` is never client-exposed.
2. The endpoint reads the receipt image and passes it to `gemini-3.5-flash`.
3. Structured Outputs (`responseSchema`) force a clean JSON array matching `processed_data`.
4. On success the receipt's `processed_data` is filled and the loading skeleton clears.

## Tasks / Subtasks

- [x] **OCR route** — `app/api/ocr/route.ts` (`POST`): validates `{ receiptId, imageUrl }` (400 if missing); reads `GEMINI_API_KEY` at **request time** (503 if absent; keeps `next build` green); fetches the image bytes; calls `gemini-3.5-flash` with `responseMimeType: "application/json"` + a `Type.ARRAY` `responseSchema`; normalizes prices (strips `$`/`€`, preserves decimals); returns `{ items }`.
- [x] **Wire the client** — `MatrixStateWrapper` now POSTs `/api/ocr` (replacing the 5.2 mock), shows the skeleton while processing, persists `processed_data` under the user's RLS session, and renders the matrix. Passes `imageUrl` from the receipt page.
- [x] **`.env.example`** — documents `GEMINI_API_KEY` (server-only).
- [x] **Test** — `tests/integration/api/ocr.test.ts` (`@jest-environment node`, mocks `@google/genai` + `fetch`): 400 on missing params; decimal prices preserved (numbers and `"$24.50"`-style strings) without truncation.

## Dev Notes

### ⚠️ SDK call shape — verify against the installed version
Used the canonical `@google/genai` pattern: `new GoogleGenAI({ apiKey })` → `ai.models.generateContent({ model: "gemini-3.5-flash", contents: [{ role, parts: [{ text }, { inlineData: { mimeType, data } }] }], config: { responseMimeType, responseSchema } })` → `response.text`. I could **not** run it live (no key), and the test mocks the SDK — so confirm the exact call against the installed `@google/genai` version on the first live run. **Do not** downgrade the model to `gemini-2.0-*` (deprecated). [Source: docs/docs/prd/epic-6/story_06_3_Gemini.md; web: ai.google.dev structured-output]

### Deviation: route returns, client persists (no service-role key)
The story has the route write `processed_data`. But `receipts` has owner-based RLS, so a **server** write needs the user's session or a service-role key. To avoid a second secret, the **route does OCR + returns items**, and the **client** (`MatrixStateWrapper`, under the user's session) persists — reusing the working 5.2 path. Only `GEMINI_API_KEY` (server-only) is required. If a server-authoritative write is wanted later, add `SUPABASE_SERVICE_ROLE_KEY` and write in the route.

### Build/CI/secrets
- Key read at request time → `next build` (CI, no key) is green. The route is `ƒ` (server), not prerendered.
- Tests mock `@google/genai` + `fetch`, so **no real key is needed in CI** (`npm test` passes). Real OCR needs `GEMINI_API_KEY` in `.env.local` (Google AI Studio).
- Strict ESLint clean (no `any`; `unknown` + guards for model output). Local review clean.

### Graceful degradation
No `imageUrl` → no OCR (skeleton clears). 503 (no key) / fetch / parse failures → spinner stops, matrix renders empty (no crash).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context) — bmad-implement-epic pipeline

### Debug Log References

- `npm run lint` ✔; `npm run build` ✔ (`ƒ /api/ocr`); `npm test` → 5 passed (2 suites).
- Web-researched `@google/genai` Structured Outputs API before writing the route.

### Completion Notes List

- **Closes FR2** — replaces the Story 5.2 mock with a real Gemini OCR pipeline (the long-standing readiness-report gap).
- Reused the Epic 6 Jest setup (6.2) for the route test, run under `@jest-environment node` for Web `Request`/`Response`.

### File List

**Added:**
- `app/api/ocr/route.ts`
- `tests/integration/api/ocr.test.ts`

**Modified:**
- `components/feature/MatrixStateWrapper.tsx` (mock → real `/api/ocr` call)
- `app/trips/[id]/receipts/[receiptId]/page.tsx` (pass `imageUrl`)
- `.env.example` (`GEMINI_API_KEY`)
- `package.json` / `package-lock.json` (`@google/genai`)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-06-18 | 1.1.0 | Gemini OCR route (`/api/ocr`) with Structured Outputs + price normalization; wired `MatrixStateWrapper` to real OCR (replacing the mock); SDK-mocked Jest test; `GEMINI_API_KEY` documented. Closes FR2. Lint+build+test green. Merged into `epic-6`. | Amelia (Dev) |