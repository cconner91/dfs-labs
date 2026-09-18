-- DFS Labs — weekly allocation rules (standing caps, distinct from aspirational goals)

create table if not exists public.allocation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('OVERALL', 'GPP', 'CASH')),
  max_pct numeric(5, 2) not null check (max_pct > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.allocation_rules enable row level security;

create policy "allocation_rules owner access" on public.allocation_rules
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
