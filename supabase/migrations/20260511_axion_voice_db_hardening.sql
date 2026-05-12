do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_agents_user_id_fkey'
  ) then
    alter table public.voice_agents
      add constraint voice_agents_user_id_fkey
      foreign key (user_id)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_cliente_id_fkey'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_cliente_id_fkey
      foreign key (cliente_id)
      references public.clientes(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_lead_id_fkey'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_lead_id_fkey
      foreign key (lead_id)
      references public.leads(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_agents_extension_not_blank_chk'
  ) then
    alter table public.voice_agents
      add constraint voice_agents_extension_not_blank_chk
      check (char_length(btrim(extension)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_agents_name_not_blank_chk'
  ) then
    alter table public.voice_agents
      add constraint voice_agents_name_not_blank_chk
      check (char_length(btrim(name)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_queues_name_not_blank_chk'
  ) then
    alter table public.voice_queues
      add constraint voice_queues_name_not_blank_chk
      check (char_length(btrim(name)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_queues_slug_not_blank_chk'
  ) then
    alter table public.voice_queues
      add constraint voice_queues_slug_not_blank_chk
      check (char_length(btrim(slug)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_phone_not_blank_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_phone_not_blank_chk
      check (char_length(btrim(phone)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_normalized_phone_not_blank_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_normalized_phone_not_blank_chk
      check (char_length(btrim(normalized_phone)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_wait_seconds_nonnegative_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_wait_seconds_nonnegative_chk
      check (wait_seconds is null or wait_seconds >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_duration_seconds_nonnegative_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_duration_seconds_nonnegative_chk
      check (duration_seconds is null or duration_seconds >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_answered_after_started_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_answered_after_started_chk
      check (answered_at is null or answered_at >= started_at);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_calls_ended_after_started_chk'
  ) then
    alter table public.voice_calls
      add constraint voice_calls_ended_after_started_chk
      check (ended_at is null or ended_at >= started_at);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_recordings_duration_seconds_nonnegative_chk'
  ) then
    alter table public.voice_recordings
      add constraint voice_recordings_duration_seconds_nonnegative_chk
      check (duration_seconds is null or duration_seconds >= 0);
  end if;
end
$$;

create unique index if not exists idx_voice_agents_extension_unique
  on public.voice_agents (extension);

create unique index if not exists idx_voice_agents_user_id_unique
  on public.voice_agents (user_id)
  where user_id is not null;

create index if not exists idx_voice_calls_started_at
  on public.voice_calls (started_at desc);

create index if not exists idx_voice_calls_ended_at
  on public.voice_calls (ended_at desc nulls last);

create index if not exists idx_voice_calls_history_lookup
  on public.voice_calls (status, ended_at desc nulls last);

create index if not exists idx_voice_calls_active_lookup
  on public.voice_calls (queue_id, status, started_at asc)
  where status in ('ringing', 'queued', 'answered');

create index if not exists idx_voice_calls_agent_active_lookup
  on public.voice_calls (agent_id, status, started_at desc)
  where status in ('ringing', 'queued', 'answered');

create index if not exists idx_voice_call_events_type_created
  on public.voice_call_events (event_type, created_at desc);

create index if not exists idx_voice_queue_agents_queue_active
  on public.voice_queue_agents (queue_id, active, priority, created_at);

create index if not exists idx_voice_agents_status_updated
  on public.voice_agents (status, updated_at desc);

create or replace view public.voice_queue_live_view as
with live_calls as (
  select
    vc.queue_id,
    count(*) filter (where vc.status in ('ringing', 'queued')) as calls_waiting,
    count(*) filter (where vc.status = 'answered') as calls_in_service,
    coalesce(avg(vc.wait_seconds) filter (where vc.status in ('ringing', 'queued', 'answered')), 0)::integer as avg_wait_seconds,
    min(vc.started_at) filter (where vc.status in ('ringing', 'queued')) as oldest_waiting_started_at
  from public.voice_calls vc
  where vc.status in ('ringing', 'queued', 'answered')
  group by vc.queue_id
),
active_agents as (
  select
    vqa.queue_id,
    count(*) filter (where vqa.active = true and va.status <> 'offline') as active_agents,
    count(*) filter (where vqa.active = true and va.status = 'available') as available_agents,
    count(*) filter (where vqa.active = true and va.status = 'in_call') as busy_agents
  from public.voice_queue_agents vqa
  join public.voice_agents va on va.id = vqa.agent_id
  group by vqa.queue_id
)
select
  vq.id,
  vq.name,
  vq.slug,
  vq.description,
  vq.strategy,
  vq.max_wait_seconds,
  vq.active,
  coalesce(lc.calls_waiting, 0) as calls_waiting,
  coalesce(lc.calls_in_service, 0) as calls_in_service,
  coalesce(lc.avg_wait_seconds, 0) as avg_wait_seconds,
  lc.oldest_waiting_started_at,
  coalesce(aa.active_agents, 0) as active_agents,
  coalesce(aa.available_agents, 0) as available_agents,
  coalesce(aa.busy_agents, 0) as busy_agents,
  case
    when vq.active = false then 'inactive'
    when coalesce(lc.calls_waiting, 0) > 0 and coalesce(aa.available_agents, 0) = 0 then 'attention'
    else 'running'
  end as operational_status
from public.voice_queues vq
left join live_calls lc on lc.queue_id = vq.id
left join active_agents aa on aa.queue_id = vq.id;

create or replace view public.voice_agent_live_view as
select
  va.id,
  va.user_id,
  va.name,
  va.extension,
  va.status,
  va.current_call_id,
  va.created_at,
  va.updated_at,
  vc.phone as current_call_phone,
  vc.queue_id as current_call_queue_id,
  vc.started_at as current_call_started_at,
  vc.answered_at as current_call_answered_at
from public.voice_agents va
left join public.voice_calls vc on vc.id = va.current_call_id;

create or replace view public.voice_call_history_view as
select
  vc.id,
  vc.external_call_id,
  vc.unique_id,
  vc.linked_id,
  vc.direction,
  vc.phone,
  vc.normalized_phone,
  vc.status,
  vc.queue_id,
  vq.name as queue_name,
  vc.agent_id,
  va.name as agent_name,
  vc.cliente_id,
  c.nome as cliente_nome,
  vc.lead_id,
  vc.started_at,
  vc.answered_at,
  vc.ended_at,
  vc.wait_seconds,
  vc.duration_seconds,
  vc.recording_url,
  vc.transcription,
  vc.summary,
  vc.created_at,
  vc.updated_at
from public.voice_calls vc
left join public.voice_queues vq on vq.id = vc.queue_id
left join public.voice_agents va on va.id = vc.agent_id
left join public.clientes c on c.id = vc.cliente_id;

insert into public.voice_queues (
  name,
  slug,
  description,
  strategy,
  max_wait_seconds,
  active
)
select
  'Fila Comercial',
  'comercial',
  'Fila padrão do comercial no Axion Voice',
  'ringall',
  300,
  true
where not exists (
  select 1
  from public.voice_queues
  where slug = 'comercial'
);
