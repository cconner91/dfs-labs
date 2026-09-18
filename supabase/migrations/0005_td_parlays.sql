-- DFS Labs — TD Parlay Optimizer (standalone, not linked to DFS bankroll/entries)

create table if not exists public.td_parlay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  total_bankroll numeric(10, 2), -- optional, informational rollup only
  created_at timestamptz not null default now()
);

create table if not exists public.td_parlay_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.td_parlay_sessions(id) on delete cascade,
  name text not null,
  team text,
  american_odds int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.td_parlay_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.td_parlay_sessions(id) on delete cascade,
  label text not null,
  bankroll numeric(10, 2) not null,
  num_parlays int not null check (num_parlays > 0),
  legs_per_parlay int not null check (legs_per_parlay >= 2),
  risk_level text not null check (risk_level in ('conservative', 'balanced', 'aggressive')),
  created_at timestamptz not null default now()
);

-- Empty for a group = "use the full session pool". Non-empty = restrict to this subset.
create table if not exists public.td_parlay_group_players (
  group_id uuid not null references public.td_parlay_groups(id) on delete cascade,
  player_id uuid not null references public.td_parlay_players(id) on delete cascade,
  primary key (group_id, player_id)
);

-- Only written when the user explicitly saves a generated set (generation itself is client-side/ephemeral).
create table if not exists public.td_parlays (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.td_parlay_groups(id) on delete cascade,
  legs jsonb not null, -- [{ player_id, name, team, american_odds, implied_probability }]
  combined_probability numeric(6, 5) not null,
  payout_multiplier numeric(10, 4) not null,
  stake numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

alter table public.td_parlay_sessions enable row level security;
alter table public.td_parlay_players enable row level security;
alter table public.td_parlay_groups enable row level security;
alter table public.td_parlay_group_players enable row level security;
alter table public.td_parlays enable row level security;

create policy "td_parlay_sessions owner access" on public.td_parlay_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "td_parlay_players owner access" on public.td_parlay_players
  for all to authenticated using (
    exists (select 1 from public.td_parlay_sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.td_parlay_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "td_parlay_groups owner access" on public.td_parlay_groups
  for all to authenticated using (
    exists (select 1 from public.td_parlay_sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.td_parlay_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "td_parlay_group_players owner access" on public.td_parlay_group_players
  for all to authenticated using (
    exists (
      select 1 from public.td_parlay_groups g
      join public.td_parlay_sessions s on s.id = g.session_id
      where g.id = group_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.td_parlay_groups g
      join public.td_parlay_sessions s on s.id = g.session_id
      where g.id = group_id and s.user_id = auth.uid()
    )
  );

create policy "td_parlays owner access" on public.td_parlays
  for all to authenticated using (
    exists (
      select 1 from public.td_parlay_groups g
      join public.td_parlay_sessions s on s.id = g.session_id
      where g.id = group_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.td_parlay_groups g
      join public.td_parlay_sessions s on s.id = g.session_id
      where g.id = group_id and s.user_id = auth.uid()
    )
  );
