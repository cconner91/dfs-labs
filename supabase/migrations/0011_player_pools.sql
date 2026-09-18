create table if not exists public.player_pool_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  pool_type text not null check (pool_type in ('CASH', 'GPP')),
  dk_player_id text not null,
  name text not null,
  position text,
  team text,
  salary numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (user_id, week_id, pool_type, dk_player_id)
);

create index if not exists idx_player_pool_entries_user_week on public.player_pool_entries(user_id, week_id);

alter table public.player_pool_entries enable row level security;

create policy "player_pool_entries owner access" on public.player_pool_entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
