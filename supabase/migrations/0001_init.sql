-- DFS Labs — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push` if using the CLI.

-- ============================================================================
-- Lookup tables (shared across users, not RLS-scoped to a user)
-- ============================================================================

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  sport text not null default 'NFL',
  unique (year, sport)
);

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number int not null,
  start_date date not null,
  end_date date not null,
  unique (season_id, week_number)
);

create table if not exists public.contest_subtypes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('GPP', 'CASH')),
  name text not null,
  sort_order int not null default 0,
  unique (category, name)
);

-- ============================================================================
-- User-owned tables (RLS-scoped to auth.uid())
-- ============================================================================

create table if not exists public.bankroll_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bankroll_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.bankroll_accounts(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'adjustment')),
  amount numeric(12, 2) not null,
  occurred_at timestamptz not null default now(),
  note text
);

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id),
  label text not null,
  strategy_notes text,
  stack_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id),
  lineup_id uuid references public.lineups(id) on delete set null,
  platform_id uuid not null references public.platforms(id),
  contest_subtype_id uuid not null references public.contest_subtypes(id),
  contest_name text not null,
  entry_fee numeric(10, 2) not null default 0,
  num_entries int not null default 1,
  entered_at timestamptz not null default now(),
  winnings numeric(10, 2) not null default 0,
  placement int,
  notes text
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('season', 'month', 'week')),
  period_ref text not null, -- e.g. '2026', '2026-09', or a week_id as text
  metric text not null check (metric in ('bankroll_growth', 'roi_target', 'max_allocation_pct', 'discipline_streak')),
  target_value numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id),
  filename text not null,
  imported_at timestamptz not null default now(),
  row_count int not null default 0
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_bankroll_transactions_account on public.bankroll_transactions(account_id, occurred_at);
create index if not exists idx_entries_user_week on public.entries(user_id, week_id);
create index if not exists idx_entries_subtype on public.entries(contest_subtype_id);
create index if not exists idx_lineups_user_week on public.lineups(user_id, week_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.bankroll_accounts enable row level security;
alter table public.bankroll_transactions enable row level security;
alter table public.lineups enable row level security;
alter table public.entries enable row level security;
alter table public.goals enable row level security;
alter table public.csv_imports enable row level security;

-- Lookup tables: readable by any authenticated user, not writable from the client.
alter table public.platforms enable row level security;
alter table public.seasons enable row level security;
alter table public.weeks enable row level security;
alter table public.contest_subtypes enable row level security;

create policy "platforms readable by authenticated users" on public.platforms
  for select to authenticated using (true);
create policy "seasons readable by authenticated users" on public.seasons
  for select to authenticated using (true);
create policy "weeks readable by authenticated users" on public.weeks
  for select to authenticated using (true);
create policy "contest_subtypes readable by authenticated users" on public.contest_subtypes
  for select to authenticated using (true);

-- User-owned tables: full CRUD, scoped to the owning user only.
create policy "bankroll_accounts owner access" on public.bankroll_accounts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bankroll_transactions owner access" on public.bankroll_transactions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lineups owner access" on public.lineups
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "entries owner access" on public.entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals owner access" on public.goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "csv_imports owner access" on public.csv_imports
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Seed data — platforms, contest sub-type taxonomy, and 2026 NFL weeks
-- ============================================================================

insert into public.platforms (name) values ('DraftKings')
  on conflict (name) do nothing;

insert into public.contest_subtypes (category, name, sort_order) values
  ('CASH', 'Head-to-Head', 1),
  ('CASH', '50/50', 2),
  ('CASH', 'Double-Up', 3),
  ('CASH', 'Single Entry', 4),
  ('CASH', 'Multi-Entry', 5),
  ('GPP', 'Large Field', 1),
  ('GPP', 'Small Field', 2),
  ('GPP', 'Single Entry', 3),
  ('GPP', 'Multi-Entry', 4),
  ('GPP', 'Milly Maker', 5),
  ('GPP', 'Satellite/Qualifier', 6)
on conflict (category, name) do nothing;

insert into public.seasons (year, sport) values (2026, 'NFL')
  on conflict (year, sport) do nothing;

-- 2026 NFL regular season weeks (Thu-Wed windows starting Week 1 on 2026-09-10).
-- Adjust dates once the official NFL schedule is released if these drift.
do $$
declare
  season_id uuid;
  week_start date := date '2026-09-10';
begin
  select id into season_id from public.seasons where year = 2026 and sport = 'NFL';

  for i in 1..18 loop
    insert into public.weeks (season_id, week_number, start_date, end_date)
    values (season_id, i, week_start, week_start + interval '6 days')
    on conflict (season_id, week_number) do nothing;
    week_start := week_start + interval '7 days';
  end loop;
end $$;
