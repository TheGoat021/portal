do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'matches_unique_player_a_per_day'
  ) then
    alter table public.matches
      drop constraint matches_unique_player_a_per_day;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'matches_unique_player_a_per_day'
  ) then
    drop index public.matches_unique_player_a_per_day;
  end if;
exception
  when undefined_table then null;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'matches_unique_player_b_per_day'
  ) then
    alter table public.matches
      drop constraint matches_unique_player_b_per_day;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'matches_unique_player_b_per_day'
  ) then
    drop index public.matches_unique_player_b_per_day;
  end if;
exception
  when undefined_table then null;
end
$$;
