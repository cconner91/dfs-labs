-- DFS Labs — TD Parlay groups: nullable legs_per_parlay (null = "Multi" diversified mode),
-- tightened 2-10 range, and a per-group configurable max-exposure override.

alter table public.td_parlay_groups alter column legs_per_parlay drop not null;
alter table public.td_parlay_groups drop constraint if exists td_parlay_groups_legs_per_parlay_check;
alter table public.td_parlay_groups
  add constraint td_parlay_groups_legs_per_parlay_check
  check (legs_per_parlay is null or legs_per_parlay between 2 and 10);

alter table public.td_parlay_groups add column if not exists max_exposure_pct numeric(5, 2)
  check (max_exposure_pct is null or (max_exposure_pct > 0 and max_exposure_pct <= 100));
