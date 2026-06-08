create or replace function public.set_axion_league_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  photo_url text,
  card_image text,
  overall integer not null default 75 check (overall between 1 and 99),
  card_stats jsonb not null default jsonb_build_object(
    'pace', 72,
    'shooting', 70,
    'passing', 71,
    'dribbling', 69,
    'defense', 65,
    'physical', 73
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.axion_league_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round integer not null check (round > 0),
  player_a uuid not null references public.employees(id),
  player_b uuid not null references public.employees(id),
  status text not null default 'live' check (status in ('scheduled', 'live', 'closed')),
  match_date date not null,
  season_key text not null default 'default',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_players_different check (player_a <> player_b),
  constraint matches_unique_pair_per_round unique (season_key, round, player_a, player_b),
  constraint matches_unique_player_a_per_day unique (match_date, player_a),
  constraint matches_unique_player_b_per_day unique (match_date, player_b)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  match_id uuid not null references public.matches(id) on delete cascade,
  type text not null check (type in ('sale', 'recovery')),
  points integer not null check (points in (1, 2)),
  observation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_active on public.employees(active, name);
create index if not exists idx_matches_date_status on public.matches(match_date desc, status, round desc);
create index if not exists idx_goals_match_employee on public.goals(match_id, employee_id, created_at desc);
create index if not exists idx_goals_created_at on public.goals(created_at desc);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_axion_league_updated_at();

drop trigger if exists trg_axion_league_settings_updated_at on public.axion_league_settings;
create trigger trg_axion_league_settings_updated_at
before update on public.axion_league_settings
for each row execute function public.set_axion_league_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
before update on public.matches
for each row execute function public.set_axion_league_updated_at();

alter table public.employees enable row level security;
alter table public.matches enable row level security;
alter table public.goals enable row level security;
alter table public.axion_league_settings enable row level security;

drop policy if exists "Authenticated users can read employees" on public.employees;
create policy "Authenticated users can read employees"
on public.employees
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read matches" on public.matches;
create policy "Authenticated users can read matches"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read goals" on public.goals;
create policy "Authenticated users can read goals"
on public.goals
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read settings" on public.axion_league_settings;
create policy "Authenticated users can read settings"
on public.axion_league_settings
for select
to authenticated
using (true);

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
  coalesce(gta.goals, 0) as player_a_score,
  coalesce(gtb.goals, 0) as player_b_score,
  coalesce(gta.sales, 0) as player_a_sales,
  coalesce(gtb.sales, 0) as player_b_sales,
  coalesce(gta.recoveries, 0) as player_a_recoveries,
  coalesce(gtb.recoveries, 0) as player_b_recoveries
from public.matches m
join public.employees pa on pa.id = m.player_a
join public.employees pb on pb.id = m.player_b
left join goal_totals gta on gta.match_id = m.id and gta.employee_id = m.player_a
left join goal_totals gtb on gtb.match_id = m.id and gtb.employee_id = m.player_b;

create or replace view public.axion_league_event_feed as
select
  g.id,
  g.created_at,
  g.type,
  g.points,
  g.observation,
  g.employee_id,
  g.match_id,
  e.name as employee_name,
  e.photo_url,
  e.card_image,
  e.overall,
  e.card_stats,
  m.round,
  m.match_date,
  case
    when m.player_a = g.employee_id then opponent.name
    else home.name
  end as opponent_name
from public.goals g
join public.employees e on e.id = g.employee_id
join public.matches m on m.id = g.match_id
join public.employees home on home.id = m.player_a
join public.employees opponent on opponent.id = m.player_b;

create or replace view public.axion_league_table as
with closed_matches as (
  select *
  from public.axion_league_match_scoreboard
  where status = 'closed'
),
player_results as (
  select
    cm.player_a_id as employee_id,
    cm.player_a_name as employee_name,
    cm.player_a_photo_url as photo_url,
    cm.player_a_card_image as card_image,
    cm.player_a_overall as overall,
    cm.player_a_card_stats as card_stats,
    case
      when cm.player_a_score > cm.player_b_score then 3
      when cm.player_a_score = cm.player_b_score then 1
      else 0
    end as points,
    case when cm.player_a_score > cm.player_b_score then 1 else 0 end as wins,
    case when cm.player_a_score = cm.player_b_score then 1 else 0 end as draws,
    case when cm.player_a_score < cm.player_b_score then 1 else 0 end as losses,
    cm.player_a_score as goals_for,
    cm.player_a_sales as sales,
    cm.player_a_recoveries as recoveries
  from closed_matches cm

  union all

  select
    cm.player_b_id as employee_id,
    cm.player_b_name as employee_name,
    cm.player_b_photo_url as photo_url,
    cm.player_b_card_image as card_image,
    cm.player_b_overall as overall,
    cm.player_b_card_stats as card_stats,
    case
      when cm.player_b_score > cm.player_a_score then 3
      when cm.player_b_score = cm.player_a_score then 1
      else 0
    end as points,
    case when cm.player_b_score > cm.player_a_score then 1 else 0 end as wins,
    case when cm.player_b_score = cm.player_a_score then 1 else 0 end as draws,
    case when cm.player_b_score < cm.player_a_score then 1 else 0 end as losses,
    cm.player_b_score as goals_for,
    cm.player_b_sales as sales,
    cm.player_b_recoveries as recoveries
  from closed_matches cm
)
select
  pr.employee_id,
  pr.employee_name,
  pr.photo_url,
  pr.card_image,
  pr.overall,
  pr.card_stats,
  sum(pr.points)::int as points,
  sum(pr.wins)::int as wins,
  sum(pr.draws)::int as draws,
  sum(pr.losses)::int as losses,
  sum(pr.goals_for)::int as goals_for,
  sum(pr.sales)::int as sales,
  sum(pr.recoveries)::int as recoveries
from player_results pr
group by
  pr.employee_id,
  pr.employee_name,
  pr.photo_url,
  pr.card_image,
  pr.overall,
  pr.card_stats;

alter table public.employees replica identity full;
alter table public.matches replica identity full;
alter table public.goals replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.employees;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.goals;
exception
  when duplicate_object then null;
end $$;
