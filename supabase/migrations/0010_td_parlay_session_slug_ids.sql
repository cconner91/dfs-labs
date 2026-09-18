-- Session ids become readable slugs (e.g. "week-3-td-parlays-a1b2c") instead of raw UUIDs,
-- since the session id is what shows up in the URL. Groups/players/parlays keep their own
-- UUID ids — only the session id and the two FK columns pointing at it change shape.
alter table public.td_parlay_groups drop constraint if exists td_parlay_groups_session_id_fkey;
alter table public.td_parlay_players drop constraint if exists td_parlay_players_session_id_fkey;

alter table public.td_parlay_sessions alter column id type text using id::text;
alter table public.td_parlay_sessions alter column id drop default;

alter table public.td_parlay_groups alter column session_id type text using session_id::text;
alter table public.td_parlay_players alter column session_id type text using session_id::text;

alter table public.td_parlay_groups
  add constraint td_parlay_groups_session_id_fkey
  foreign key (session_id) references public.td_parlay_sessions(id) on delete cascade;
alter table public.td_parlay_players
  add constraint td_parlay_players_session_id_fkey
  foreign key (session_id) references public.td_parlay_sessions(id) on delete cascade;
