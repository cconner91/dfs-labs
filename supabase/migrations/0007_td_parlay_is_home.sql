-- DFS Labs — track home/away for the "@ opponent" vs "vs opponent" display

alter table public.td_parlay_players add column if not exists is_home boolean;
