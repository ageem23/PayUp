<p align="center">
  <img src="./public/banner.png" alt="PayUp — good food, good friends, no awkward math" width="680" />
</p>

<h1 align="center">PayUp</h1>

<p align="center">
  <em>Good food, good friends, no awkward math.</em>
</p>

<p align="center">
  <a href="https://pay-up-red-five.vercel.app/"><strong>▶&nbsp; Live demo</strong></a>
  &nbsp;·&nbsp;
  <a href="./HELP.md">User guide</a>
</p>

---

PayUp takes a photo of a restaurant bill and works out who owes whom. Snap the
receipt, check off who shared what, and PayUp splits it — tax and tip included —
then shows everyone the simplest way to settle up. Trips are collaborative: share
a link and everyone assigns their own items, live.

## Features

- **📸 Receipt scanning** — take a photo or upload an image and Google Gemini OCR
  extracts the line items, and (when legible) the merchant, tax, and tip.
- **🔢 Quantity auto-split** — a line like `3 × Taco $10.00` is expanded into three
  assignable items at cent-exact prices, so each unit can go to a different person.
- **✅ Assignment matrix** — a checkbox grid for marking who shared each item;
  shared items are divided, solo items stay with one person.
- **➗ Proportional tax & tip** — fees are spread across people in proportion to what
  they ordered, reconciled to the exact cent.
- **🤝 Settle up** — balances across every receipt in a trip are reduced to the
  fewest possible payments via a debt-minimization pass.
- **⚡ Real-time collaboration** — edits broadcast over Supabase Realtime so everyone
  in a trip sees changes instantly.
- **🔗 Magic-link invites** — share a trip link; friends sign in (or get a guest
  session) and join as members who can edit receipts.
- **👤 Profiles & preferences** — display name, avatar, and a theme/accent color that
  follow you across devices.
- **🧭 Trip management** — quick multi-participant entry, in-trip participant editing
  (with a guard against removing someone still referenced by a receipt), and marking
  a trip **completed** to tuck it out of the active dashboard.
- **🆓 Free tier** — open sign-up with up to **3 receipts per rolling 7 days**, plus an
  in-app request for unlimited access.

See [`HELP.md`](./HELP.md) for the full user guide.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 3 |
| Backend | [Supabase](https://supabase.com/) — Postgres, Auth, Storage, Realtime |
| OCR | [Google Gemini](https://ai.google.dev/) (`@google/genai`) via a server route |
| Auth | Supabase Auth — Google OAuth + email/password, plus anonymous guest sessions |
| Tests | Jest |
| Hosting | Vercel |

## Getting started

> Requires Node.js 20+ and a Supabase project. OCR additionally needs a Google
> Gemini API key.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in real values (see below)

# 3. Run the dev server
npm run dev                  # http://localhost:3001
```

To verify the build is healthy independent of auth, hit the unguarded health-check
route at [http://localhost:3001/canary](http://localhost:3001/canary).

### Environment variables

Copy `.env.example` to `.env.local` (gitignored) and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `GEMINI_API_KEY` | for OCR | Server-only Google Gemini key (never exposed to the client) |
| `GEMINI_OCR_MODEL` | optional | Override the OCR model (defaults to `gemini-flash-lite-latest`) |

Google OAuth is configured in the Supabase Dashboard (no extra env var) — see the
notes in `.env.example`.

### Database migrations

SQL migrations live in [`supabase/migrations/`](./supabase/migrations) and are
applied **manually** in the Supabase SQL editor (in filename order). They're
idempotent; each migration's header documents what it does.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port **3001** |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Jest unit tests |

CI runs **lint + build + test** on every push; please keep all three green before
opening a PR.

## Project structure

```text
app/                       # Next.js App Router — pages, layouts, API routes
├── api/ocr/               # Server route: Gemini receipt OCR + quantity expansion
├── canary/                # Unguarded health-check route
├── dashboard/             # Trip list + new-trip form
├── invite/[token]/        # Magic-link redemption → guest/member onboarding
├── trips/[id]/            # Trip hub, participants, settle-up
│   └── receipts/[id]/     # Receipt detail: image + assignment matrix + fees
└── unauthorized/          # Access-rejection screen
components/
├── feature/               # Stateful views (matrix, settle-up, invite manager…)
└── ui/                    # Stateless presentational building blocks
context/                   # React providers (Auth, Theme, Realtime)
supabase/migrations/       # SQL migrations (applied manually)
tests/                     # Jest unit tests
types/                     # Shared TypeScript types
utils/                     # Pure logic — OCR expansion, penny math, debt minimizer, DB helpers
docs/                      # Product/architecture docs and per-epic specs
```

## Documentation

- **User guide:** [`HELP.md`](./HELP.md)
- **Architecture:** [`docs/04_System_Architecture_Master_v3.md`](./docs/04_System_Architecture_Master_v3.md)
- **Product/epic specs:** [`docs/docs/prd/`](./docs/docs/prd)

## Questions or problems?

Open an issue on [GitHub](https://github.com/ageem23/PayUp/issues).

## License

Internal development asset — all rights reserved.
