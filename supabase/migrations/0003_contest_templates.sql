-- DFS Labs — contest templates (fast re-usable shortcuts for logging entries)

create table if not exists public.contest_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contest_subtype_id uuid not null references public.contest_subtypes(id),
  label text not null,
  suggested_contest_name text,
  entry_fee numeric(10, 2),
  typical_num_entries int not null default 1,
  source text not null default 'manual' check (source in ('manual', 'draftkings_lobby')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contest_templates enable row level security;

create policy "contest_templates owner access" on public.contest_templates
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
