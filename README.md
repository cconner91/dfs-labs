# DFS Labs

A weekly DFS lineup strategy, bankroll discipline, and ROI tracker — built to replace an
easy-to-fall-off spreadsheet. Football/DraftKings only for now; see `Phase 3/4` below for what's
intentionally not built yet.

## Stack

Next.js (App Router, TypeScript) + Tailwind + shadcn/ui, Supabase (Postgres + Auth + Row Level
Security), Recharts. Installable as a PWA (works offline-ish, add-to-home-screen). No native
mobile app yet.

## What's here (Phase 0 + 1 — MVP)

- **Auth** — email/password via Supabase, single-user for now but RLS-scoped so it's ready for more.
- **Bankroll** (`/bankroll`) — deposit/withdrawal/adjustment ledger, running balance chart.
- **Entries** (`/entries`) — log each contest entry (GPP/Cash sub-type, entry fee, # of entries,
  winnings), with ROI, profit, and live "% of bankroll at risk" shown per entry — computed against
  your actual bankroll balance *at the time of that entry*, not today's balance.
- **Strategy** (`/strategy`) — write the weekly game plan/thesis before you play.
- **Dashboard** (`/dashboard`) — bankroll snapshot, this week at a glance, trailing 4-week ROI.
- **Analysis / Trends / Goals** — stubbed nav pages, real implementations are Phase 2.

## Setup

1. **Node 22+ recommended.** Supabase's JS client is dropping support for Node 20 in an upcoming
   release; things work today on 20.18 with a deprecation warning, but don't fight this later —
   upgrade when convenient (`nvm install 22`).
2. **Create a free Supabase project** at [supabase.com](https://supabase.com).
3. Copy `.env.example` to `.env.local` and fill in your project's URL + anon key
   (Project Settings → API).
4. Run the schema: open the Supabase SQL editor and paste in
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) (or use the Supabase
   CLI: `supabase db push` once you've linked the project). This creates every table, Row Level
   Security policy, and seeds the DraftKings platform row, the GPP/Cash contest-type taxonomy, and
   the 2026 NFL week calendar.
5. In Supabase Auth settings, you may want to **turn off "Confirm email"** for faster local
   iteration as a single user (Authentication → Providers → Email).
6. `npm install && npm run dev`, then sign up at `/signup`.

## Data model

See the **Data Model** section of the build plan for the full breakdown. Short version: `entries`
is the core spreadsheet-line equivalent (one row per contest you entered); `bankroll_transactions`
is a running ledger a balance is derived from; `lineups` holds the weekly strategy write-up,
optionally linkable to entries later; `contest_subtypes` is the seeded GPP/Cash taxonomy
(Head-to-Head, 50/50, Large Field, Milly Maker, etc.). Nothing is hardcoded as football/DraftKings
-only at the schema level — `platforms` and `seasons.sport` are just data — but the UI only
surfaces DraftKings/NFL right now.

## Known limitations / what's next

- **No DraftKings auto-import.** DK has no public API. Everything is manual entry today. A CSV
  importer against DK's contest-history export is the next planned step (Phase 2) — needs one real
  export file to map columns against. True Pikkit-style auto-sync (email parsing or
  credential/session-based scraping) is a separate, deliberately-deferred decision — it carries
  real ToS and credential-security tradeoffs that need explicit sign-off before building.
- **Analysis, Trends, and Goals pages are stubs.** They need a season of real entries to be worth
  building against — Phase 2.
- **Single bankroll account per user**, auto-created on first use. Multi-account (e.g. separate DK
  vs. FanDuel bankrolls) isn't built — add an account picker when that's actually needed.
- **Hand-written Supabase types** (`src/lib/types.ts`) rather than CLI-generated ones — regenerate
  with `supabase gen types typescript` once the schema stabilizes.
- **PWA icons are a placeholder monogram** (generated at `/icon-192`, `/icon-512` via
  `next/og`'s `ImageResponse` — see `src/lib/pwa-icon.tsx`) — swap for real brand art whenever you
  have it; no rebuild-the-pipeline needed, just replace that one function.

## Verifying it works

```bash
npm run build   # type-checks + lints + builds
npm run dev     # http://localhost:3000
```

Smoke test: sign up → add a bankroll deposit → add a contest entry → confirm it shows up in the
ledger balance and the Entries table with correct ROI/profit/allocation %.
