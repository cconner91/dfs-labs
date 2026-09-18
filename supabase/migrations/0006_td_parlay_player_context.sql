-- DFS Labs — TD Parlay players gain optional real-matchup context (from ESPN's public feeds,
-- fetched live, not stored elsewhere) so selecting a player can auto-fill team/opponent/game info.

alter table public.td_parlay_players
  add column if not exists position text check (position in ('QB', 'RB', 'WR', 'TE')),
  add column if not exists opponent text,
  add column if not exists game_time timestamptz,
  add column if not exists over_under numeric(5, 1);

-- Players added from the roster browser start with no odds entered yet (ESPN doesn't expose
-- anytime-TD-scorer odds), filled in afterward — so odds can no longer be required at insert time.
alter table public.td_parlay_players alter column american_odds drop not null;
