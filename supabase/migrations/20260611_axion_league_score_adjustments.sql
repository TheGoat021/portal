alter table public.matches
  add column if not exists player_a_adjustment integer not null default 0,
  add column if not exists player_b_adjustment integer not null default 0;

alter table public.matches
  drop constraint if exists matches_player_a_adjustment_range,
  drop constraint if exists matches_player_b_adjustment_range;

alter table public.matches
  add constraint matches_player_a_adjustment_range check (player_a_adjustment between -99 and 99),
  add constraint matches_player_b_adjustment_range check (player_b_adjustment between -99 and 99);

create or replace view public.axion_league_match_scoreboard as
with goal_totals as (
  select
    g.match_id,
    g.employee_id,
    sum(g.points)::int as goals,
    count(*) filter (where g.type = 'sale')::int as sales,
    count(*) filter (where g.type = 'recovery')::int as recoveries
  from public.goals g
  group by g.match_id, g.employee_id
)
select
  m.id,
  m.round,
  m.match_date,
  m.status,
  m.season_key,
  m.closed_at,
  pa.id as player_a_id,
  pa.name as player_a_name,
  pa.photo_url as player_a_photo_url,
  pa.card_image as player_a_card_image,
  pa.overall as player_a_overall,
  pa.card_stats as player_a_card_stats,
  pb.id as player_b_id,
  pb.name as player_b_name,
  pb.photo_url as player_b_photo_url,
  pb.card_image as player_b_card_image,
  pb.overall as player_b_overall,
  pb.card_stats as player_b_card_stats,
  greatest(coalesce(gta.goals, 0) + coalesce(m.player_a_adjustment, 0), 0) as player_a_score,
  greatest(coalesce(gtb.goals, 0) + coalesce(m.player_b_adjustment, 0), 0) as player_b_score,
  coalesce(gta.sales, 0) as player_a_sales,
  coalesce(gtb.sales, 0) as player_b_sales,
  coalesce(gta.recoveries, 0) as player_a_recoveries,
  coalesce(gtb.recoveries, 0) as player_b_recoveries
from public.matches m
join public.employees pa on pa.id = m.player_a
join public.employees pb on pb.id = m.player_b
left join goal_totals gta on gta.match_id = m.id and gta.employee_id = m.player_a
left join goal_totals gtb on gtb.match_id = m.id and gtb.employee_id = m.player_b;
