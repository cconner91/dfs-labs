-- DFS Labs — slate type on entries, H2H as its own rule category, and count-based limits

alter table public.entries
  add column if not exists slate_type text not null default 'classic' check (slate_type in ('classic', 'showdown'));

alter table public.allocation_rules drop constraint if exists allocation_rules_category_check;
alter table public.allocation_rules
  add constraint allocation_rules_category_check check (category in ('OVERALL', 'GPP', 'CASH', 'CASH_H2H'));

create table if not exists public.weekly_contest_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('large_field_gpp_count')),
  max_count int not null check (max_count > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, metric)
);

alter table public.weekly_contest_limits enable row level security;

create policy "weekly_contest_limits owner access" on public.weekly_contest_limits
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
