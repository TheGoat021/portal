alter table public.meta_queue_settings
  add column if not exists response_alerts_enabled boolean not null default false,
  add column if not exists response_alert_warning_minutes integer,
  add column if not exists response_alert_danger_minutes integer;

update public.meta_queue_settings
set
  response_alert_warning_minutes = coalesce(response_alert_warning_minutes, 10),
  response_alert_danger_minutes = coalesce(response_alert_danger_minutes, 30);

alter table public.meta_queue_settings
  alter column response_alert_warning_minutes set default 10,
  alter column response_alert_danger_minutes set default 30;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_meta_queue_response_alert_warning_positive'
  ) then
    alter table public.meta_queue_settings
      add constraint chk_meta_queue_response_alert_warning_positive
      check (response_alert_warning_minutes is null or response_alert_warning_minutes >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_meta_queue_response_alert_danger_positive'
  ) then
    alter table public.meta_queue_settings
      add constraint chk_meta_queue_response_alert_danger_positive
      check (response_alert_danger_minutes is null or response_alert_danger_minutes >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_meta_queue_response_alert_order'
  ) then
    alter table public.meta_queue_settings
      add constraint chk_meta_queue_response_alert_order
      check (
        response_alert_warning_minutes is null
        or response_alert_danger_minutes is null
        or response_alert_danger_minutes > response_alert_warning_minutes
      );
  end if;
end $$;
